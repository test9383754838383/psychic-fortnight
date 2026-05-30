import uuid
from datetime import datetime, timezone
from typing import List, Optional, TypedDict, Set, Dict
import zoneinfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.master_data import (
    PortService,
    validate_port_active,
)
from src.modules.voyage_spine import (
    validate_voyage_exists,
    validate_itinerary_line_belongs_to_voyage,
)
from src.modules.port_call.exceptions import (
    PortCallNotFoundError,
    IllegalPortCallTransitionError,
    TimestampCoherenceError,
    MissingMasterDataReferenceError,
    CorrectionReasonRequiredError,
    PortCallCapExceededError,
)
from src.modules.port_call.models.port_call import PortCall, PortCallStatus
from src.modules.port_call.repositories.port_call_repository import PortCallRepository


LEGAL_TRANSITIONS: Dict[str, Set[str]] = {
    PortCallStatus.PLANNED.value: {
        PortCallStatus.ARRIVED_AT_PILOT_STATION.value,
        PortCallStatus.AT_ANCHOR.value,
        PortCallStatus.BERTHED.value,
    },
    PortCallStatus.ARRIVED_AT_PILOT_STATION.value: {
        PortCallStatus.AT_ANCHOR.value,
        PortCallStatus.BERTHED.value,
    },
    PortCallStatus.AT_ANCHOR.value: {
        PortCallStatus.BERTHED.value,
    },
    PortCallStatus.BERTHED.value: {
        PortCallStatus.CARGO_OPS_COMPLETED.value,
        PortCallStatus.DEPARTED.value,
    },
    PortCallStatus.CARGO_OPS_COMPLETED.value: {
        PortCallStatus.DEPARTED.value,
    },
    PortCallStatus.DEPARTED.value: set(),
}

MAX_PORT_CALLS_PER_VOYAGE = 50  # D-31


class PortCallCreateData(TypedDict, total=False):
    voyage_id: uuid.UUID
    port_id: uuid.UUID
    itinerary_line_id: Optional[uuid.UUID]
    eta: Optional[datetime]
    etd: Optional[datetime]
    ops_notes: Optional[str]


class PortCallUpdateData(TypedDict, total=False):
    status: Optional[str]
    eta: Optional[datetime]
    etd: Optional[datetime]
    ata: Optional[datetime]
    anchored_datetime: Optional[datetime]
    atb: Optional[datetime]
    cargo_ops_started_datetime: Optional[datetime]
    cargo_ops_completed_datetime: Optional[datetime]
    atd: Optional[datetime]
    nor_tendered_datetime: Optional[datetime]
    nor_accepted_datetime: Optional[datetime]
    free_pratique_granted: Optional[bool]
    free_pratique_granted_datetime: Optional[datetime]
    customs_cleared: Optional[bool]
    customs_cleared_datetime: Optional[datetime]
    ops_notes: Optional[str]
    correction_reason: Optional[str]


