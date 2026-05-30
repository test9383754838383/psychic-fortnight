import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Set, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.port_call import validate_port_call_exists
from src.modules.port_call.exceptions import PortCallNotFoundError
from src.modules.voyage_spine import validate_voyage_exists
from src.modules.voyage_spine.exceptions import VoyageNotFoundError
from src.modules.operational_reporting.exceptions import (
    AppendOnlyViolationError,
    IllegalReportTransitionError,
    InvalidReportAnchorError,
    InvalidSupersededReportError,
    MissingReferenceError,
    ReportTerminalStateError,
    ReportTypeAnchorMismatchError,
)
from src.modules.operational_reporting.models.operational_report import (
    OperationalReport,
    OperationalReportStatus,
    OperationalReportType,
)
from src.modules.operational_reporting.repositories.operational_report_repository import (
    OperationalReportRepository,
)

# D-LOCK-6: explicit-dict state machine
LEGAL_TRANSITIONS: Dict[str, Set[str]] = {
    OperationalReportStatus.PENDING.value: {
        OperationalReportStatus.QUERIED.value,
        OperationalReportStatus.ACCEPTED.value,
        OperationalReportStatus.REJECTED.value,
    },
    OperationalReportStatus.QUERIED.value: {
        OperationalReportStatus.ACCEPTED.value,
        OperationalReportStatus.REJECTED.value,
    },
    OperationalReportStatus.ACCEPTED.value: set(),
    OperationalReportStatus.REJECTED.value: set(),
}

TERMINAL_STATES = {
    OperationalReportStatus.ACCEPTED.value,
    OperationalReportStatus.REJECTED.value,
}

# Voyage-anchor report types (D-LOCK-5)
VOYAGE_ANCHOR_TYPES = {OperationalReportType.NOON.value}
# Port-call-anchor report types
PORT_CALL_ANCHOR_TYPES = {
    OperationalReportType.ARRIVAL.value,
    OperationalReportType.DEPARTURE.value,
    OperationalReportType.BUNKERING.value,
    OperationalReportType.STATEMENT_OF_FACTS.value,
}


class ReportCreateData(TypedDict, total=False):
    # Anchor — exactly one of these will be set by the service from the route
    voyage_id: Optional[uuid.UUID]
    port_call_id: Optional[uuid.UUID]
    report_type: str
    submitted_by_user_id: uuid.UUID
    submitted_at: Optional[datetime]
    received_at: Optional[datetime]
    position_lat: Optional[Decimal]
    position_lon: Optional[Decimal]
    speed_24h: Optional[Decimal]
    distance_to_go: Optional[Decimal]
    eta_next_port: Optional[datetime]
    bunker_rob_total_mt: Optional[Decimal]
    raw_content_ref: Optional[str]
    supersedes_report_id: Optional[uuid.UUID]


class ReportUpdateData(TypedDict, total=False):
    submitted_at: Optional[datetime]
    received_at: Optional[datetime]
    position_lat: Optional[Decimal]
    position_lon: Optional[Decimal]
    speed_24h: Optional[Decimal]
    distance_to_go: Optional[Decimal]
    eta_next_port: Optional[datetime]
    bunker_rob_total_mt: Optional[Decimal]
    raw_content_ref: Optional[str]


class OperationalReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = OperationalReportRepository(session)

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    async def _validate_voyage_anchor(self, voyage_id: uuid.UUID) -> None:
        try:
            await validate_voyage_exists(self.session, voyage_id)
        except VoyageNotFoundError:
            raise MissingReferenceError("Voyage", str(voyage_id))

    async def _validate_port_call_anchor(self, port_call_id: uuid.UUID) -> None:
        try:
            await validate_port_call_exists(self.session, port_call_id)
        except PortCallNotFoundError:
            raise MissingReferenceError("PortCall", str(port_call_id))

    def _validate_anchor_xor(
        self,
        voyage_id: Optional[uuid.UUID],
        port_call_id: Optional[uuid.UUID],
    ) -> None:
        both_set = voyage_id is not None and port_call_id is not None
        neither_set = voyage_id is None and port_call_id is None
        if both_set or neither_set:
            raise InvalidReportAnchorError(
                "Exactly one of voyage_id or port_call_id must be set."
            )

    def _validate_type_anchor(
        self,
        report_type: str,
        voyage_id: Optional[uuid.UUID],
        port_call_id: Optional[uuid.UUID],
    ) -> None:
        if report_type in VOYAGE_ANCHOR_TYPES and voyage_id is None:
            raise ReportTypeAnchorMismatchError(report_type, "voyage")
        if report_type in PORT_CALL_ANCHOR_TYPES and port_call_id is None:
            raise ReportTypeAnchorMismatchError(report_type, "port_call")

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    async def create(self, data: ReportCreateData) -> OperationalReport:
        voyage_id: Optional[uuid.UUID] = data.get("voyage_id")
        port_call_id: Optional[uuid.UUID] = data.get("port_call_id")
        report_type = data["report_type"]

        self._validate_anchor_xor(voyage_id, port_call_id)
        self._validate_type_anchor(report_type, voyage_id, port_call_id)

        # Validate anchors exist
        if voyage_id is not None:
            await self._validate_voyage_anchor(voyage_id)
        if port_call_id is not None:
            await self._validate_port_call_anchor(port_call_id)

        # Supersession validation (D-LOCK-7)
        supersedes_report_id: Optional[uuid.UUID] = data.get("supersedes_report_id")
        if supersedes_report_id is not None:
            superseded = await self.repo.get_one_or_none(id=supersedes_report_id)
            if not superseded:
                raise InvalidSupersededReportError(
                    f"Report '{supersedes_report_id}' not found."
                )
            if superseded.status != OperationalReportStatus.ACCEPTED.value:
                raise InvalidSupersededReportError(
                    f"Report '{supersedes_report_id}' must be Accepted to be superseded "
                    f"(current status: {superseded.status})."
                )

        now = datetime.now(timezone.utc)
        report = OperationalReport(
            id=uuid.uuid4(),
            voyage_id=voyage_id,
            port_call_id=port_call_id,
            report_type=report_type,
            status=OperationalReportStatus.PENDING.value,
            submitted_by_user_id=data["submitted_by_user_id"],
            submitted_at=data.get("submitted_at", now),
            received_at=data.get("received_at"),
            position_lat=data.get("position_lat"),
            position_lon=data.get("position_lon"),
            speed_24h=data.get("speed_24h"),
            distance_to_go=data.get("distance_to_go"),
            eta_next_port=data.get("eta_next_port"),
            bunker_rob_total_mt=data.get("bunker_rob_total_mt"),
            raw_content_ref=data.get("raw_content_ref"),
            supersedes_report_id=supersedes_report_id,
            created_at=now,
            updated_at=now,
        )

        await self.repo.add(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    async def get(self, report_id: uuid.UUID) -> OperationalReport:
        report = await self.repo.get_one_or_none(id=report_id)
        if not report:
            raise MissingReferenceError("OperationalReport", str(report_id))
        return report

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> List[OperationalReport]:
        return await self.repo.list_for_voyage(voyage_id)

    async def list_for_port_call(
        self, port_call_id: uuid.UUID
    ) -> List[OperationalReport]:
        return await self.repo.list_for_port_call(port_call_id)

    async def update(
        self, report_id: uuid.UUID, data: ReportUpdateData
    ) -> OperationalReport:
        report = await self.get(report_id)

        if report.status in TERMINAL_STATES:
            raise ReportTerminalStateError(str(report_id), report.status)
        if report.status != OperationalReportStatus.PENDING.value:
            # Queried reports are not editable — only Pending (spec §4 "Pending only")
            raise AppendOnlyViolationError("OperationalReport (not Pending)")

        updatable_fields = {
            "submitted_at",
            "received_at",
            "position_lat",
            "position_lon",
            "speed_24h",
            "distance_to_go",
            "eta_next_port",
            "bunker_rob_total_mt",
            "raw_content_ref",
        }
        for key, val in data.items():
            if key in updatable_fields:
                setattr(report, key, val)

        report.updated_at = datetime.now(timezone.utc)
        await self.repo.update(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    async def transition_status(
        self, report_id: uuid.UUID, to_status: str
    ) -> OperationalReport:
        report = await self.get(report_id)

        allowed = LEGAL_TRANSITIONS.get(report.status, set())
        if to_status not in allowed:
            if report.status in TERMINAL_STATES:
                raise ReportTerminalStateError(str(report_id), report.status)
            raise IllegalReportTransitionError(report.status, to_status)

        report.status = to_status
        report.updated_at = datetime.now(timezone.utc)
        await self.repo.update(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report
