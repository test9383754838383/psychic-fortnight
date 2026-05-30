import pytest
import uuid
from src.modules.port_call.services.agent_appointment_service import (
    AgentAppointmentService,
)
from src.modules.port_call.exceptions import (
    AgentAppointmentNotFoundError,
    IllegalAgentAppointmentTransitionError,
)
from tests.modules.port_call.conftest import (
    PortCallFactory,
    VoyageFactory,
    PortFactory,
    VesselFactory,
    AgentAppointmentFactory,
    CounterpartyFactory,
)


@pytest.mark.asyncio
async def test_appoint_not_found(session):
    service = AgentAppointmentService(session)
    with pytest.raises(AgentAppointmentNotFoundError):
        await service.appoint(uuid.uuid4())


@pytest.mark.asyncio
async def test_cancel_not_found(session):
    service = AgentAppointmentService(session)
    with pytest.raises(AgentAppointmentNotFoundError):
        await service.cancel(uuid.uuid4())


@pytest.mark.asyncio
async def test_illegal_agent_transition(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()

    agent = CounterpartyFactory.build()
    session.add(agent)
    await session.flush()

    app = AgentAppointmentFactory.build(
        port_call_id=pc.id, agent_ref=agent.id, status="Appointed"
    )
    session.add(app)
    await session.commit()

    service = AgentAppointmentService(session)
    # Can't appoint an already appointed one
    with pytest.raises(IllegalAgentAppointmentTransitionError):
        await service.appoint(app.id)


@pytest.mark.asyncio
async def test_cancel_idempotent(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()

    agent = CounterpartyFactory.build()
    session.add(agent)
    await session.flush()

    app = AgentAppointmentFactory.build(
        port_call_id=pc.id, agent_ref=agent.id, status="Cancelled"
    )
    session.add(app)
    await session.commit()

    service = AgentAppointmentService(session)
    # Should just return the already cancelled one
    result = await service.cancel(app.id)
    assert result.status == "Cancelled"
