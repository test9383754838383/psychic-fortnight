import pytest
from src.modules.port_call.models.port_call import PortCallStatus
from tests.modules.port_call.conftest import (
    PortCallFactory,
    VoyageFactory,
    PortFactory,
    VesselFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)


@pytest.mark.asyncio
async def test_port_call_crud_api(client, session):
    # Setup
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    # Use UTC to avoid timezone data dependency issues in some environments
    port = PortFactory.build(timezone="UTC")
    session.add_all([voyage, port])
    await session.commit()

    # 1. Create
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/port-calls",
        json={
            "port_id": str(port.id),
            "eta": "2026-06-01T10:00:00",
            "ops_notes": "Test notes",
        },
    )
    assert resp.status_code == 201
    pc_id = resp.json()["id"]

    # 2. Get
    resp = await client.get(f"/api/v1/port-calls/{pc_id}")
    assert resp.status_code == 200
    assert resp.json()["ops_notes"] == "Test notes"
    assert resp.json()["status"] == PortCallStatus.PLANNED.value

    # 3. List for voyage
    resp = await client.get(f"/api/v1/voyages/{voyage.id}/port-calls")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # 4. Transition
    resp = await client.post(
        f"/api/v1/port-calls/{pc_id}/transition",
        json={"to": PortCallStatus.ARRIVED_AT_PILOT_STATION.value},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == PortCallStatus.ARRIVED_AT_PILOT_STATION.value
    assert resp.json()["ata"] is not None

    # 5. Update (Correction)
    # Correction should fail with 403 because testuser in conftest has no roles
    resp = await client.patch(
        f"/api/v1/port-calls/{pc_id}",
        json={
            "status": PortCallStatus.PLANNED.value,
            "correction_reason": "Correction",
        },
    )
    assert resp.status_code == 403

    # Non-privileged update should work
    resp = await client.patch(
        f"/api/v1/port-calls/{pc_id}", json={"ops_notes": "Updated notes"}
    )
    assert resp.status_code == 200
    assert resp.json()["ops_notes"] == "Updated notes"


@pytest.mark.asyncio
async def test_agent_appointment_api(client, session):
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

    agent = CounterpartyFactory.build()
    session.add(agent)
    await session.flush()
    role = CounterpartyRoleFactory.build(counterparty_id=agent.id, role="Agent")
    session.add(role)
    await session.commit()

    # 1. Nominate
    resp = await client.post(
        f"/api/v1/port-calls/{pc.id}/agent-appointments",
        json={"agent_ref": str(agent.id), "appointed_date": "2026-06-01"},
    )
    assert resp.status_code == 201
    app_id = resp.json()["id"]

    # 2. List
    resp = await client.get(f"/api/v1/port-calls/{pc.id}/agent-appointments")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # 3. Appoint
    resp = await client.patch(f"/api/v1/agent-appointments/{app_id}/appoint")
    assert resp.status_code == 200
    assert resp.json()["status"] == "Appointed"

    # 4. Cancel
    resp = await client.post(f"/api/v1/agent-appointments/{app_id}/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "Cancelled"
