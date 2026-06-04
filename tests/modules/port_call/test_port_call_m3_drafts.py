from decimal import Decimal

import pytest

from src.modules.port_call.services.port_call_service import PortCallService
from tests.modules.port_call.conftest import (
    PortCallFactory,
    PortFactory,
    VesselFactory,
    VoyageFactory,
)


@pytest.mark.asyncio
async def test_draft_fields_persist_via_service(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build(timezone="UTC")
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()

    service = PortCallService(session)
    updated = await service.update(
        pc.id,
        {
            "arrival_draft_fwd": Decimal("6.50"),
            "arrival_draft_aft": Decimal("6.80"),
            "departure_draft_fwd": Decimal("5.20"),
            "departure_draft_aft": Decimal("5.40"),
        },
        set(),
    )

    assert updated.arrival_draft_fwd == Decimal("6.50")
    assert updated.arrival_draft_aft == Decimal("6.80")
    assert updated.departure_draft_fwd == Decimal("5.20")
    assert updated.departure_draft_aft == Decimal("5.40")


@pytest.mark.asyncio
async def test_partial_draft_update(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build(timezone="UTC")
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()

    service = PortCallService(session)
    updated = await service.update(
        pc.id,
        {"arrival_draft_fwd": Decimal("7.10")},
        set(),
    )

    assert updated.arrival_draft_fwd == Decimal("7.10")
    assert updated.arrival_draft_aft is None
    assert updated.departure_draft_fwd is None
    assert updated.departure_draft_aft is None


@pytest.mark.asyncio
async def test_draft_fields_in_api_response(client, session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build(timezone="UTC")
    session.add_all([voyage, port])
    await session.commit()

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/port-calls",
        json={"port_id": str(port.id)},
    )
    assert resp.status_code == 201
    pc_id = resp.json()["id"]
    assert resp.json()["arrival_draft_fwd"] is None

    resp = await client.patch(
        f"/api/v1/port-calls/{pc_id}",
        json={
            "arrival_draft_fwd": 6.5,
            "arrival_draft_aft": 6.8,
            "departure_draft_fwd": 5.2,
            "departure_draft_aft": 5.4,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert float(body["arrival_draft_fwd"]) == pytest.approx(6.5)
    assert float(body["arrival_draft_aft"]) == pytest.approx(6.8)
    assert float(body["departure_draft_fwd"]) == pytest.approx(5.2)
    assert float(body["departure_draft_aft"]) == pytest.approx(5.4)
