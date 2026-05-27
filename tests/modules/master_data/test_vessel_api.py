import pytest
import uuid
from httpx import AsyncClient
from tests.modules.master_data.conftest import VesselFactory

@pytest.mark.asyncio
async def test_api_create_vessel(client: AsyncClient):
    payload = {
        "code": "API-001",
        "name": "API Vessel",
        "imo": "1111111",
        "vessel_type": "Tanker",
        "flag": "LR"
    }
    response = await client.post("/api/v1/vessels", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "API-001"
    assert "id" in data

@pytest.mark.asyncio
async def test_api_create_vessel_duplicate(client: AsyncClient, session):
    vessel = VesselFactory.build(code="DUP-API")
    session.add(vessel)
    await session.commit()
    
    payload = {
        "code": "DUP-API",
        "name": "Duplicate",
        "imo": "2222222",
        "vessel_type": "Tanker",
        "flag": "LR"
    }
    response = await client.post("/api/v1/vessels", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_VESSEL_CODE"

@pytest.mark.asyncio
async def test_api_get_vessel_not_found(client: AsyncClient):
    response = await client.get(f"/api/v1/vessels/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["code"] == "VESSEL_NOT_FOUND"

@pytest.mark.asyncio
async def test_api_get_vessel(client: AsyncClient, session):
    vessel = VesselFactory.build(code="GET-API")
    session.add(vessel)
    await session.commit()
    
    response = await client.get(f"/api/v1/vessels/{vessel.id}")
    assert response.status_code == 200
    assert response.json()["code"] == "GET-API"

@pytest.mark.asyncio
async def test_api_list_vessels(client: AsyncClient, session):
    vessel = VesselFactory.build(code="LIST-API")
    session.add(vessel)
    await session.commit()
    
    response = await client.get("/api/v1/vessels")
    assert response.status_code == 200
    assert len(response.json()) >= 1

@pytest.mark.asyncio
async def test_api_update_vessel(client: AsyncClient, session):
    vessel = VesselFactory.build(code="UPD-API", name="Old")
    session.add(vessel)
    await session.commit()
    
    response = await client.patch(f"/api/v1/vessels/{vessel.id}", json={"name": "New"})
    assert response.status_code == 200
    assert response.json()["name"] == "New"

@pytest.mark.asyncio
async def test_api_deactivate_vessel(client: AsyncClient, session):
    vessel = VesselFactory.build(code="DEA-API", status="Active")
    session.add(vessel)
    await session.commit()
    
    response = await client.post(f"/api/v1/vessels/{vessel.id}/deactivate")
    assert response.status_code == 200
    assert response.json()["status"] == "Inactive"
