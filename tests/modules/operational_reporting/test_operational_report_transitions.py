"""test_operational_report_transitions.py — state machine tests."""

from datetime import datetime, timezone

import pytest

from src.modules.operational_reporting.exceptions import (
    IllegalReportTransitionError,
    ReportTerminalStateError,
)
from src.modules.operational_reporting.models.operational_report import (
    OperationalReportStatus,
    OperationalReportType,
)
from src.modules.operational_reporting.services.operational_report_service import (
    LEGAL_TRANSITIONS,
    OperationalReportService,
)
from tests.modules.operational_reporting.conftest import (
    PortFactory,
    VesselFactory,
    VoyageFactory,
    UserFactory,
)


async def _make_voyage_report(session, status=None):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    user = UserFactory.build()
    session.add(user)
    await session.commit()

    service = OperationalReportService(session)
    report = await service.create(
        {
            "voyage_id": voyage.id,
            "port_call_id": None,
            "report_type": OperationalReportType.NOON.value,
            "submitted_by_user_id": user.id,
            "submitted_at": datetime.now(timezone.utc),
        }
    )

    if status and status != OperationalReportStatus.PENDING.value:
        # Force status directly for test setup
        report.status = status
        await session.commit()
        await session.refresh(report)

    return report, service


# Parametrize ALL legal transitions
VALID_TRANSITIONS = [
    (OperationalReportStatus.PENDING.value, OperationalReportStatus.ACCEPTED.value),
    (OperationalReportStatus.PENDING.value, OperationalReportStatus.QUERIED.value),
    (OperationalReportStatus.PENDING.value, OperationalReportStatus.REJECTED.value),
    (OperationalReportStatus.QUERIED.value, OperationalReportStatus.ACCEPTED.value),
    (OperationalReportStatus.QUERIED.value, OperationalReportStatus.REJECTED.value),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("from_status,to_status", VALID_TRANSITIONS)
async def test_valid_transitions(session, from_status, to_status):
    report, service = await _make_voyage_report(session, status=from_status)
    updated = await service.transition_status(report.id, to_status)
    assert updated.status == to_status


# Illegal transition cases (targeted, not exhaustive)
INVALID_TRANSITIONS = [
    (OperationalReportStatus.ACCEPTED.value, OperationalReportStatus.PENDING.value),
    (OperationalReportStatus.ACCEPTED.value, OperationalReportStatus.QUERIED.value),
    (OperationalReportStatus.REJECTED.value, OperationalReportStatus.ACCEPTED.value),
    (OperationalReportStatus.REJECTED.value, OperationalReportStatus.PENDING.value),
    (OperationalReportStatus.PENDING.value, "InvalidStatus"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("from_status,to_status", INVALID_TRANSITIONS)
async def test_illegal_transitions_rejected(session, from_status, to_status):
    report, service = await _make_voyage_report(session, status=from_status)
    with pytest.raises((IllegalReportTransitionError, ReportTerminalStateError)):
        await service.transition_status(report.id, to_status)


@pytest.mark.asyncio
async def test_terminal_state_blocks_patch(session):
    """PATCH blocked after Accepted."""
    report, service = await _make_voyage_report(session)
    await service.transition_status(report.id, OperationalReportStatus.ACCEPTED.value)

    with pytest.raises(ReportTerminalStateError):
        await service.update(report.id, {"raw_content_ref": "changed"})


@pytest.mark.asyncio
async def test_legal_transitions_constant_matches_spec():
    """The LEGAL_TRANSITIONS dict matches D-LOCK-6 exactly."""
    assert (
        OperationalReportStatus.QUERIED.value
        in LEGAL_TRANSITIONS[OperationalReportStatus.PENDING.value]
    )
    assert (
        OperationalReportStatus.ACCEPTED.value
        in LEGAL_TRANSITIONS[OperationalReportStatus.PENDING.value]
    )
    assert (
        OperationalReportStatus.REJECTED.value
        in LEGAL_TRANSITIONS[OperationalReportStatus.PENDING.value]
    )
    assert (
        OperationalReportStatus.ACCEPTED.value
        in LEGAL_TRANSITIONS[OperationalReportStatus.QUERIED.value]
    )
    assert (
        OperationalReportStatus.REJECTED.value
        in LEGAL_TRANSITIONS[OperationalReportStatus.QUERIED.value]
    )
    assert LEGAL_TRANSITIONS[OperationalReportStatus.ACCEPTED.value] == set()
    assert LEGAL_TRANSITIONS[OperationalReportStatus.REJECTED.value] == set()
