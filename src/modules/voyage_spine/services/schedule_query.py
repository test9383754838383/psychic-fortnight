import uuid
from datetime import date, datetime, time, timezone
from typing import List, Optional, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.modules.voyage_spine.models.voyage import Voyage, VoyageStatus
from src.modules.master_data import (
    VesselService,
    PortService,
    CounterpartyService,
    VesselStatus,
)
from src.modules.voyage_spine.exceptions import ScheduleWindowTooLargeError
from src.modules.voyage_spine.schemas.schedule import (
    VesselScheduleResponse,
    VesselScheduleItemDTO,
    VoyageBarDTO,
    PortSequenceItemDTO,
)


class ScheduleQueryService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.vessel_service = VesselService(session=session)
        self.port_service = PortService(session=session)
        self.counterparty_service = CounterpartyService(session=session)

    async def get_schedule(
        self,
        date_from: date,
        date_to: date,
        vessel_ids: Optional[List[uuid.UUID]] = None,
        status: Optional[List[str]] = None,
        search: Optional[str] = None,
    ) -> VesselScheduleResponse:
        delta = date_to - date_from
        if delta.days > 365:
            raise ScheduleWindowTooLargeError(365)

        # Convert date to datetime for inclusive overlap logic
        dt_from = datetime.combine(date_from, time.min).replace(tzinfo=timezone.utc)
        dt_to = datetime.combine(date_to, time.max).replace(tzinfo=timezone.utc)

        all_active_vessels = await self.vessel_service.list(
            status=VesselStatus.ACTIVE.value
        )
        active_vessel_map = {v.id: v for v in all_active_vessels}

        valid_vessel_ids = set(active_vessel_map.keys())
        if vessel_ids:
            valid_vessel_ids = valid_vessel_ids.intersection(set(vessel_ids))

        if not valid_vessel_ids:
            return VesselScheduleResponse(vessels=[])

        stmt = select(Voyage).where(
            Voyage.commencing_datetime <= dt_to,
            Voyage.expected_completing_datetime >= dt_from,
            Voyage.vessel_ref.in_(list(valid_vessel_ids)),
        )

        if status:
            stmt = stmt.where(Voyage.status.in_(status))
        if search:
            stmt = stmt.where(Voyage.voyage_no.ilike(f"%{search}%"))

        stmt = stmt.options(selectinload(Voyage.itinerary_lines))

        result = await self.session.execute(stmt)
        voyages = result.scalars().all()

        ports = await self.port_service.list()
        port_map = {p.id: p.unlocode for p in ports}

        counterparties = await self.counterparty_service.list()
        charterer_map = {c.id: c.name for c in counterparties}

        vessel_voyages: Dict[uuid.UUID, List[VoyageBarDTO]] = {
            vid: [] for vid in valid_vessel_ids
        }

        now = datetime.now(timezone.utc)

        for voyage in voyages:
            port_sequence = []
            for line in voyage.itinerary_lines:
                port_sequence.append(
                    PortSequenceItemDTO(
                        port_code=port_map.get(line.port_ref, str(line.port_ref)),
                        planned_eta=line.planned_eta,
                        planned_etd=line.planned_etd,
                    )
                )

            current_next_port_code = None
            if voyage.itinerary_lines:
                if voyage.status == VoyageStatus.SCHEDULED:
                    current_next_port_code = port_map.get(
                        voyage.itinerary_lines[0].port_ref
                    )
                elif voyage.status == VoyageStatus.COMMENCED:
                    for line in voyage.itinerary_lines:
                        line_etd = line.planned_etd
                        if line_etd.tzinfo is None:
                            line_etd = line_etd.replace(tzinfo=timezone.utc)
                        if line_etd >= now:
                            current_next_port_code = port_map.get(line.port_ref)
                            break
                    if not current_next_port_code:
                        current_next_port_code = port_map.get(
                            voyage.itinerary_lines[0].port_ref
                        )
                else:
                    current_next_port_code = port_map.get(
                        voyage.itinerary_lines[0].port_ref
                    )

            vessel_voyages[voyage.vessel_ref].append(
                VoyageBarDTO(
                    voyage_id=voyage.id,
                    voyage_no=voyage.voyage_no,
                    status=voyage.status,
                    commencing_datetime=voyage.commencing_datetime,
                    expected_completing_datetime=voyage.expected_completing_datetime,
                    current_next_port_code=current_next_port_code,
                    charterer=charterer_map.get(voyage.charterer_ref)
                    if voyage.charterer_ref
                    else None,
                    port_sequence=port_sequence,
                )
            )

        response_vessels = []
        for vid, v_list in vessel_voyages.items():
            if v_list:
                response_vessels.append(
                    VesselScheduleItemDTO(
                        vessel_id=vid,
                        vessel_name=active_vessel_map[vid].name,
                        voyages=v_list,
                    )
                )
            else:
                response_vessels.append(
                    VesselScheduleItemDTO(
                        vessel_id=vid,
                        vessel_name=active_vessel_map[vid].name,
                        voyages=[],
                    )
                )

        # Sort vessels by name for deterministic order
        response_vessels.sort(key=lambda x: x.vessel_name)

        return VesselScheduleResponse(vessels=response_vessels)
