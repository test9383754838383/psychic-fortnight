import pytest
import uuid
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.models.voyage import VoyageStatus
from tests.modules.master_data.conftest import VesselFactory, PortFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_api_create_voyage_happy_path(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    payload = {
        "voyage_no": "VOY-API-101",
        "vessel_ref": str(vessel.id),
        "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        "terms": {
            "charterer_name": "Cargill",
            "cp_type": "VC",
        },
    }

    res = await client.post("/api/v1/voyages", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["voyage_no"] == "VOY-API-101"
    assert data["status"] == "Scheduled"
    assert data["terms"]["charterer_name"] == "Cargill"
    assert data["terms"]["cp_type"] == "VC"


@pytest.mark.asyncio
async def test_api_create_voyage_invalid_cp_type(
    client: AsyncClient, session: AsyncSession
):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    payload = {
        "voyage_no": "VOY-API-102",
        "vessel_ref": str(vessel.id),
        "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        "terms": {
            "charterer_name": "Cargill",
            "cp_type": "INVALID",
        },
    }

    res = await client.post("/api/v1/voyages", json=payload)
    assert res.status_code == 422
    assert res.json()["code"] == "INVALID_CP_TYPE"


@pytest.mark.asyncio
async def test_api_list_voyages(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id, voyage_no="LIST-VOY")
    session.add(voyage)
    await session.commit()

    res = await client.get("/api/v1/voyages")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any(v["voyage_no"] == "LIST-VOY" for v in data)


@pytest.mark.asyncio
async def test_api_get_voyage_not_found(client: AsyncClient):
    res = await client.get(f"/api/v1/voyages/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["code"] == "VOYAGE_NOT_FOUND"


@pytest.mark.asyncio
async def test_api_transition_status(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.SCHEDULED.value
    )
    session.add(voyage)
    await session.commit()

    # Scheduled -> Commenced
    res = await client.post(
        f"/api/v1/voyages/{voyage.id}/transition", json={"to": "Commenced"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Commenced"


@pytest.mark.asyncio
async def test_api_itinerary_crud(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    # 1. Post itinerary line
    line_payload = {
        "port_ref": str(port.id),
        "port_function": "Load",
        "planned_eta": datetime.now(timezone.utc).isoformat(),
        "planned_etd": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    }
    res = await client.post(f"/api/v1/voyages/{voyage.id}/itinerary", json=line_payload)
    assert res.status_code == 201
    line_id = res.json()["id"]

    # 2. Get itinerary lines
    res = await client.get(f"/api/v1/voyages/{voyage.id}/itinerary")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 3. Patch itinerary line
    res = await client.patch(
        f"/api/v1/voyages/{voyage.id}/itinerary/{line_id}",
        json={"port_function": "Discharge"},
    )
    assert res.status_code == 200
    assert res.json()["port_function"] == "Discharge"

    # 4. Delete itinerary line
    res = await client.delete(f"/api/v1/voyages/{voyage.id}/itinerary/{line_id}")
    assert res.status_code == 204
