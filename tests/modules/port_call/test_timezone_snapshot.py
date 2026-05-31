import pytest
from datetime import datetime, timezone
from src.modules.port_call.services.port_call_service import PortCallService
from tests.modules.port_call.conftest import VoyageFactory, PortFactory, VesselFactory


@pytest.mark.asyncio
async def test_timezone_snapshot_and_conversion(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    # Singapore is UTC+8
    port = PortFactory.build(timezone="Asia/Singapore")
    session.add_all([voyage, port])
    await session.commit()

    service = PortCallService(session)

    # Local time in Singapore
    local_eta = datetime(2026, 6, 1, 10, 0, 0)  # 10 AM local

    pc = await service.create(
        {"voyage_id": voyage.id, "port_id": port.id, "eta": local_eta}
    )

    assert pc.timezone_name == "Asia/Singapore"
    # Singapore offset is 480 minutes
    assert pc.timezone_offset_minutes == 480

    # 10 AM Singapore = 2 AM UTC
    assert pc.eta.hour == 2
    assert pc.eta.tzinfo == timezone.utc
