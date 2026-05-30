"""test_cross_module_refs.py — missing port_call / voyage / user refs return 404."""

import uuid
from datetime import datetime, timezone

import pytest

from src.modules.operational_reporting.exceptions import MissingReferenceError
from src.modules.operational_reporting.models.operational_report import (
    OperationalReportType,
)
from src.modules.operational_reporting.services.operational_report_service import (
    OperationalReportService,
)
from src.modules.operational_reporting.services.port_activity_service import (
    PortActivityService,
)
from src.modules.operational_reporting.models.port_activity import PortActivityEventType
from tests.modules.operational_reporting.conftest import UserFactory


@pytest.mark.asyncio
async def test_event_port_call_not_found_404(session):
    user = UserFactory.build()
    session.add(user)
    await session.commit()
    service = PortActivityService(session)
    with pytest.raises(MissingReferenceError) as exc_info:
        await service.create_event(
            {
                "port_call_id": uuid.uuid4(),
                "event_type": PortActivityEventType.ARRIVED.value,
                "event_timestamp": datetime.now(timezone.utc),
                "recorded_by_user_id": user.id,
            }
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_report_voyage_not_found_404(session):
    user = UserFactory.build()
    session.add(user)
    await session.commit()
    service = OperationalReportService(session)
    with pytest.raises(MissingReferenceError) as exc_info:
        await service.create(
            {
                "voyage_id": uuid.uuid4(),
                "port_call_id": None,
                "report_type": OperationalReportType.NOON.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
            }
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_report_port_call_not_found_404(session):
    user = UserFactory.build()
    session.add(user)
    await session.commit()
    service = OperationalReportService(session)
    with pytest.raises(MissingReferenceError) as exc_info:
        await service.create(
            {
                "voyage_id": None,
                "port_call_id": uuid.uuid4(),
                "report_type": OperationalReportType.ARRIVAL.value,
                "submitted_by_user_id": user.id,
                "submitted_at": datetime.now(timezone.utc),
            }
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_report_404(session):
    service = OperationalReportService(session)
    with pytest.raises(MissingReferenceError) as exc_info:
        await service.get(uuid.uuid4())
    assert exc_info.value.status_code == 404
