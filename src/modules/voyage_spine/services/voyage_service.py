import uuid
from datetime import date, datetime, timezone
from typing import Any, List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Cross-module imports (Tach-bounded)
from src.modules.master_data import (
    VesselService,
    VesselStatus,
    PortService,
    PortStatus,
    CounterpartyService,
    CounterpartyStatus,
    VesselNotFoundError,
    PortNotFoundError,
    CounterpartyNotFoundError,
)

from src.modules.voyage_spine.exceptions import (
    VoyageNotFoundError,
    ItineraryLineNotFoundError,
    DuplicateVoyageNumberError,
    IllegalVoyageStatusTransitionError,
    InvalidPortFunctionError,
    InvalidCpTypeError,
    ItineraryLineCapExceededError,
    MissingMasterDataReferenceError,
    VoyageSpineError,
)
from src.modules.voyage_spine.models.voyage import Voyage, VoyageStatus, CpType
from src.modules.voyage_spine.models.itinerary_line import ItineraryLine, PortFunction
from src.modules.voyage_spine.repositories.voyage_repository import VoyageRepository
from src.modules.voyage_spine.repositories.itinerary_line_repository import (
    ItineraryLineRepository,
)


class VoyageTermsData(TypedDict, total=False):
    charterer_name: Optional[str]
    cp_type: Optional[str]
    cp_date: Optional[date]
    cp_document_ref: Optional[str]


class VoyageCreateData(TypedDict, total=False):
    voyage_no: str
    vessel_ref: uuid.UUID
    commencing_datetime: datetime
    charterer_ref: Optional[uuid.UUID]
    previous_voyage_ref: Optional[uuid.UUID]
    voyage_instructions: Optional[str]
    ops_notes: Optional[str]
    terms: Optional[VoyageTermsData]


class VoyageUpdateData(TypedDict, total=False):
    voyage_no: Optional[str]
    vessel_ref: Optional[uuid.UUID]
    commencing_datetime: Optional[datetime]
    charterer_ref: Optional[uuid.UUID]
    previous_voyage_ref: Optional[uuid.UUID]
    voyage_instructions: Optional[str]
    ops_notes: Optional[str]
    expected_completing_manual_override: Optional[bool]
    expected_completing_datetime: Optional[datetime]
    terms: Optional[VoyageTermsData]


class ItineraryLineCreateData(TypedDict, total=False):
    port_ref: uuid.UUID
    port_function: str
    planned_eta: datetime
    planned_etd: datetime
    sequence_no: Optional[int]


class ItineraryLineUpdateData(TypedDict, total=False):
    port_ref: Optional[uuid.UUID]
    port_function: Optional[str]
    planned_eta: Optional[datetime]
    planned_etd: Optional[datetime]
    sequence_no: Optional[int]


