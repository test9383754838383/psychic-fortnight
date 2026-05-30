import pytest
import uuid
from datetime import date
from src.modules.port_call.services.port_call_service import PortCallService
from src.modules.port_call.exceptions import MissingMasterDataReferenceError
from tests.modules.port_call.conftest import (
    PortCallFactory,
    VoyageFactory,
    PortFactory,
    VesselFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)
from src.modules.port_call.services.agent_appointment_service import (
    AgentAppointmentService,
)
from src.modules.port_call.exceptions import AgentRoleError


@pytest.mark.asyncio
async def test_create_with_missing_voyage(session):
    port = PortFactory.build()
    session.add(port)
    await session.commit()

    service = PortCallService(session)
    with pytest.raises(MissingMasterDataReferenceError, match="voyage_id"):
        await service.create({"voyage_id": uuid.uuid4(), "port_id": port.id})


@pytest.mark.asyncio
async def test_create_with_inactive_port(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build(status="Inactive")
    session.add_all([voyage, port])
    await session.commit()

    service = PortCallService(session)
    with pytest.raises(MissingMasterDataReferenceError, match="port_id"):
        await service.create({"voyage_id": voyage.id, "port_id": port.id})


@pytest.mark.asyncio
async def test_agent_role_validation(session):
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

    # Counterparty without Agent role
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = AgentAppointmentService(session)
    with pytest.raises(AgentRoleError):
        await service.nominate(
            pc.id, {"agent_ref": cp.id, "appointed_date": date(2026, 1, 1)}
        )

    # Add Agent role
    role = CounterpartyRoleFactory.build(counterparty_id=cp.id, role="Agent")
    session.add(role)
    await session.commit()
    await session.refresh(cp)

    # Now it should work
    await service.nominate(
        pc.id, {"agent_ref": cp.id, "appointed_date": date(2026, 1, 1)}
    )
