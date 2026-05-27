import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.modules.master_data.conftest import PortFactory


@pytest.mark.asyncio
async def test_api_create_port_happy_path(client: AsyncClient):
    payload = {
        "unlocode": "NLRTM",
        "name": "Rotterdam",
        "timezone": "Europe/Amsterdam",
        "latitude": 51.9244,
        "longitude": 4.4777,
    }
    response = await client.post("/api/v1/ports", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["unlocode"] == "NLRTM"
    assert data["country"] == "Netherlands"
    assert data["status"] == "Active"
    assert "id" in data


@pytest.mark.asyncio
async def test_api_create_port_validation_failure(client: AsyncClient):
    payload = {
        "unlocode": "NL",  # Invalid
        "name": "Rotterdam",
        "timezone": "Europe/Amsterdam",
        "latitude": 95.0,  # Invalid
        "longitude": 4.4777,
    }
    response = await client.post("/api/v1/ports", json=payload)
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_UNLOCODE"


@pytest.mark.asyncio
async def test_api_create_port_duplicate(client: AsyncClient, session: AsyncSession):
    port = PortFactory.build(unlocode="USNYC", country="United States of America")
    session.add(port)
    await session.commit()

    payload = {
        "unlocode": "USNYC",
        "name": "New York",
        "timezone": "America/New_York",
        "latitude": 40.7128,
        "longitude": -74.0060,
    }
    response = await client.post("/api/v1/ports", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_PORT_UNLOCODE"


@pytest.mark.asyncio
async def test_api_get_port(client: AsyncClient, session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM")
    session.add(port)
    await session.commit()

    response = await client.get(f"/api/v1/ports/{port.id}")
    assert response.status_code == 200
    assert response.json()["unlocode"] == "NLRTM"


@pytest.mark.asyncio
async def test_api_get_port_not_found(client: AsyncClient):
    response = await client.get(f"/api/v1/ports/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["code"] == "PORT_NOT_FOUND"


@pytest.mark.asyncio
async def test_api_list_ports(client: AsyncClient, session: AsyncSession):
    p1 = PortFactory.build(unlocode="NLRTM", status="Active")
    p2 = PortFactory.build(unlocode="USNYC", status="Inactive")
    session.add_all([p1, p2])
    await session.commit()

    response = await client.get("/api/v1/ports")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_api_update_port(client: AsyncClient, session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM", name="Old Port")
    session.add(port)
    await session.commit()

    payload = {"name": "New Port"}
    response = await client.patch(f"/api/v1/ports/{port.id}", json=payload)
    assert response.status_code == 200
    assert response.json()["name"] == "New Port"


@pytest.mark.asyncio
async def test_api_update_port_all_fields(client: AsyncClient, session: AsyncSession):
    port = PortFactory.build(
        unlocode="NLRTM", name="Old Port", latitude=10.0, longitude=10.0
    )
    session.add(port)
    await session.commit()

    payload = {
        "unlocode": "USNYC",
        "name": "New York",
        "timezone": "America/New_York",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "distance_table_ref": "REF-123",
    }
    response = await client.patch(f"/api/v1/ports/{port.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["unlocode"] == "USNYC"
    assert data["name"] == "New York"
    assert data["timezone"] == "America/New_York"
    assert data["latitude"] == 40.7128
    assert data["longitude"] == -74.0060
    assert data["distance_table_ref"] == "REF-123"


@pytest.mark.asyncio
async def test_api_deactivate_port(client: AsyncClient, session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM", status="Active")
    session.add(port)
    await session.commit()

    response = await client.post(f"/api/v1/ports/{port.id}/deactivate")
    assert response.status_code == 200
    assert response.json()["status"] == "Inactive"
