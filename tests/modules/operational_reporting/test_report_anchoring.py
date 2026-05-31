"""test_report_anchoring.py — voyage_id XOR port_call_id enforcement (D-LOCK-5)."""

from datetime import datetime, timezone

import pytest

from src.modules.operational_reporting.exceptions import (
    InvalidReportAnchorError,
    ReportTypeAnchorMismatchError,
)
from src.modules.operational_reporting.models.operational_report import (
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
async def test_noon_requires_voyage_id(session):
    """Noon report must have voyage_id set."""
    voyage, pc, user = await _setup(session)
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
    assert report.voyage_id == voyage.id
    assert report.port_call_id is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "report_type",
    [
        OperationalReportType.ARRIVAL.value,
        OperationalReportType.DEPARTURE.value,
        OperationalReportType.BUNKERING.value,
        OperationalReportType.STATEMENT_OF_FACTS.value,
    ],
)
async def test_port_call_anchor_types(session, report_type):
    """Arrival/Departure/Bunkering/SOF require port_call_id."""
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    report = await service.create(
        {
            "voyage_id": None,
            "port_call_id": pc.id,
            "report_type": report_type,
            "submitted_by_user_id": user.id,
            "submitted_at": datetime.now(timezone.utc),
        }
    )
    assert report.port_call_id == pc.id
    assert report.voyage_id is None


@pytest.mark.asyncio
async def test_both_anchors_raises(session):
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    with pytest.raises(InvalidReportAnchorError):
        await service.create(
            {
                "voyage_id": voyage.id,
                "port_call_id": pc.id,
                "report_type": OperationalReportType.NOON.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
            }
        )


@pytest.mark.asyncio
async def test_neither_anchor_raises(session):
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    with pytest.raises(InvalidReportAnchorError):
        await service.create(
            {
                "voyage_id": None,
                "port_call_id": None,
                "report_type": OperationalReportType.NOON.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
            }
        )


@pytest.mark.asyncio
async def test_noon_with_port_call_anchor_raises(session):
    """Noon report on port_call anchor raises ReportTypeAnchorMismatchError."""
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    with pytest.raises(ReportTypeAnchorMismatchError):
        await service.create(
            {
                "voyage_id": None,
                "port_call_id": pc.id,
                "report_type": OperationalReportType.NOON.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
            }
        )


@pytest.mark.asyncio
async def test_arrival_with_voyage_anchor_raises(session):
    """Arrival report on voyage anchor raises ReportTypeAnchorMismatchError."""
    voyage, pc, user = await _setup(session)
    service = OperationalReportService(session)

    with pytest.raises(ReportTypeAnchorMismatchError):
        await service.create(
            {
                "voyage_id": voyage.id,
                "port_call_id": None,
                "report_type": OperationalReportType.ARRIVAL.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
            }
        )
