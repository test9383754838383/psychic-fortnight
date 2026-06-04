import uuid
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.bunker_rob.exceptions import BunkerRobNotFoundError, InvalidFuelGradeError
from src.modules.bunker_rob.models.bunker_rob import FUEL_GRADES, FuelGrade
from src.modules.bunker_rob.services.bunker_rob_service import BunkerRobService
from tests.modules.port_call.conftest import PortCallFactory, PortFactory, VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_voyage_and_port_call(session: AsyncSession):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    port_call = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(port_call)
    await session.commit()
    return voyage, port_call


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


def test_fuel_grades_constants():
    assert len(FUEL_GRADES) == 5
    assert FuelGrade.VLSFO.value in FUEL_GRADES
    assert FuelGrade.LSMGO.value in FUEL_GRADES
    assert FuelGrade.HSFO.value in FUEL_GRADES
    assert FuelGrade.MGO.value in FUEL_GRADES
    assert FuelGrade.LNG.value in FUEL_GRADES


# ---------------------------------------------------------------------------
# Service — create & read
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_bunker_rob_persists(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    rob = await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.VLSFO.value,
        "rob_arrival_mt": Decimal("1200.000"),
        "received_mt": Decimal("500.000"),
        "port_consumption_mt": Decimal("50.000"),
        "rob_departure_mt": Decimal("1650.000"),
        "sulphur_pct": Decimal("0.0490"),
        "bdn_number": "BDN-001",
    })

    assert rob.id is not None
    assert rob.port_call_id == port_call.id
    assert rob.voyage_id == voyage.id
    assert rob.fuel_grade == FuelGrade.VLSFO.value
    assert rob.rob_arrival_mt == Decimal("1200.000")
    assert rob.received_mt == Decimal("500.000")
    assert rob.port_consumption_mt == Decimal("50.000")
    assert rob.rob_departure_mt == Decimal("1650.000")
    assert rob.sulphur_pct == Decimal("0.0490")
    assert rob.bdn_number == "BDN-001"


@pytest.mark.asyncio
async def test_computed_fields_correct(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    rob = await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.LSMGO.value,
        "rob_arrival_mt": Decimal("300.000"),
        "received_mt": Decimal("200.000"),
        "port_consumption_mt": Decimal("30.000"),
        "rob_departure_mt": Decimal("460.000"),
    })

    # calculated = 300 + 200 - 460 = 40
    # variance   = 30 - 40 = -10
    calc = service.calculated_port_consumption(rob)
    variance = service.variance(rob)
    assert calc == Decimal("40.000")
    assert variance == Decimal("-10.000")


@pytest.mark.asyncio
async def test_computed_fields_none_when_data_missing(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    rob = await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.MGO.value,
        "rob_arrival_mt": Decimal("100.000"),
    })

    assert service.calculated_port_consumption(rob) is None
    assert service.variance(rob) is None


@pytest.mark.asyncio
async def test_invalid_fuel_grade_raises(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    with pytest.raises(InvalidFuelGradeError):
        await service.create({
            "port_call_id": port_call.id,
            "voyage_id": voyage.id,
            "fuel_grade": "IFO380",
        })


@pytest.mark.asyncio
async def test_list_for_voyage(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.VLSFO.value,
    })
    await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.MGO.value,
    })

    robs = await service.list_for_voyage(voyage.id)
    assert len(robs) == 2
    grades = {r.fuel_grade for r in robs}
    assert grades == {FuelGrade.VLSFO.value, FuelGrade.MGO.value}


