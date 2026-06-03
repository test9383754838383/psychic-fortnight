from decimal import Decimal

import pytest

from src.modules.cargo.exceptions import CargoNotFoundError, InvalidCommodityError, InvalidUnitError
from src.modules.cargo.models.cargo import CommodityType, QuantityUnit
from src.modules.cargo.services.cargo_service import CargoService
from tests.modules.master_data.conftest import PortFactory, VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


# ------------------------------------------------------------------ #
# Service tests                                                      #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_create_cargo_persists(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    load_port = PortFactory.build()
    disch_port = PortFactory.build()
    session.add_all([voyage, load_port, disch_port])
    await session.commit()

    service = CargoService(session)
    cargo = await service.create({
        "voyage_id": voyage.id,
        "commodity": CommodityType.CRUDE_OIL.value,
        "quantity": Decimal("25000.000"),
        "unit": QuantityUnit.MT.value,
        "load_port_ref": load_port.id,
        "discharge_port_ref": disch_port.id,
        "notes": "Test cargo",
    })

    assert cargo.id is not None
    assert cargo.voyage_id == voyage.id
    assert cargo.commodity == "Crude Oil"
    assert cargo.quantity == Decimal("25000.000")
    assert cargo.unit == "MT"
    assert cargo.load_port_ref == load_port.id
    assert cargo.discharge_port_ref == disch_port.id
    assert cargo.notes == "Test cargo"


@pytest.mark.asyncio
async def test_list_cargoes_for_voyage(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = CargoService(session)
    await service.create({"voyage_id": voyage.id, "commodity": CommodityType.GRAIN.value, "quantity": Decimal("10000"), "unit": QuantityUnit.MT.value})
    await service.create({"voyage_id": voyage.id, "commodity": CommodityType.COAL.value, "quantity": Decimal("5000"), "unit": QuantityUnit.MT.value})

    cargoes = await service.list_for_voyage(voyage.id)
    assert len(cargoes) == 2
    assert {c.commodity for c in cargoes} == {"Grain", "Coal"}


@pytest.mark.asyncio
async def test_invalid_commodity_raises(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = CargoService(session)
    with pytest.raises(InvalidCommodityError):
        await service.create({"voyage_id": voyage.id, "commodity": "Uranium", "quantity": Decimal("1"), "unit": "MT"})


@pytest.mark.asyncio
async def test_invalid_unit_raises(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = CargoService(session)
    with pytest.raises(InvalidUnitError):
        await service.create({"voyage_id": voyage.id, "commodity": CommodityType.CRUDE_OIL.value, "quantity": Decimal("1"), "unit": "TONS"})


@pytest.mark.asyncio
async def test_update_cargo(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = CargoService(session)
    cargo = await service.create({"voyage_id": voyage.id, "commodity": CommodityType.GRAIN.value, "quantity": Decimal("1000"), "unit": QuantityUnit.MT.value})

    updated = await service.update(cargo.id, {"commodity": CommodityType.COAL.value, "quantity": Decimal("2000")})
    assert updated.commodity == "Coal"
    assert updated.quantity == Decimal("2000")


@pytest.mark.asyncio
async def test_delete_cargo(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = CargoService(session)
    cargo = await service.create({"voyage_id": voyage.id, "commodity": CommodityType.NAPHTHA.value, "quantity": Decimal("500"), "unit": QuantityUnit.BBL.value})

    await service.delete(cargo.id)
    with pytest.raises(CargoNotFoundError):
        await service.get(cargo.id)


@pytest.mark.asyncio
async def test_unit_bbl_cbm(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = CargoService(session)
    bbl = await service.create({"voyage_id": voyage.id, "commodity": CommodityType.CRUDE_OIL.value, "quantity": Decimal("100000"), "unit": QuantityUnit.BBL.value})
    cbm = await service.create({"voyage_id": voyage.id, "commodity": CommodityType.FUEL_OIL.value, "quantity": Decimal("5000"), "unit": QuantityUnit.CBM.value})
    assert bbl.unit == "BBL"
    assert cbm.unit == "CBM"


# ------------------------------------------------------------------ #
# API tests                                                          #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_cargo_api_crud(client, session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    load_port = PortFactory.build()
    disch_port = PortFactory.build()
    session.add_all([voyage, load_port, disch_port])
    await session.commit()

    # Create
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/cargoes",
        json={
            "commodity": "Crude Oil",
            "quantity": 25000.0,
            "unit": "MT",
            "load_port_ref": str(load_port.id),
            "discharge_port_ref": str(disch_port.id),
            "notes": "API test",
        },
    )
    assert resp.status_code == 201
    cargo_id = resp.json()["id"]
    assert resp.json()["commodity"] == "Crude Oil"
    assert float(resp.json()["quantity"]) == pytest.approx(25000.0)
    assert resp.json()["unit"] == "MT"

    # List
    resp = await client.get(f"/api/v1/voyages/{voyage.id}/cargoes")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Get
    resp = await client.get(f"/api/v1/cargoes/{cargo_id}")
    assert resp.status_code == 200
    assert resp.json()["notes"] == "API test"

    # Update
    resp = await client.patch(f"/api/v1/cargoes/{cargo_id}", json={"quantity": 30000.0, "commodity": "Fuel Oil"})
    assert resp.status_code == 200
    assert resp.json()["commodity"] == "Fuel Oil"
    assert float(resp.json()["quantity"]) == pytest.approx(30000.0)

    # Delete
    resp = await client.delete(f"/api/v1/cargoes/{cargo_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/cargoes/{cargo_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cargo_api_invalid_commodity(client, session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/cargoes",
        json={"commodity": "Uranium", "quantity": 1.0, "unit": "MT"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_cargo_meta_endpoints(client):
    resp = await client.get("/api/v1/cargoes/meta/commodities")
    assert resp.status_code == 200
    values = resp.json()["values"]
    assert "Crude Oil" in values
    assert "Other" in values
    assert len(values) == 9

    resp = await client.get("/api/v1/cargoes/meta/units")
    assert resp.status_code == 200
    assert set(resp.json()["values"]) == {"MT", "BBL", "CBM"}