class VoyageService:
    def __init__(self, session: AsyncSession):
        self.repository = VoyageRepository(session=session)
        self.itinerary_repository = ItineraryLineRepository(session=session)
        self.session = session

        # Cross-module services initialized in same session
        self.vessel_service = VesselService(session=session)
        self.port_service = PortService(session=session)
        self.counterparty_service = CounterpartyService(session=session)

    async def _validate_cross_module_references(
        self,
        vessel_ref: Optional[uuid.UUID] = None,
        charterer_ref: Optional[uuid.UUID] = None,
    ) -> None:
        if vessel_ref is not None:
            try:
                vessel = await self.vessel_service.get(vessel_ref)
            except VesselNotFoundError:
                raise MissingMasterDataReferenceError(
                    "vessel_ref", str(vessel_ref), "does not exist"
                )
            if vessel.status != VesselStatus.ACTIVE:
                raise MissingMasterDataReferenceError(
                    "vessel_ref", str(vessel_ref), "is Inactive"
                )

        if charterer_ref is not None:
            try:
                counterparty = await self.counterparty_service.get(charterer_ref)
            except CounterpartyNotFoundError:
                raise MissingMasterDataReferenceError(
                    "charterer_ref", str(charterer_ref), "does not exist"
                )
            if counterparty.status != CounterpartyStatus.ACTIVE:
                raise MissingMasterDataReferenceError(
                    "charterer_ref", str(charterer_ref), "is Inactive"
                )

            # Check for Charterer role
            roles = [r.role for r in counterparty.roles]
            if "Charterer" not in roles:
                raise MissingMasterDataReferenceError(
                    "charterer_ref",
                    str(charterer_ref),
                    "does not have the Charterer role",
                )

    async def _flush_sequence_changes(self, voyage: Voyage) -> None:
        """Temporarily shifts all sequence numbers to a collision-free range,

        then flushes them back to their correct 0-indexed positions.
        This prevents SQLite/Postgres unique constraint violations during reordering/deletes.
        """
        # 1. Shift to high temporary range
        for i, line in enumerate(voyage.itinerary_lines):
            line.sequence_no = i + 10000
        await self.session.flush()

        # 2. Reset to final 0-indexed sequence numbers
        for i, line in enumerate(voyage.itinerary_lines):
            line.sequence_no = i
        await self.session.flush()

    async def create(self, data: VoyageCreateData) -> Voyage:
        # 1. Unique voyage_no check
        voyage_no = data.get("voyage_no")
        if voyage_no:
            existing = await self.repository.get_one_or_none(voyage_no=voyage_no)
            if existing:
                raise DuplicateVoyageNumberError(voyage_no)

        # 2. Validate cross-module references
        vessel_ref = data.get("vessel_ref")
        charterer_ref = data.get("charterer_ref")
        await self._validate_cross_module_references(
            vessel_ref=vessel_ref, charterer_ref=charterer_ref
        )

        # 3. Previous voyage reference existence check
        prev_ref = data.get("previous_voyage_ref")
        if prev_ref:
            prev = await self.repository.get_one_or_none(id=prev_ref)
            if not prev:
                raise MissingMasterDataReferenceError(
                    "previous_voyage_ref", str(prev_ref), "does not exist"
                )

        # 4. Construct flat model parameters
        params: dict[str, Any] = {
            "voyage_no": voyage_no,
            "vessel_ref": vessel_ref,
            "commencing_datetime": data.get("commencing_datetime"),
            "charterer_ref": charterer_ref,
            "previous_voyage_ref": prev_ref,
            "voyage_instructions": data.get("voyage_instructions"),
            "ops_notes": data.get("ops_notes"),
            "status": VoyageStatus.SCHEDULED.value,
        }

        # Handle nested terms mapping
        terms = data.get("terms")
        if terms:
            cp_type = terms.get("cp_type")
            if cp_type and cp_type not in [e.value for e in CpType]:
                raise InvalidCpTypeError(cp_type)

            params["terms_charterer_name"] = terms.get("charterer_name")
            params["terms_cp_type"] = cp_type
            params["terms_cp_date"] = terms.get("cp_date")
            params["terms_cp_document_ref"] = terms.get("cp_document_ref")

        voyage = Voyage(**params)
        await self.repository.add(voyage)
        await self.session.commit()
        await self.session.refresh(voyage)
        return voyage

    async def get(self, voyage_id: uuid.UUID) -> Voyage:
        voyage = await self.repository.get_one_or_none(id=voyage_id)
        if not voyage:
            raise VoyageNotFoundError(str(voyage_id))
        return voyage

    async def list(
        self,
        vessel_ref: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        charterer_ref: Optional[uuid.UUID] = None,
        commencing_start: Optional[datetime] = None,
        commencing_end: Optional[datetime] = None,
    ) -> List[Voyage]:
        stmt = select(Voyage)
        if vessel_ref is not None:
            stmt = stmt.where(Voyage.vessel_ref == vessel_ref)
        if status is not None:
            stmt = stmt.where(Voyage.status == status)
        if charterer_ref is not None:
            stmt = stmt.where(Voyage.charterer_ref == charterer_ref)
        if commencing_start is not None:
            stmt = stmt.where(Voyage.commencing_datetime >= commencing_start)
        if commencing_end is not None:
            stmt = stmt.where(Voyage.commencing_datetime <= commencing_end)

        stmt = stmt.order_by(Voyage.voyage_no)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def update(self, voyage_id: uuid.UUID, data: VoyageUpdateData) -> Voyage:
        voyage = await self.get(voyage_id)

        # 1. Unique voyage_no check
        new_no = data.get("voyage_no")
        if new_no and new_no != voyage.voyage_no:
            existing = await self.repository.get_one_or_none(voyage_no=new_no)
            if existing:
                raise DuplicateVoyageNumberError(new_no)

        # 2. Validate cross-module references
        vessel_ref = data.get("vessel_ref")
        charterer_ref = data.get("charterer_ref")
        await self._validate_cross_module_references(
            vessel_ref=vessel_ref, charterer_ref=charterer_ref
        )

        # 3. Previous voyage reference check
        prev_ref = data.get("previous_voyage_ref")
        if prev_ref and prev_ref != voyage.previous_voyage_ref:
            prev = await self.repository.get_one_or_none(id=prev_ref)
            if not prev:
                raise MissingMasterDataReferenceError(
                    "previous_voyage_ref", str(prev_ref), "does not exist"
                )

        # Apply flat attributes
        for key in [
            "voyage_no",
            "vessel_ref",
            "commencing_datetime",
            "charterer_ref",
            "previous_voyage_ref",
            "voyage_instructions",
            "ops_notes",
        ]:
            if key in data and data[key] is not None:  # type: ignore
                setattr(voyage, key, data[key])  # type: ignore

        # Handle nested terms mapping
        terms = data.get("terms")
        if terms:
            cp_type = terms.get("cp_type")
            if cp_type and cp_type not in [e.value for e in CpType]:
                raise InvalidCpTypeError(cp_type)

            if "charterer_name" in terms:
                voyage.terms_charterer_name = terms["charterer_name"]
            if "cp_type" in terms:
                voyage.terms_cp_type = terms["cp_type"]
            if "cp_date" in terms:
                voyage.terms_cp_date = terms["cp_date"]
            if "cp_document_ref" in terms:
                voyage.terms_cp_document_ref = terms["cp_document_ref"]

        # Handle override fields
        if "expected_completing_manual_override" in data:
            val = data["expected_completing_manual_override"]
            if val is not None:
                voyage.expected_completing_manual_override = val

        if voyage.expected_completing_manual_override:
            if "expected_completing_datetime" in data:
                voyage.expected_completing_datetime = data[
                    "expected_completing_datetime"
                ]
        else:
            # Recompute expected completing datetime
            if voyage.itinerary_lines:
                voyage.expected_completing_datetime = max(
                    line.planned_etd for line in voyage.itinerary_lines
                )
            else:
                voyage.expected_completing_datetime = None

        await self.repository.update(voyage)
        await self.session.commit()
        await self.session.refresh(voyage)
        return voyage

    async def transition_status(self, voyage_id: uuid.UUID, to_status: str) -> Voyage:
        voyage = await self.get(voyage_id)

        # Status transition matrix (D-LOCK-4)
        allowed_transitions = {
            VoyageStatus.SCHEDULED.value: {
                VoyageStatus.COMMENCED.value,
                VoyageStatus.CANCELLED.value,
            },
            VoyageStatus.COMMENCED.value: {
                VoyageStatus.COMPLETED.value,
                VoyageStatus.CANCELLED.value,
            },
            VoyageStatus.COMPLETED.value: {VoyageStatus.CLOSED.value},
            VoyageStatus.CLOSED.value: set(),
            VoyageStatus.CANCELLED.value: set(),
        }

        current = voyage.status
        allowed = allowed_transitions.get(current, set())
        if to_status not in allowed:
            raise IllegalVoyageStatusTransitionError(current, to_status)

        voyage.status = to_status
        now = datetime.now(timezone.utc)

        if to_status == VoyageStatus.COMMENCED.value:
            voyage.commenced_at = now
        elif to_status == VoyageStatus.COMPLETED.value:
            voyage.completed_at = now
        elif to_status == VoyageStatus.CLOSED.value:
            voyage.closed_at = now
        elif to_status == VoyageStatus.CANCELLED.value:
            voyage.cancelled_at = now

        await self.repository.update(voyage)
        await self.session.commit()
        await self.session.refresh(voyage)
        return voyage

    async def insert_itinerary_line(
        self, voyage_id: uuid.UUID, data: ItineraryLineCreateData
    ) -> ItineraryLine:
        voyage = await self.get(voyage_id)

        # D-10 line cap
        if len(voyage.itinerary_lines) >= 50:
            raise ItineraryLineCapExceededError(50)

        # 1. Port reference validation
        port_ref = data.get("port_ref")
        if not port_ref:
            raise VoyageSpineError("port_ref is required", status_code=422)

        try:
            port = await self.port_service.get(port_ref)
        except PortNotFoundError:
            raise MissingMasterDataReferenceError(
                "port_ref", str(port_ref), "does not exist"
            )
        if port.status != PortStatus.ACTIVE:
            raise MissingMasterDataReferenceError(
                "port_ref", str(port_ref), "is Inactive"
            )

        # 2. Port function validation
        port_function = data.get("port_function")
        if port_function not in [e.value for e in PortFunction]:
            raise InvalidPortFunctionError(port_function or "")

        # 3. ETA/ETD validation
        planned_eta = data.get("planned_eta")
        planned_etd = data.get("planned_etd")
        if not planned_eta or not planned_etd:
            raise VoyageSpineError(
                "planned_eta and planned_etd are required", status_code=422
            )

        if planned_etd < planned_eta:
            raise VoyageSpineError(
                "Planned ETD must be greater than or equal to ETA", status_code=422
            )

        new_line = ItineraryLine(
            port_ref=port_ref,
            port_function=port_function,
            planned_eta=planned_eta,
            planned_etd=planned_etd,
        )

        sequence_no = data.get("sequence_no")
        if sequence_no is None or sequence_no >= len(voyage.itinerary_lines):
            voyage.itinerary_lines.append(new_line)
        else:
            if sequence_no < 0:
                sequence_no = 0
            voyage.itinerary_lines.insert(sequence_no, new_line)

        # Flush sequence changes to prevent DB collisions
        await self._flush_sequence_changes(voyage)

        # Auto-recompute expected completing datetime (D-LOCK-3)
        if not voyage.expected_completing_manual_override:
            voyage.expected_completing_datetime = max(
                line.planned_etd for line in voyage.itinerary_lines
            )

        await self.session.commit()
        await self.session.refresh(new_line)
        await self.session.refresh(voyage)
        return new_line

    async def update_itinerary_line(
        self, voyage_id: uuid.UUID, line_id: uuid.UUID, data: ItineraryLineUpdateData
    ) -> ItineraryLine:
        voyage = await self.get(voyage_id)

        # Find line in voyage collection to preserve ordering_list sequence
        line = next(
            (item for item in voyage.itinerary_lines if item.id == line_id), None
        )
        if not line:
            raise ItineraryLineNotFoundError(str(line_id))

        # 1. Port reference validation
        port_ref = data.get("port_ref")
        if port_ref and port_ref != line.port_ref:
            try:
                port = await self.port_service.get(port_ref)
            except PortNotFoundError:
                raise MissingMasterDataReferenceError(
                    "port_ref", str(port_ref), "does not exist"
                )
            if port.status != PortStatus.ACTIVE:
                raise MissingMasterDataReferenceError(
                    "port_ref", str(port_ref), "is Inactive"
                )
            line.port_ref = port_ref

        # 2. Port function validation
        port_function = data.get("port_function")
        if port_function:
            if port_function not in [e.value for e in PortFunction]:
                raise InvalidPortFunctionError(port_function)
            line.port_function = port_function

        # 3. ETA/ETD validation
        planned_eta = (
            data.get("planned_eta") if "planned_eta" in data else line.planned_eta
        )
        planned_etd = (
            data.get("planned_etd") if "planned_etd" in data else line.planned_etd
        )
        if planned_eta is not None:
            line.planned_eta = planned_eta
        if planned_etd is not None:
            line.planned_etd = planned_etd

        if line.planned_etd < line.planned_eta:
            raise VoyageSpineError(
                "Planned ETD must be greater than or equal to ETA", status_code=422
            )

        # 4. Reorder via sequence_no change
        sequence_no = data.get("sequence_no")
        if sequence_no is not None:
            current_index = voyage.itinerary_lines.index(line)
            voyage.itinerary_lines.pop(current_index)
            if sequence_no < 0:
                sequence_no = 0
            if sequence_no >= len(voyage.itinerary_lines):
                voyage.itinerary_lines.append(line)
            else:
                voyage.itinerary_lines.insert(sequence_no, line)

        # Flush sequence changes to prevent DB collisions
        await self._flush_sequence_changes(voyage)

        # Auto-recompute expected completing datetime
        if not voyage.expected_completing_manual_override:
            voyage.expected_completing_datetime = max(
                line.planned_etd for line in voyage.itinerary_lines
            )

        await self.session.commit()
        await self.session.refresh(line)
        await self.session.refresh(voyage)
        return line

    async def delete_itinerary_line(
        self, voyage_id: uuid.UUID, line_id: uuid.UUID
    ) -> None:
        voyage = await self.get(voyage_id)

        line = next(
            (item for item in voyage.itinerary_lines if item.id == line_id), None
        )
        if not line:
            raise ItineraryLineNotFoundError(str(line_id))

        voyage.itinerary_lines.remove(line)
        await self.session.delete(line)

        # Flush sequence changes to prevent DB collisions
        await self._flush_sequence_changes(voyage)

        # Auto-recompute expected completing datetime
        if not voyage.expected_completing_manual_override:
            if voyage.itinerary_lines:
                voyage.expected_completing_datetime = max(
                    line.planned_etd for line in voyage.itinerary_lines
                )
            else:
                voyage.expected_completing_datetime = None

        await self.session.commit()
        await self.session.refresh(voyage)

    async def list_itinerary(self, voyage_id: uuid.UUID) -> List[ItineraryLine]:
        voyage = await self.get(voyage_id)
        return list(voyage.itinerary_lines)