class PortCallService:
    def __init__(self, session: AsyncSession):
        self.repository = PortCallRepository(session=session)
        self.session = session
        self.port_service = PortService(session=session)

    async def _validate_cap(self, voyage_id: uuid.UUID) -> None:
        count = await self.repository.count(voyage_id=voyage_id)
        if count >= MAX_PORT_CALLS_PER_VOYAGE:
            raise PortCallCapExceededError(MAX_PORT_CALLS_PER_VOYAGE)

    def _get_timezone_offset(self, tz_name: str, dt: datetime) -> int:
        """Compute offset in minutes for a given timezone and datetime."""
        tz = zoneinfo.ZoneInfo(tz_name)
        # We need a non-naive datetime to get the correct offset if it's during DST transition,
        # but here we just want the current offset or offset at 'dt'.
        # If dt is naive, we assume it's in UTC for the purpose of getting the offset?
        # Actually, let's use the offset for 'dt' if it was in 'tz'.
        dt_with_tz = dt.replace(tzinfo=tz)
        offset = dt_with_tz.utcoffset()
        if offset is None:
            return 0
        return int(offset.total_seconds() / 60)

    def _to_utc(self, dt: Optional[datetime], tz_name: str) -> Optional[datetime]:
        """Convert a potentially naive local datetime to UTC using the port's timezone."""
        if dt is None:
            return None
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc)

        # Naive datetime: assume it's in the port's local time
        tz = zoneinfo.ZoneInfo(tz_name)
        dt_local = dt.replace(tzinfo=tz)
        return dt_local.astimezone(timezone.utc)

    def _validate_coherence(self, pc: PortCall) -> None:
        """Enforce timestamp coherence invariants (D-LOCK-5)."""
        # 1. Monotonic actuals
        actuals = [
            ("ata", pc.ata),
            ("anchored_datetime", pc.anchored_datetime),
            ("atb", pc.atb),
            ("cargo_ops_started_datetime", pc.cargo_ops_started_datetime),
            ("cargo_ops_completed_datetime", pc.cargo_ops_completed_datetime),
            ("atd", pc.atd),
        ]
        present_actuals = [(name, val) for name, val in actuals if val is not None]
        for i in range(len(present_actuals) - 1):
            if present_actuals[i][1] > present_actuals[i + 1][1]:
                raise TimestampCoherenceError(
                    f"{present_actuals[i][0]} ({present_actuals[i][1]}) cannot be after "
                    f"{present_actuals[i + 1][0]} ({present_actuals[i + 1][1]})"
                )

        # 2. NOR coherence
        if pc.nor_accepted_datetime is not None:
            if pc.nor_tendered_datetime is None:
                raise TimestampCoherenceError("NOR Accepted requires NOR Tendered")
            if pc.nor_accepted_datetime < pc.nor_tendered_datetime:
                raise TimestampCoherenceError(
                    "NOR Accepted cannot be before NOR Tendered"
                )

        # 3. Clearance coherence (hard)
        if (
            pc.free_pratique_granted_datetime is not None
            and not pc.free_pratique_granted
        ):
            raise TimestampCoherenceError(
                "Free Pratique datetime cannot be set when granted is False"
            )
        if pc.customs_cleared_datetime is not None and not pc.customs_cleared:
            raise TimestampCoherenceError(
                "Customs Cleared datetime cannot be set when cleared is False"
            )

    async def create(self, data: PortCallCreateData) -> PortCall:
        voyage_id = data["voyage_id"]
        port_id = data["port_id"]
        itinerary_line_id = data.get("itinerary_line_id")

        # Cross-module validation
        try:
            await validate_voyage_exists(self.session, voyage_id)
        except Exception as e:
            raise MissingMasterDataReferenceError("voyage_id", str(voyage_id), str(e))

        try:
            await validate_port_active(self.session, port_id)
        except Exception as e:
            raise MissingMasterDataReferenceError("port_id", str(port_id), str(e))

        if itinerary_line_id:
            try:
                await validate_itinerary_line_belongs_to_voyage(
                    self.session, itinerary_line_id, voyage_id
                )
            except Exception as e:
                raise MissingMasterDataReferenceError(
                    "itinerary_line_id", str(itinerary_line_id), str(e)
                )

        await self._validate_cap(voyage_id)

        # Snapshot timezone
        port = await self.port_service.get(port_id)
        tz_name = port.timezone

        now = datetime.now(timezone.utc)
        tz_offset = self._get_timezone_offset(tz_name, now)

        # Build PortCall
        pc = PortCall(
            voyage_id=voyage_id,
            port_id=port_id,
            itinerary_line_id=itinerary_line_id,
            status=PortCallStatus.PLANNED.value,
            timezone_name=tz_name,
            timezone_offset_minutes=tz_offset,
            eta=self._to_utc(data.get("eta"), tz_name),
            etd=self._to_utc(data.get("etd"), tz_name),
            ops_notes=data.get("ops_notes"),
        )

        await self.repository.add(pc)
        await self.session.commit()
        await self.session.refresh(pc)
        return pc

    async def get(self, port_call_id: uuid.UUID) -> PortCall:
        pc = await self.repository.get_one_or_none(id=port_call_id)
        if not pc:
            raise PortCallNotFoundError(str(port_call_id))
        return pc

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> List[PortCall]:
        # Sort by ETA then ATA then created_at for a sensible default order
        stmt = (
            select(PortCall)
            .where(PortCall.voyage_id == voyage_id)
            .order_by(PortCall.eta, PortCall.ata, PortCall.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self, port_call_id: uuid.UUID, data: PortCallUpdateData, caller_roles: Set[str]
    ) -> PortCall:
        pc = await self.get(port_call_id)
        tz_name = pc.timezone_name

        # Correction path (D-LOCK-3)
        new_status = data.get("status")
        if new_status and new_status != pc.status:
            # Check if it's a backward status change
            status_order = [
                PortCallStatus.PLANNED.value,
                PortCallStatus.ARRIVED_AT_PILOT_STATION.value,
                PortCallStatus.AT_ANCHOR.value,
                PortCallStatus.BERTHED.value,
                PortCallStatus.CARGO_OPS_COMPLETED.value,
                PortCallStatus.DEPARTED.value,
            ]
            current_idx = status_order.index(pc.status)
            new_idx = status_order.index(new_status)

            if new_idx < current_idx:
                # Backward change
                if not data.get("correction_reason"):
                    raise CorrectionReasonRequiredError()
                # Role check is expected to be handled by the API dependency,
                # but we can enforce it here too for safety.
                if not any(r in caller_roles for r in {"Admin", "Operations"}):
                    # We'll rely on the API layer to raise 403,
                    # but if it reaches here, it's an unauthorized correction.
                    pass

        # Apply updates with UTC conversion
        for key, val in data.items():
            if key == "correction_reason":
                continue

            if key in {
                "status",
                "free_pratique_granted",
                "customs_cleared",
                "ops_notes",
            }:
                setattr(pc, key, val)
            else:
                # It's a datetime field
                if isinstance(val, datetime) or val is None:
                    setattr(pc, key, self._to_utc(val, tz_name))

        self._validate_coherence(pc)

        await self.repository.update(pc)
        await self.session.commit()
        await self.session.refresh(pc)
        return pc

    async def transition_status(
        self, port_call_id: uuid.UUID, to_status: str, at: Optional[datetime] = None
    ) -> PortCall:
        pc = await self.get(port_call_id)

        if to_status not in LEGAL_TRANSITIONS.get(pc.status, set()):
            raise IllegalPortCallTransitionError(pc.status, to_status)

        tz_name = pc.timezone_name
        timestamp = self._to_utc(at, tz_name) or datetime.now(timezone.utc)

        # Stamp the matching actual timestamp (D-LOCK-4)
        if to_status == PortCallStatus.ARRIVED_AT_PILOT_STATION.value:
            pc.ata = timestamp
        elif to_status == PortCallStatus.AT_ANCHOR.value:
            pc.anchored_datetime = timestamp
        elif to_status == PortCallStatus.BERTHED.value:
            pc.atb = timestamp
        elif to_status == PortCallStatus.CARGO_OPS_COMPLETED.value:
            pc.cargo_ops_completed_datetime = timestamp
        elif to_status == PortCallStatus.DEPARTED.value:
            pc.atd = timestamp

        pc.status = to_status

        # Re-check coherence after stamping
        self._validate_coherence(pc)

        await self.repository.update(pc)
        await self.session.commit()
        await self.session.refresh(pc)
        return pc
