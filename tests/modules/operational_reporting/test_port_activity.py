"""test_port_activity.py — create events, all 21 event types, correction chain."""

import uuid
from datetime import datetime, timezone

import pytest

from src.modules.operational_reporting.exceptions import (
    InvalidEventTypeError,
    MissingCorrectionReasonError,
    MissingReferenceError,
)
from src.modules.operational_reporting.models.port_activity import PortActivityEventType
from src.modules.operational_reporting.services.port_activity_service import (
    PortActivityService,
)
from tests.modules.operational_reporting.conftest import (
    PortCallFactory,
    PortFactory,
    VesselFactory,
    VoyageFactory,
    UserFactory,
)

ALL_EVENT_TYPES = [e.value for e in PortActivityEventType]


async def _make_port_call(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    user = UserFactory.build()
    session.add(user)
    await session.commit()
    return pc, user


@pytest.mark.asyncio
@pytest.mark.parametrize("event_type", ALL_EVENT_TYPES)
async def test_create_event_all_types(session, event_type):
    """All 21 event types accepted."""
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)
    event = await service.create_event(
        {
            "port_call_id": pc.id,
            "event_type": event_type,
            "event_timestamp": datetime.now(timezone.utc),
            "recorded_by_user_id": user.id,
        }
    )
    assert event.id is not None
    assert event.event_type == event_type
    assert event.port_call_id == pc.id


@pytest.mark.asyncio
async def test_invalid_event_type_rejected(session):
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)
    with pytest.raises(InvalidEventTypeError):
        await service.create_event(
            {
                "port_call_id": pc.id,
                "event_type": "Not A Real Event",
                "event_timestamp": datetime.now(timezone.utc),
                "recorded_by_user_id": user.id,
            }
        )


@pytest.mark.asyncio
async def test_port_call_not_found_raises(session):
    """Events for non-existent port call raise MissingReferenceError."""
    user = UserFactory.build()
    session.add(user)
    await session.commit()
    service = PortActivityService(session)
    with pytest.raises(MissingReferenceError):
        await service.create_event(
            {
                "port_call_id": uuid.uuid4(),
                "event_type": PortActivityEventType.ARRIVED.value,
                "event_timestamp": datetime.now(timezone.utc),
                "recorded_by_user_id": user.id,
            }
        )


@pytest.mark.asyncio
async def test_correction_chain_valid(session):
    """Correction row links back to original; both rows visible."""
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)
    ts = datetime.now(timezone.utc)

    original = await service.create_event(
        {
            "port_call_id": pc.id,
            "event_type": PortActivityEventType.ARRIVED.value,
            "event_timestamp": ts,
            "recorded_by_user_id": user.id,
        }
    )

    correction = await service.create_event(
        {
            "port_call_id": pc.id,
            "event_type": PortActivityEventType.ARRIVED.value,
            "event_timestamp": ts,
            "recorded_by_user_id": user.id,
            "corrects_activity_id": original.id,
            "correction_reason": "Wrong timestamp",
        }
    )

    assert correction.corrects_activity_id == original.id
    assert correction.correction_reason == "Wrong timestamp"

    # Original row unchanged
    await session.refresh(original)
    assert original.corrects_activity_id is None

    # Both appear in list
    events = await service.list_events(pc.id)
    ids = [e.id for e in events]
    assert original.id in ids
    assert correction.id in ids


@pytest.mark.asyncio
async def test_correction_missing_reason_raises(session):
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)

    original = await service.create_event(
        {
            "port_call_id": pc.id,
            "event_type": PortActivityEventType.BERTHED.value,
            "event_timestamp": datetime.now(timezone.utc),
            "recorded_by_user_id": user.id,
        }
    )

    with pytest.raises(MissingCorrectionReasonError):
        await service.create_event(
            {
                "port_call_id": pc.id,
                "event_type": PortActivityEventType.BERTHED.value,
                "event_timestamp": datetime.now(timezone.utc),
                "recorded_by_user_id": user.id,
                "corrects_activity_id": original.id,
                # no correction_reason
            }
        )


@pytest.mark.asyncio
async def test_correction_wrong_port_call_raises(session):
    """Correcting an event from a different port call raises MissingReferenceError."""
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    pc1 = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    pc2 = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    user = UserFactory.build()
    session.add_all([pc1, pc2, user])
    await session.commit()

    service = PortActivityService(session)
    event_on_pc1 = await service.create_event(
        {
            "port_call_id": pc1.id,
            "event_type": PortActivityEventType.ARRIVED.value,
            "event_timestamp": datetime.now(timezone.utc),
            "recorded_by_user_id": user.id,
        }
    )

    with pytest.raises(MissingReferenceError):
        await service.create_event(
            {
                "port_call_id": pc2.id,
                "event_type": PortActivityEventType.ARRIVED.value,
                "event_timestamp": datetime.now(timezone.utc),
                "recorded_by_user_id": user.id,
                "corrects_activity_id": event_on_pc1.id,
                "correction_reason": "Wrong PC",
            }
        )


@pytest.mark.asyncio
async def test_list_events_ordered_by_timestamp(session):
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)
    from datetime import timedelta

    t0 = datetime(2026, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
    await service.create_event(
        {
            "port_call_id": pc.id,
            "event_type": PortActivityEventType.BERTHED.value,
            "event_timestamp": t0 + timedelta(hours=2),
            "recorded_by_user_id": user.id,
        }
    )
    await service.create_event(
        {
            "port_call_id": pc.id,
            "event_type": PortActivityEventType.ARRIVED.value,
            "event_timestamp": t0,
            "recorded_by_user_id": user.id,
        }
    )

    events = await service.list_events(pc.id)
    assert events[0].event_type == PortActivityEventType.ARRIVED.value
    assert events[1].event_type == PortActivityEventType.BERTHED.value
