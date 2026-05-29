import pytest
import uuid
from src.modules.port_call.services.port_call_service import PortCallService
from src.modules.port_call.exceptions import (
    MissingMasterDataReferenceError,
    PortCallNotFoundError,
)
from tests.modules.port_call.conftest import (
    VoyageFactory,
    PortFactory,
    VesselFactory,
    ItineraryLineFactory,
)


@pytest.mark.asyncio
async def test_create_with_itinerary_line_wrong_voyage(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage1 = VoyageFactory.build(vessel_ref=vessel.id)
    voyage2 = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage1, voyage2, port])
    await session.commit()

    line = ItineraryLineFactory.build(voyage_id=voyage2.id, port_ref=port.id)
    session.add(line)
    await session.commit()

    service = PortCallService(session)
    with pytest.raises(MissingMasterDataReferenceError, match="itinerary_line_id"):
        await service.create(
            {"voyage_id": voyage1.id, "port_id": port.id, "itinerary_line_id": line.id}
        )


@pytest.mark.asyncio
async def test_get_port_call_not_found(session):
    service = PortCallService(session)
    with pytest.raises(PortCallNotFoundError):
        await service.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_update_port_call_not_found(session):
    service = PortCallService(session)
    with pytest.raises(PortCallNotFoundError):
        await service.update(uuid.uuid4(), {}, set())


@pytest.mark.asyncio
async def test_transition_port_call_not_found(session):
    service = PortCallService(session)
    with pytest.raises(PortCallNotFoundError):
        await service.transition_status(uuid.uuid4(), "Arrived at Pilot Station")
