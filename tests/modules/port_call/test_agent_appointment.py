import pytest
from datetime import date
from src.modules.port_call.models.agent_appointment import AgentAppointmentStatus
from src.modules.port_call.services.agent_appointment_service import (
    AgentAppointmentService,
)
from src.modules.port_call.exceptions import DuplicateActiveAppointmentError
from tests.modules.port_call.conftest import (
    PortCallFactory,
    VoyageFactory,
    PortFactory,
    VesselFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)


@pytest.mark.asyncio
async def test_agent_replacement_flow(session):
    # Setup
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

    # Create two agents
    agent1 = CounterpartyFactory.build(code="A1")
    agent2 = CounterpartyFactory.build(code="A2")
    session.add_all([agent1, agent2])
    await session.flush()

    role1 = CounterpartyRoleFactory.build(counterparty_id=agent1.id, role="Agent")
    role2 = CounterpartyRoleFactory.build(counterparty_id=agent2.id, role="Agent")
    session.add_all([role1, role2])
    await session.commit()

    service = AgentAppointmentService(session)

    # 1. Nominate agent1
    app1 = await service.nominate(
        pc.id, {"agent_ref": agent1.id, "appointed_date": date(2026, 6, 1)}
    )
    assert app1.status == AgentAppointmentStatus.NOMINATED.value

    # 2. Try to nominate agent2 while app1 is active (should fail)
    with pytest.raises(DuplicateActiveAppointmentError):
        await service.nominate(
            pc.id, {"agent_ref": agent2.id, "appointed_date": date(2026, 6, 2)}
        )

    # 3. Replace agent1 with agent2
    app2 = await service.replace(
        pc.id, {"agent_ref": agent2.id, "appointed_date": date(2026, 6, 2)}
    )

    await session.refresh(app1)
    assert app1.status == AgentAppointmentStatus.CANCELLED.value
    assert app2.status == AgentAppointmentStatus.NOMINATED.value
    assert app2.agent_ref == agent2.id

    # 4. Get active appointment
    active = await service.get_active(pc.id)
    assert active.id == app2.id
