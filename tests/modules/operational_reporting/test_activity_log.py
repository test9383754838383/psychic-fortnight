"""test_activity_log.py — add entries, list, append-only enforcement."""

import uuid
from datetime import datetime, timezone

import pytest

from src.modules.operational_reporting.exceptions import MissingReferenceError
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


async def _make_port_call(session):
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
    return pc, user


@pytest.mark.asyncio
async def test_add_log_entry(session):
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)

    entry = await service.add_log_entry(
        {
            "port_call_id": pc.id,
            "logged_by_user_id": user.id,
            "narrative": "NOR tendered, vessel at anchorage.",
            "logged_at": datetime.now(timezone.utc),
        }
    )
    assert entry.id is not None
    assert entry.narrative == "NOR tendered, vessel at anchorage."
    assert entry.port_call_id == pc.id


@pytest.mark.asyncio
async def test_list_log_entries_ordered(session):
    pc, user = await _make_port_call(session)
    service = PortActivityService(session)
    from datetime import timedelta

    t0 = datetime(2026, 6, 1, 8, 0, 0, tzinfo=timezone.utc)
    await service.add_log_entry(
        {
            "port_call_id": pc.id,
            "logged_by_user_id": user.id,
            "narrative": "Second note",
            "logged_at": t0 + timedelta(hours=1),
        }
    )
    await service.add_log_entry(
        {
            "port_call_id": pc.id,
            "logged_by_user_id": user.id,
            "narrative": "First note",
            "logged_at": t0,
        }
    )

    entries = await service.list_log_entries(pc.id)
    assert entries[0].narrative == "First note"
    assert entries[1].narrative == "Second note"


@pytest.mark.asyncio
async def test_log_entry_port_call_not_found(session):
    user = UserFactory.build()
    session.add(user)
    await session.commit()
    service = PortActivityService(session)
    with pytest.raises(MissingReferenceError):
        await service.add_log_entry(
            {
                "port_call_id": uuid.uuid4(),
                "logged_by_user_id": user.id,
                "narrative": "Should fail",
                "logged_at": datetime.now(timezone.utc),
            }
        )
