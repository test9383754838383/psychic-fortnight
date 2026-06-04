"""M8 Activity Reports — TDD tests.

Covers: create/update/submit/approve, bunker line CRUD, approval write rules,
validation guards, reconciliation, unauthenticated rejection.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.bunker_rob.models.bunker_rob import FuelGrade, PortCallBunkerRob
from src.modules.bunker_rob.repositories.bunker_rob_repository import BunkerRobRepository
from src.modules.operational_reporting.models.activity_report import (
    ActivityReport,
    ActivityReportBunker,
    ReportStatus,
    ReportType,
)
from src.modules.operational_reporting.services.activity_report_service import (
    ActivityReportService,
    InvalidReportStatusTransitionError,
    ReportNotEditableError,
    ApprovalValidationError,
)
from tests.modules.port_call.conftest import PortCallFactory, PortFactory, VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


# ── helpers ──────────────────────────────────────────────────────────────────

async def _setup(session: AsyncSession):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    port_call = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(port_call)
    await session.commit()
    return voyage, port_call


async def _make_user(session: AsyncSession):
    from src.modules.auth.services.auth_service import AuthService
    return await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )


# ── constants ─────────────────────────────────────────────────────────────────

def test_report_type_constants():
    assert len(ReportType) == 5
    assert ReportType.COMMENCING.value == "COMMENCING"
    assert ReportType.NOON.value == "NOON"
    assert ReportType.ARRIVAL.value == "ARRIVAL"
    assert ReportType.DEPARTURE.value == "DEPARTURE"
    assert ReportType.TERMINATING.value == "TERMINATING"


def test_report_status_constants():
    assert ReportStatus.DRAFT.value == "DRAFT"
    assert ReportStatus.SUBMITTED.value == "SUBMITTED"
    assert ReportStatus.APPROVED.value == "APPROVED"


# ── create ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_noon_report_at_sea(session: AsyncSession):
    voyage, _ = await _setup(session)
    svc = ActivityReportService(session)
    dt = datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=dt,
        latitude=Decimal("10.500"),
        longitude=Decimal("50.250"),
        wind_force=4,
        sea_state=3,
        rpm=Decimal("82.5"),
        speed_kn=Decimal("12.5"),
        distance_nm=Decimal("300.0"),
    )

    assert report.id is not None
    assert report.voyage_id == voyage.id
    assert report.port_call_id is None
    assert report.report_type == ReportType.NOON.value
    assert report.status == ReportStatus.DRAFT.value
    assert report.latitude == Decimal("10.500")
    assert report.wind_force == 4


@pytest.mark.asyncio
async def test_create_arrival_report_with_port_call(session: AsyncSession):
    voyage, port_call = await _setup(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.ARRIVAL,
        report_datetime=datetime(2026, 8, 10, 8, 0, tzinfo=timezone.utc),
    )

    assert report.port_call_id == port_call.id
    assert report.report_type == ReportType.ARRIVAL.value


# ── bunker lines ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_add_bunker_line_to_report(session: AsyncSession):
    voyage, port_call = await _setup(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.DEPARTURE,
        report_datetime=datetime(2026, 8, 12, 8, 0, tzinfo=timezone.utc),
    )

    line = await svc.add_bunker_line(
        report_id=report.id,
        fuel_grade=FuelGrade.VLSFO.value,
        reported_rob_mt=Decimal("1650.000"),
        reported_consumption_mt=Decimal("50.000"),
        received_mt=None,
        sulphur_pct=Decimal("0.0490"),
        bdn_number=None,
    )

    assert line.id is not None
    assert line.activity_report_id == report.id
    assert line.fuel_grade == FuelGrade.VLSFO.value
    assert line.reported_rob_mt == Decimal("1650.000")
    assert line.reported_consumption_mt == Decimal("50.000")


@pytest.mark.asyncio
async def test_update_bunker_line(session: AsyncSession):
    voyage, port_call = await _setup(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.ARRIVAL,
        report_datetime=datetime(2026, 8, 10, 8, 0, tzinfo=timezone.utc),
    )
    line = await svc.add_bunker_line(report.id, FuelGrade.MGO.value, Decimal("200.000"))
    updated = await svc.update_bunker_line(line.id, reported_rob_mt=Decimal("210.000"), bdn_number="BDN-001")

    assert updated.reported_rob_mt == Decimal("210.000")
    assert updated.bdn_number == "BDN-001"


@pytest.mark.asyncio
async def test_delete_bunker_line(session: AsyncSession):
    voyage, port_call = await _setup(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.ARRIVAL,
        report_datetime=datetime(2026, 8, 10, 8, 0, tzinfo=timezone.utc),
    )
    line = await svc.add_bunker_line(report.id, FuelGrade.LSMGO.value, Decimal("50.000"))
    await svc.delete_bunker_line(line.id)

    lines = await svc.list_bunker_lines(report.id)
    assert len(lines) == 0


@pytest.mark.asyncio
async def test_bunker_line_rejected_on_approved_report(session: AsyncSession):
    voyage, port_call = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.ARRIVAL,
        report_datetime=datetime(2026, 8, 10, 8, 0, tzinfo=timezone.utc),
    )
    await svc.submit(report.id)
    await svc.approve(report.id, user)

    with pytest.raises(ReportNotEditableError):
        await svc.add_bunker_line(report.id, FuelGrade.VLSFO.value, Decimal("100.000"))


# ── submit / approve lifecycle ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submit_transitions_draft_to_submitted(session: AsyncSession):
    voyage, _ = await _setup(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc),
    )
    assert report.status == ReportStatus.DRAFT.value

    submitted = await svc.submit(report.id)
    assert submitted.status == ReportStatus.SUBMITTED.value


@pytest.mark.asyncio
async def test_approve_transitions_submitted_to_approved(session: AsyncSession):
    voyage, _ = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc),
    )
    await svc.submit(report.id)
    approved = await svc.approve(report.id, user)

    assert approved.status == ReportStatus.APPROVED.value
    assert approved.approved_by == user.id
    assert approved.approved_at is not None


@pytest.mark.asyncio
async def test_cannot_approve_draft_directly(session: AsyncSession):
    voyage, _ = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc),
    )
    with pytest.raises(InvalidReportStatusTransitionError):
        await svc.approve(report.id, user)


@pytest.mark.asyncio
async def test_cannot_edit_approved_report(session: AsyncSession):
    voyage, _ = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc),
    )
    await svc.submit(report.id)
    await svc.approve(report.id, user)

    with pytest.raises(ReportNotEditableError):
        await svc.update(report.id, speed_kn=Decimal("14.0"))


# ── approval write rules ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_departure_approval_writes_rob_departure(session: AsyncSession):
    voyage, port_call = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.DEPARTURE,
        report_datetime=datetime(2026, 8, 12, 8, 0, tzinfo=timezone.utc),
    )
    await svc.add_bunker_line(
        report.id, FuelGrade.VLSFO.value,
        reported_rob_mt=Decimal("1650.000"),
    )
    await svc.submit(report.id)
    await svc.approve(report.id, user)

    # The PortCallBunkerRob should now have rob_departure_mt set
    rob_repo = BunkerRobRepository(session=session)
    robs = await rob_repo.list_for_port_call(port_call.id)
    vlsfo_rob = next((r for r in robs if r.fuel_grade == FuelGrade.VLSFO.value), None)
    assert vlsfo_rob is not None
    assert vlsfo_rob.rob_departure_mt == Decimal("1650.000")
    assert vlsfo_rob.departure_source_report_id == report.id
    assert vlsfo_rob.status == "confirmed"


@pytest.mark.asyncio
async def test_arrival_approval_writes_rob_arrival(session: AsyncSession):
    voyage, port_call = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.ARRIVAL,
        report_datetime=datetime(2026, 8, 10, 8, 0, tzinfo=timezone.utc),
    )
    await svc.add_bunker_line(
        report.id, FuelGrade.VLSFO.value,
        reported_rob_mt=Decimal("1200.000"),
    )
    await svc.submit(report.id)
    await svc.approve(report.id, user)

    rob_repo = BunkerRobRepository(session=session)
    robs = await rob_repo.list_for_port_call(port_call.id)
    vlsfo_rob = next((r for r in robs if r.fuel_grade == FuelGrade.VLSFO.value), None)
    assert vlsfo_rob is not None
    assert vlsfo_rob.rob_arrival_mt == Decimal("1200.000")
    assert vlsfo_rob.arrival_source_report_id == report.id


@pytest.mark.asyncio
async def test_approval_skips_overridden_rob(session: AsyncSession):
    voyage, port_call = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    # Pre-create a ROB manually and mark it overridden
    rob = PortCallBunkerRob(
        port_call_id=port_call.id,
        voyage_id=voyage.id,
        fuel_grade=FuelGrade.VLSFO.value,
        rob_departure_mt=Decimal("9999.000"),
        status="overridden",
    )
    session.add(rob)
    await session.commit()

    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=port_call.id,
        report_type=ReportType.DEPARTURE,
        report_datetime=datetime(2026, 8, 12, 8, 0, tzinfo=timezone.utc),
    )
    await svc.add_bunker_line(report.id, FuelGrade.VLSFO.value, reported_rob_mt=Decimal("1650.000"))
    await svc.submit(report.id)
    await svc.approve(report.id, user)

    # ROB departure must NOT be overwritten
    await session.refresh(rob)
    assert rob.rob_departure_mt == Decimal("9999.000")


@pytest.mark.asyncio
async def test_noon_approval_does_not_touch_port_call_rob(session: AsyncSession):
    voyage, port_call = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    # Pre-create a ROB
    rob = PortCallBunkerRob(
        port_call_id=port_call.id,
        voyage_id=voyage.id,
        fuel_grade=FuelGrade.VLSFO.value,
        rob_departure_mt=Decimal("1000.000"),
        status="estimated",
    )
    session.add(rob)
    await session.commit()

    # NOON at sea (no port_call_id)
    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 8, 12, 0, tzinfo=timezone.utc),
    )
    await svc.add_bunker_line(
        report.id, FuelGrade.VLSFO.value,
        reported_rob_mt=Decimal("1300.000"),
        reported_consumption_mt=Decimal("80.000"),
    )
    await svc.submit(report.id)
    await svc.approve(report.id, user)

    # The port_call ROB must be unchanged
    await session.refresh(rob)
    assert rob.rob_departure_mt == Decimal("1000.000")
    assert rob.status == "estimated"


# ── validation ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_approval_validates_consumption_sum(session: AsyncSession):
    """Sum of per-grade consumption cannot exceed previous ROB total (sanity guard)."""
    voyage, port_call = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    # Pre-existing ROB: only 100 MT departure
    rob = PortCallBunkerRob(
        port_call_id=port_call.id,
        voyage_id=voyage.id,
        fuel_grade=FuelGrade.VLSFO.value,
        rob_departure_mt=Decimal("100.000"),
        status="estimated",
    )
    session.add(rob)
    await session.commit()

    # NOON report claiming 500 MT consumption when only 100 MT available
    report = await svc.create(
        voyage_id=voyage.id,
        port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 8, 12, 0, tzinfo=timezone.utc),
    )
    await svc.add_bunker_line(
        report.id, FuelGrade.VLSFO.value,
        reported_consumption_mt=Decimal("500.000"),  # absurd
    )
    await svc.submit(report.id)

    with pytest.raises(ApprovalValidationError):
        await svc.approve(report.id, user)


# ── list / get ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_for_voyage_filters_by_status(session: AsyncSession):
    voyage, _ = await _setup(session)
    user = await _make_user(session)
    svc = ActivityReportService(session)

    r1 = await svc.create(
        voyage_id=voyage.id, port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
    )
    r2 = await svc.create(
        voyage_id=voyage.id, port_call_id=None,
        report_type=ReportType.NOON,
        report_datetime=datetime(2026, 8, 2, 12, 0, tzinfo=timezone.utc),
    )
    await svc.submit(r2.id)
    await svc.approve(r2.id, user)

    all_reports = await svc.list_for_voyage(voyage.id)
    assert len(all_reports) == 2

    approved_only = await svc.list_for_voyage(voyage.id, status=ReportStatus.APPROVED.value)
    assert len(approved_only) == 1
    assert approved_only[0].id == r2.id

    del r1  # used only to populate data


# ── API tests ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_activity_report_api_crud(client, session: AsyncSession):
    voyage, port_call = await _setup(session)

    # Create NOON report
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/activity-reports",
        json={
            "port_call_id": None,
            "report_type": "NOON",
            "report_datetime": "2026-08-05T12:00:00Z",
            "latitude": 10.5,
            "longitude": 50.25,
            "wind_force": 4,
            "sea_state": 3,
            "speed_kn": 12.5,
            "distance_nm": 300.0,
        },
    )
    assert resp.status_code == 201
    report_id = resp.json()["id"]
    assert resp.json()["report_type"] == "NOON"
    assert resp.json()["status"] == "DRAFT"

    # Add a bunker line
    resp = await client.post(
        f"/api/v1/activity-reports/{report_id}/bunker-lines",
        json={
            "fuel_grade": "VLSFO",
            "reported_rob_mt": 1300.0,
            "reported_consumption_mt": 80.0,
        },
    )
    assert resp.status_code == 201
    line_id = resp.json()["id"]

    # List
    resp = await client.get(f"/api/v1/voyages/{voyage.id}/activity-reports")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Get
    resp = await client.get(f"/api/v1/activity-reports/{report_id}")
    assert resp.status_code == 200
    assert len(resp.json()["bunker_lines"]) == 1

    # Update (DRAFT only)
    resp = await client.patch(
        f"/api/v1/activity-reports/{report_id}",
        json={"wind_force": 5, "speed_kn": 13.0},
    )
    assert resp.status_code == 200
    assert resp.json()["wind_force"] == 5

    # Submit
    resp = await client.post(f"/api/v1/activity-reports/{report_id}/submit")
    assert resp.status_code == 200
    assert resp.json()["status"] == "SUBMITTED"

    # Cannot edit after submit
    resp = await client.patch(
        f"/api/v1/activity-reports/{report_id}", json={"wind_force": 6}
    )
    assert resp.status_code == 409

    # Approve
    resp = await client.post(f"/api/v1/activity-reports/{report_id}/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "APPROVED"
    assert resp.json()["approved_at"] is not None

    # Update bunker line (delete — PATCH not allowed after approval)
    resp = await client.delete(f"/api/v1/activity-report-bunkers/{line_id}")
    assert resp.status_code == 409

    del port_call  # used for setup


@pytest.mark.asyncio
async def test_unauthenticated_activity_reports_fail(unauthenticated_client):
    resp = await unauthenticated_client.get(
        f"/api/v1/voyages/{uuid.uuid4()}/activity-reports"
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_activity_report_approval_writes_departure_via_api(client, session: AsyncSession):
    voyage, port_call = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/activity-reports",
        json={
            "port_call_id": str(port_call.id),
            "report_type": "DEPARTURE",
            "report_datetime": "2026-08-12T08:00:00Z",
        },
    )
    assert resp.status_code == 201
    report_id = resp.json()["id"]

    await client.post(
        f"/api/v1/activity-reports/{report_id}/bunker-lines",
        json={"fuel_grade": "VLSFO", "reported_rob_mt": 1650.0},
    )
    await client.post(f"/api/v1/activity-reports/{report_id}/submit")
    resp = await client.post(f"/api/v1/activity-reports/{report_id}/approve")
    assert resp.status_code == 200

    # PortCallBunkerRob should now exist with rob_departure_mt set
    resp = await client.get(f"/api/v1/port-calls/{port_call.id}/bunker-robs")
    assert resp.status_code == 200
    robs = resp.json()
    vlsfo = next((r for r in robs if r["fuel_grade"] == "VLSFO"), None)
    assert vlsfo is not None
    assert float(vlsfo["rob_departure_mt"]) == pytest.approx(1650.0)
    assert vlsfo["status"] == "confirmed"
