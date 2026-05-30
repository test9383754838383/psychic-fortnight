import pytest
from src.modules.port_call.models.port_call import PortCallStatus
from src.modules.port_call.services.port_call_service import PortCallService
from src.modules.port_call.exceptions import IllegalPortCallTransitionError
from tests.modules.port_call.conftest import (
    PortCallFactory,
    VoyageFactory,
    PortFactory,
    VesselFactory,
)


@pytest.mark.asyncio
async def test_valid_forward_transitions(session):
    # Setup
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(
        voyage_id=voyage.id, port_id=port.id, status=PortCallStatus.PLANNED.value
    )
    session.add(pc)
    await session.commit()

    service = PortCallService(session)

    # Planned -> Arrived at Pilot Station
    await service.transition_status(
        pc.id, PortCallStatus.ARRIVED_AT_PILOT_STATION.value
    )
    await session.refresh(pc)
    assert pc.status == PortCallStatus.ARRIVED_AT_PILOT_STATION.value
    assert pc.ata is not None

    # Arrived -> Berthed (skip Anchor)
    await service.transition_status(pc.id, PortCallStatus.BERTHED.value)
    await session.refresh(pc)
    assert pc.status == PortCallStatus.BERTHED.value
    assert pc.atb is not None
    assert pc.anchored_datetime is None


@pytest.mark.asyncio
async def test_illegal_transition_rejected(session):
    # Setup
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(
        voyage_id=voyage.id, port_id=port.id, status=PortCallStatus.DEPARTED.value
    )
    session.add(pc)
    await session.commit()

    service = PortCallService(session)

    with pytest.raises(IllegalPortCallTransitionError):
        await service.transition_status(pc.id, PortCallStatus.BERTHED.value)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "start_status,target_status",
    [
        (
            PortCallStatus.PLANNED.value,
            PortCallStatus.BERTHED.value,
        ),  # Skip Pilot & Anchor
        (PortCallStatus.PLANNED.value, PortCallStatus.AT_ANCHOR.value),  # Skip Pilot
        (
            PortCallStatus.BERTHED.value,
            PortCallStatus.DEPARTED.value,
        ),  # Skip Cargo Ops Completed
    ],
)
async def test_skips_allowed(session, start_status, target_status):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(
        voyage_id=voyage.id, port_id=port.id, status=start_status
    )
    session.add(pc)
    await session.commit()

    service = PortCallService(session)
    await service.transition_status(pc.id, target_status)
    await session.refresh(pc)
    assert pc.status == target_status
