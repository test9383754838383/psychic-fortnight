import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists, union_all, literal
from sqlalchemy.orm import selectinload

from src.modules.voyage_spine.models.voyage import Voyage
from src.modules.master_data import (
    VesselService,
    PortService,
    CounterpartyService,
)
from src.modules.voyage_spine.exceptions import VoyageNotFoundError
from src.modules.voyage_spine.schemas.workspace import (
    VoyageWorkspaceResponse,
    VesselHeaderDTO,
    WorkspaceItineraryItemDTO,
)


class WorkspaceQueryService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.vessel_service = VesselService(session=session)
        self.port_service = PortService(session=session)
        self.counterparty_service = CounterpartyService(session=session)

    async def _has_exception(self, voyage_id: uuid.UUID) -> bool:
        """Execute the exception dot query per architecture §6."""
        from src.modules.alerts.models.alert import Alert
        from src.modules.tasks.models.task import Task

        now = datetime.now(timezone.utc)

        alert_q = (
            select(literal(1))
            .where(Alert.linked_entity_type == "Voyage")
            .where(Alert.linked_entity_id == voyage_id)
            .where(Alert.resolved_at.is_(None))
            .where(Alert.severity.in_(["Warning", "Critical"]))
        )
        task_q = (
            select(literal(1))
            .where(Task.linked_entity_type == "Voyage")
            .where(Task.linked_entity_id == voyage_id)
            .where(Task.status != "Done")
            .where(Task.due_datetime < now)
        )
        combined = union_all(alert_q, task_q).subquery()
        stmt = select(exists(select(literal(1)).select_from(combined)))
        result = await self.session.execute(stmt)
        return bool(result.scalar())

    async def get_workspace(self, voyage_id: uuid.UUID) -> VoyageWorkspaceResponse:
        stmt = (
            select(Voyage)
            .where(Voyage.id == voyage_id)
            .options(selectinload(Voyage.itinerary_lines))
        )
        result = await self.session.execute(stmt)
        voyage = result.scalars().one_or_none()

        if not voyage:
            raise VoyageNotFoundError(str(voyage_id))

        vessel = await self.vessel_service.get(voyage.vessel_ref)

        charterer_name = None
        if voyage.charterer_ref:
            charterer = await self.counterparty_service.get(voyage.charterer_ref)
            charterer_name = charterer.name

        ports = await self.port_service.list()
        port_map = {p.id: p.unlocode for p in ports}

        itinerary = []
        for line in voyage.itinerary_lines:
            itinerary.append(
                WorkspaceItineraryItemDTO(
                    sequence_no=line.sequence_no,
                    port_code=port_map.get(line.port_ref, str(line.port_ref)),
                    planned_eta=line.planned_eta,
                    planned_etd=line.planned_etd,
                )
            )

        has_exception = await self._has_exception(voyage_id)

        return VoyageWorkspaceResponse(
            voyage_id=voyage.id,
            voyage_no=voyage.voyage_no,
            status=voyage.status,
            vessel=VesselHeaderDTO(id=vessel.id, name=vessel.name),
            charterer=voyage.terms_charterer_name
            if voyage.terms_charterer_name
            else charterer_name,
            cp_type=voyage.terms_cp_type,
            cp_date=voyage.terms_cp_date,
            cp_document_ref=voyage.terms_cp_document_ref,
            commencing_datetime=voyage.commencing_datetime,
            expected_completing_datetime=voyage.expected_completing_datetime,
            itinerary=itinerary,
            voyage_instructions=voyage.voyage_instructions,
            ops_notes=voyage.ops_notes,
            has_exception=has_exception,
        )
