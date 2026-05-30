"""test_operational_report_correction.py — supersession chain tests (D-LOCK-7)."""

import uuid
from datetime import datetime, timezone

import pytest

from src.modules.operational_reporting.exceptions import InvalidSupersededReportError
from src.modules.operational_reporting.models.operational_report import (
    OperationalReportStatus,
    OperationalReportType,
)
from src.modules.operational_reporting.services.operational_report_service import (
    OperationalReportService,
)
from tests.modules.operational_reporting.conftest import (
    PortCallFactory,
    PortFactory,
    VesselFactory,
    VoyageFactory,
    UserFactory,
)


async def _setup(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    user = UserFactory.build()
    session.add_all([pc, user])
    await session.commit()
    return voyage, pc, user


@pytest.mark.asyncio
async def test_supersession_accepted_report(session):
    """Creating a superseding report for an Accepted report works; both rows preserved."""
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    # Create + accept original
    original = await service.create(
        {
            "voyage_id": voyage.id,
            "port_call_id": None,
            "report_type": OperationalReportType.NOON.value,
            "submitted_by_user_id": user.id,
            "submitted_at": datetime.now(timezone.utc),
        }
    )
    accepted = await service.transition_status(
        original.id, OperationalReportStatus.ACCEPTED.value
    )
    assert accepted.status == OperationalReportStatus.ACCEPTED.value

    # Create superseding report
    superseding = await service.create(
        {
            "voyage_id": voyage.id,
            "port_call_id": None,
            "report_type": OperationalReportType.NOON.value,
            "submitted_by_user_id": user.id,
            "submitted_at": datetime.now(timezone.utc),
            "supersedes_report_id": original.id,
        }
    )
    assert superseding.supersedes_report_id == original.id
    assert superseding.status == OperationalReportStatus.PENDING.value

    # Original still Accepted and unchanged
    await session.refresh(original)
    assert original.status == OperationalReportStatus.ACCEPTED.value


@pytest.mark.asyncio
async def test_supersession_requires_accepted_original(session):
    """Superseding a Pending report raises InvalidSupersededReportError."""
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    pending = await service.create(
        {
            "voyage_id": voyage.id,
            "port_call_id": None,
            "report_type": OperationalReportType.NOON.value,
            "submitted_by_user_id": user.id,
            "submitted_at": datetime.now(timezone.utc),
        }
    )

    with pytest.raises(InvalidSupersededReportError):
        await service.create(
            {
                "voyage_id": voyage.id,
                "port_call_id": None,
                "report_type": OperationalReportType.NOON.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
                "supersedes_report_id": pending.id,
            }
        )


@pytest.mark.asyncio
async def test_supersession_nonexistent_original_raises(session):
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    with pytest.raises(InvalidSupersededReportError):
        await service.create(
            {
                "voyage_id": voyage.id,
                "port_call_id": None,
                "report_type": OperationalReportType.NOON.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
                "supersedes_report_id": uuid.uuid4(),
            }
        )