@pytest.mark.asyncio
async def test_list_for_port_call(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)
    # second port call on same voyage
    port2 = PortFactory.build()
    session.add(port2)
    await session.flush()
    port_call2 = PortCallFactory.build(voyage_id=voyage.id, port_id=port2.id)
    session.add(port_call2)
    await session.commit()

    service = BunkerRobService(session)
    await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.VLSFO.value,
    })
    await service.create({
        "port_call_id": port_call2.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.LSMGO.value,
    })

    robs_pc1 = await service.list_for_port_call(port_call.id)
    assert len(robs_pc1) == 1
    assert robs_pc1[0].fuel_grade == FuelGrade.VLSFO.value

    robs_pc2 = await service.list_for_port_call(port_call2.id)
    assert len(robs_pc2) == 1
    assert robs_pc2[0].fuel_grade == FuelGrade.LSMGO.value


@pytest.mark.asyncio
async def test_update_bunker_rob(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    rob = await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.VLSFO.value,
        "rob_arrival_mt": Decimal("1000.000"),
    })

    updated = await service.update(rob.id, {
        "rob_arrival_mt": Decimal("1100.000"),
        "received_mt": Decimal("400.000"),
        "rob_departure_mt": Decimal("1480.000"),
        "bdn_number": "BDN-002",
    })
    assert updated.rob_arrival_mt == Decimal("1100.000")
    assert updated.received_mt == Decimal("400.000")
    assert updated.rob_departure_mt == Decimal("1480.000")
    assert updated.bdn_number == "BDN-002"


@pytest.mark.asyncio
async def test_delete_bunker_rob(session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    service = BunkerRobService(session)
    rob = await service.create({
        "port_call_id": port_call.id,
        "voyage_id": voyage.id,
        "fuel_grade": FuelGrade.HSFO.value,
    })

    await service.delete(rob.id)
    with pytest.raises(BunkerRobNotFoundError):
        await service.get(rob.id)


@pytest.mark.asyncio
async def test_get_not_found(session: AsyncSession):
    service = BunkerRobService(session)
    with pytest.raises(BunkerRobNotFoundError):
        await service.get(uuid.uuid4())


# ---------------------------------------------------------------------------
# API tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bunker_rob_api_crud(client, session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    # Create
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/bunker-robs",
        json={
            "port_call_id": str(port_call.id),
            "fuel_grade": FuelGrade.VLSFO.value,
            "rob_arrival_mt": 1200.0,
            "received_mt": 500.0,
            "port_consumption_mt": 50.0,
            "rob_departure_mt": 1650.0,
            "bdn_number": "BDN-001",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    rob_id = data["id"]
    assert data["fuel_grade"] == "VLSFO"
    assert float(data["rob_arrival_mt"]) == pytest.approx(1200.0)
    assert float(data["calculated_port_consumption_mt"]) == pytest.approx(50.0)
    assert float(data["variance_mt"]) == pytest.approx(0.0)

    # List for voyage
    resp = await client.get(f"/api/v1/voyages/{voyage.id}/bunker-robs")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # List for port call
    resp = await client.get(f"/api/v1/port-calls/{port_call.id}/bunker-robs")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Get single
    resp = await client.get(f"/api/v1/bunker-robs/{rob_id}")
    assert resp.status_code == 200
    assert resp.json()["bdn_number"] == "BDN-001"

    # Update
    resp = await client.patch(
        f"/api/v1/bunker-robs/{rob_id}",
        json={"rob_arrival_mt": 1300.0, "bdn_number": "BDN-002"},
    )
    assert resp.status_code == 200
    assert float(resp.json()["rob_arrival_mt"]) == pytest.approx(1300.0)
    assert resp.json()["bdn_number"] == "BDN-002"

    # Delete
    resp = await client.delete(f"/api/v1/bunker-robs/{rob_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/bunker-robs/{rob_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_fuel_grade_api_422(client, session: AsyncSession):
    voyage, port_call = await _make_voyage_and_port_call(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/bunker-robs",
        json={"port_call_id": str(port_call.id), "fuel_grade": "IFO380"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_unauthenticated_bunker_rob_fails(unauthenticated_client):
    resp = await unauthenticated_client.get(f"/api/v1/voyages/{uuid.uuid4()}/bunker-robs")
    assert resp.status_code == 401
