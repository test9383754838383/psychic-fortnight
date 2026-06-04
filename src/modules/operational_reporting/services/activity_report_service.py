"""M8 Activity Report service — create/update/submit/approve + write rules."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.exceptions import DomainError
from src.modules.bunker_rob.models.bunker_rob import FUEL_GRADES, PortCallBunkerRob
from src.modules.operational_reporting.models.activity_report import (
    ActivityReport,
    ActivityReportBunker,
    ReportStatus,
    ReportType,
)
from src.modules.operational_reporting.repositories.activity_report_repository import (
    ActivityReportBunkerRepository,
    ActivityReportRepository,
)
from src.modules.voyage_spine import validate_voyage_exists


# ── custom exceptions ─────────────────────────────────────────────────────────

class ActivityReportNotFoundError(DomainError):
    def __init__(self, report_id: str) -> None:
        super().__init__(f"Activity report {report_id} not found", code="NOT_FOUND", status_code=404)


class ActivityReportBunkerNotFoundError(DomainError):
    def __init__(self, line_id: str) -> None:
        super().__init__(f"Bunker line {line_id} not found", code="NOT_FOUND", status_code=404)


class InvalidReportStatusTransitionError(DomainError):
    def __init__(self, from_status: str, to_status: str) -> None:
        super().__init__(
            f"Cannot transition from {from_status!r} to {to_status!r}",
            code="INVALID_TRANSITION",
            status_code=http_status.HTTP_409_CONFLICT,
        )


class ReportNotEditableError(DomainError):
    def __init__(self, status: str) -> None:
        super().__init__(
            f"Report cannot be modified in status {status!r}",
            code="REPORT_NOT_EDITABLE",
            status_code=http_status.HTTP_409_CONFLICT,
        )


class ApprovalValidationError(DomainError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason, code="APPROVAL_VALIDATION_FAILED", status_code=422)


# ── service ───────────────────────────────────────────────────────────────────

_VALID_GRADES = set(FUEL_GRADES)

# Tolerance for reconciliation: 1 MT
_RECON_TOLERANCE_MT = Decimal("1.000")


class ActivityReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ActivityReportRepository(session=session)
        self.line_repo = ActivityReportBunkerRepository(session=session)

    # ── get / list ────────────────────────────────────────────────────────────

    async def get(self, report_id: uuid.UUID) -> ActivityReport:
        report = await self.repo.get_with_lines(report_id)
        if not report:
            raise ActivityReportNotFoundError(str(report_id))
        return report

    async def list_for_voyage(
        self, voyage_id: uuid.UUID, status: Optional[str] = None
    ) -> list[ActivityReport]:
        return await self.repo.list_for_voyage(voyage_id, status=status)

    async def list_bunker_lines(self, report_id: uuid.UUID) -> list[ActivityReportBunker]:
        return await self.line_repo.list_for_report(report_id)

    # ── create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        voyage_id: uuid.UUID,
        report_type: ReportType,
        report_datetime: datetime,
        port_call_id: Optional[uuid.UUID] = None,
        latitude: Optional[Decimal] = None,
        longitude: Optional[Decimal] = None,
        wind_force: Optional[int] = None,
        sea_state: Optional[int] = None,
        swell: Optional[str] = None,
        rpm: Optional[Decimal] = None,
        slip_pct: Optional[Decimal] = None,
        speed_kn: Optional[Decimal] = None,
        distance_nm: Optional[Decimal] = None,
    ) -> ActivityReport:
        await validate_voyage_exists(self.session, voyage_id)

        report = ActivityReport(
            voyage_id=voyage_id,
            port_call_id=port_call_id,
            report_type=report_type.value,
            report_datetime=report_datetime,
            status=ReportStatus.DRAFT.value,
            latitude=latitude,
            longitude=longitude,
            wind_force=wind_force,
            sea_state=sea_state,
            swell=swell,
            rpm=rpm,
            slip_pct=slip_pct,
            speed_kn=speed_kn,
            distance_nm=distance_nm,
        )
        await self.repo.add(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    # ── update ────────────────────────────────────────────────────────────────

    async def update(
        self,
        report_id: uuid.UUID,
        latitude: Optional[Decimal] = None,
        longitude: Optional[Decimal] = None,
        wind_force: Optional[int] = None,
        sea_state: Optional[int] = None,
        swell: Optional[str] = None,
        rpm: Optional[Decimal] = None,
        slip_pct: Optional[Decimal] = None,
        speed_kn: Optional[Decimal] = None,
        distance_nm: Optional[Decimal] = None,
    ) -> ActivityReport:
        report = await self.get(report_id)
        if report.status != ReportStatus.DRAFT.value:
            raise ReportNotEditableError(report.status)

        for field, val in [
            ("latitude", latitude), ("longitude", longitude),
            ("wind_force", wind_force), ("sea_state", sea_state),
            ("swell", swell), ("rpm", rpm), ("slip_pct", slip_pct),
            ("speed_kn", speed_kn), ("distance_nm", distance_nm),
        ]:
            if val is not None:
                setattr(report, field, val)

        await self.repo.update(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    # ── submit / approve ──────────────────────────────────────────────────────

    async def submit(self, report_id: uuid.UUID) -> ActivityReport:
        report = await self.get(report_id)
        if report.status != ReportStatus.DRAFT.value:
            raise InvalidReportStatusTransitionError(report.status, ReportStatus.SUBMITTED.value)
        report.status = ReportStatus.SUBMITTED.value
        await self.repo.update(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    async def approve(
        self, report_id: uuid.UUID, approver: object
    ) -> ActivityReport:
        from src.modules.auth.models.user import User
        assert isinstance(approver, User)

        report = await self.get(report_id)
        if report.status != ReportStatus.SUBMITTED.value:
            raise InvalidReportStatusTransitionError(report.status, ReportStatus.APPROVED.value)

        await self._validate_before_approval(report)
        await self._apply_approval_writes(report, approver)

        report.status = ReportStatus.APPROVED.value
        report.approved_at = datetime.now(timezone.utc)
        report.approved_by = approver.id
        await self.repo.update(report)
        await self.session.commit()
        await self.session.refresh(report)

        await self._run_reconciliation(report.voyage_id)
        return report

    # ── bunker line CRUD ──────────────────────────────────────────────────────

    async def add_bunker_line(
        self,
        report_id: uuid.UUID,
        fuel_grade: str,
        reported_rob_mt: Optional[Decimal] = None,
        reported_consumption_mt: Optional[Decimal] = None,
        received_mt: Optional[Decimal] = None,
        sulphur_pct: Optional[Decimal] = None,
        bdn_number: Optional[str] = None,
    ) -> ActivityReportBunker:
        report = await self.get(report_id)
        if report.status == ReportStatus.APPROVED.value:
            raise ReportNotEditableError(report.status)

        line = ActivityReportBunker(
            activity_report_id=report_id,
            fuel_grade=fuel_grade,
            reported_rob_mt=reported_rob_mt,
            reported_consumption_mt=reported_consumption_mt,
            received_mt=received_mt,
            sulphur_pct=sulphur_pct,
            bdn_number=bdn_number,
        )
        await self.line_repo.add(line)
        await self.session.commit()
        await self.session.refresh(line)
        return line

    async def update_bunker_line(
        self,
        line_id: uuid.UUID,
        reported_rob_mt: Optional[Decimal] = None,
        reported_consumption_mt: Optional[Decimal] = None,
        received_mt: Optional[Decimal] = None,
        sulphur_pct: Optional[Decimal] = None,
        bdn_number: Optional[str] = None,
    ) -> ActivityReportBunker:
        line = await self.line_repo.get_one_or_none(id=line_id)
        if not line:
            raise ActivityReportBunkerNotFoundError(str(line_id))
        # Check report status
        report = await self.get(line.activity_report_id)
        if report.status == ReportStatus.APPROVED.value:
            raise ReportNotEditableError(report.status)

        for field, val in [
            ("reported_rob_mt", reported_rob_mt),
            ("reported_consumption_mt", reported_consumption_mt),
            ("received_mt", received_mt),
            ("sulphur_pct", sulphur_pct),
            ("bdn_number", bdn_number),
        ]:
            if val is not None:
                setattr(line, field, val)

        await self.line_repo.update(line)
        await self.session.commit()
        await self.session.refresh(line)
        return line

    async def delete_bunker_line(self, line_id: uuid.UUID) -> None:
        line = await self.line_repo.get_one_or_none(id=line_id)
        if not line:
            raise ActivityReportBunkerNotFoundError(str(line_id))
        report = await self.get(line.activity_report_id)
        if report.status == ReportStatus.APPROVED.value:
            raise ReportNotEditableError(report.status)
        await self.line_repo.delete_by_id(line_id)
        await self.session.commit()

    # ── internal: validation ──────────────────────────────────────────────────

    async def _validate_before_approval(self, report: ActivityReport) -> None:
        """Block approval if basic sanity checks fail."""
        for line in report.bunker_lines:
            if line.reported_consumption_mt is None:
                continue
            # Consumption > 0 requires some ROB or previous context to sanity-check against.
            # Guard: if we have a reported_rob_mt on this line, consumption must be ≤ rob.
            if (
                line.reported_rob_mt is not None
                and line.reported_consumption_mt > line.reported_rob_mt
            ):
                raise ApprovalValidationError(
                    f"Grade {line.fuel_grade}: consumption {line.reported_consumption_mt} "
                    f"exceeds reported ROB {line.reported_rob_mt}."
                )

            # Additional check: if voyage has prior departure ROBs for this grade,
            # consumption must not exceed available stock.
            if report.voyage_id:
                stmt = select(PortCallBunkerRob).where(
                    PortCallBunkerRob.voyage_id == report.voyage_id,
                    PortCallBunkerRob.fuel_grade == line.fuel_grade,
                )
                result = await self.session.execute(stmt)
                prior_robs = list(result.scalars().all())
                if prior_robs:
                    max_departure = max(
                        (r.rob_departure_mt for r in prior_robs if r.rob_departure_mt),
                        default=None,
                    )
                    if max_departure and line.reported_consumption_mt > max_departure:
                        raise ApprovalValidationError(
                            f"Grade {line.fuel_grade}: consumption "
                            f"{line.reported_consumption_mt} exceeds max known departure ROB "
                            f"{max_departure}."
                        )

    # ── internal: approval write rules ────────────────────────────────────────

    async def _find_or_create_rob(
        self, port_call_id: uuid.UUID, voyage_id: uuid.UUID, fuel_grade: str
    ) -> PortCallBunkerRob:
        stmt = select(PortCallBunkerRob).where(
            PortCallBunkerRob.port_call_id == port_call_id,
            PortCallBunkerRob.fuel_grade == fuel_grade,
        )
        result = await self.session.execute(stmt)
        rob = result.scalar_one_or_none()
        if rob is None:
            rob = PortCallBunkerRob(
                port_call_id=port_call_id,
                voyage_id=voyage_id,
                fuel_grade=fuel_grade,
                status="estimated",
            )
            self.session.add(rob)
            await self.session.flush()
        return rob

    async def _apply_approval_writes(
        self, report: ActivityReport, approver: object
    ) -> None:
        from src.modules.auth.models.user import User
        assert isinstance(approver, User)

        # NOON reports do NOT touch port-call ROB rows
        if report.report_type == ReportType.NOON.value:
            return

        if report.port_call_id is None:
            return

        now = datetime.now(timezone.utc)

        for line in report.bunker_lines:
            rob = await self._find_or_create_rob(
                report.port_call_id, report.voyage_id, line.fuel_grade
            )

            if rob.status == "overridden":
                continue

            if report.report_type == ReportType.ARRIVAL.value and line.reported_rob_mt is not None:
                rob.rob_arrival_mt = line.reported_rob_mt
                rob.arrival_source_report_id = report.id
                rob.status = "confirmed"
                rob.confirmed_at = now
                rob.confirmed_by = approver.id

            elif report.report_type == ReportType.DEPARTURE.value and line.reported_rob_mt is not None:
                rob.rob_departure_mt = line.reported_rob_mt
                rob.departure_source_report_id = report.id
                rob.status = "confirmed"
                rob.confirmed_at = now
                rob.confirmed_by = approver.id

            # Received bunkers apply for COMMENCING / DEPARTURE / ARRIVAL if received_mt set
            if line.received_mt is not None:
                rob.received_mt = line.received_mt
                rob.received_source_report_id = report.id
                if line.bdn_number:
                    rob.bdn_number = line.bdn_number

        await self.session.flush()

    # ── internal: reconciliation ──────────────────────────────────────────────

    async def _run_reconciliation(self, voyage_id: uuid.UUID) -> None:
        """Compute reported_cons vs rob_delta per grade for each sea leg.

        Fix D1: NOON reports are filtered to the time window of each leg
                (prev port call departure → next port call arrival).
        Fix D2: Port calls are ordered by itinerary line sequence_no, not UUID.
        """
        from src.modules.port_call.models.port_call import PortCall
        from src.modules.voyage_spine.models.itinerary_line import ItineraryLine

        # Fetch port calls ordered by itinerary sequence_no (then eta as tiebreak).
        pc_stmt = (
            select(PortCall)
            .where(PortCall.voyage_id == voyage_id)
            .outerjoin(ItineraryLine, PortCall.itinerary_line_id == ItineraryLine.id)
            .order_by(ItineraryLine.sequence_no.nullslast(), PortCall.eta.nullslast(), PortCall.created_at)
        )
        pc_result = await self.session.execute(pc_stmt)
        sorted_pcs: list[PortCall] = list(pc_result.scalars().all())

        if len(sorted_pcs) < 2:
            return

        # Index all ROBs for the voyage by port_call_id → grade → rob
        rob_stmt = (
            select(PortCallBunkerRob)
            .where(PortCallBunkerRob.voyage_id == voyage_id)
        )
        rob_result = await self.session.execute(rob_stmt)
        rob_index: dict[uuid.UUID, dict[str, PortCallBunkerRob]] = {}
        for rob in rob_result.scalars().all():
            rob_index.setdefault(rob.port_call_id, {})[rob.fuel_grade] = rob

        # Fetch all approved NOON reports for the voyage (with bunker lines)
        noon_reports = await self.repo.list_approved_noon_for_voyage(voyage_id)

        for i in range(len(sorted_pcs) - 1):
            prev_pc = sorted_pcs[i]
            next_pc = sorted_pcs[i + 1]

            # Determine the leg's time window: prev departure → next arrival.
            # Use actual times first, fall back to planned.
            leg_start: Optional[datetime] = prev_pc.atd or prev_pc.etd
            leg_end: Optional[datetime] = next_pc.ata or next_pc.eta

            for grade in FUEL_GRADES:
                prev_rob = rob_index.get(prev_pc.id, {}).get(grade)
                next_rob = rob_index.get(next_pc.id, {}).get(grade)
                if not prev_rob or not next_rob:
                    continue
                if prev_rob.rob_departure_mt is None or next_rob.rob_arrival_mt is None:
                    continue

                # Without a leg window we cannot scope NOON consumption — flag for
                # manual review rather than summing the whole voyage (wrong data).
                if leg_start is None or leg_end is None:
                    next_rob.reconciliation_status = "insufficient data"
                    next_rob.reported_vs_delta_variance_mt = None
                    continue

                # Sum NOON consumption for this grade only within the leg window.
                reported_cons = Decimal("0")
                for r in noon_reports:
                    if not (leg_start <= r.report_datetime <= leg_end):
                        continue  # outside this leg's window — skip
                    for line in r.bunker_lines:
                        if line.fuel_grade == grade and line.reported_consumption_mt:
                            reported_cons += line.reported_consumption_mt

                rob_delta = (
                    prev_rob.rob_departure_mt
                    + (prev_rob.received_mt or Decimal("0"))
                    - next_rob.rob_arrival_mt
                )
                variance = reported_cons - rob_delta
                recon_status = (
                    "within tolerance"
                    if abs(variance) <= _RECON_TOLERANCE_MT
                    else "needs review"
                )

                next_rob.reconciliation_status = recon_status
                next_rob.reported_vs_delta_variance_mt = variance

        await self.session.flush()
