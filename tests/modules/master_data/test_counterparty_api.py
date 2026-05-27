import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.modules.master_data.conftest import CounterpartyFactory


@pytest.mark.asyncio
async def test_api_create_counterparty_happy_path(client: AsyncClient):
    payload = {
        "code": "CP001",
        "name": "General Supplier Corp",
        "contacts": [
            {
                "name": "Alice Smith",
                "email": "alice@supplier.com",
                "phone": "+1234567890",
                "role_hint": "Sales Lead",
            }
        ],
    }
    response = await client.post("/api/v1/counterparties", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "CP001"
    assert len(data["contacts"]) == 1
    assert data["contacts"][0]["name"] == "Alice Smith"
    assert data["status"] == "Active"


@pytest.mark.asyncio
async def test_api_create_counterparty_duplicate(
    client: AsyncClient, session: AsyncSession
):
    cp = CounterpartyFactory.build(code="DUP-CP")
    session.add(cp)
    await session.commit()

    payload = {
        "code": "DUP-CP",
        "name": "Another CP",
        "contacts": [],
    }
    response = await client.post("/api/v1/counterparties", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_COUNTERPARTY_CODE"


@pytest.mark.asyncio
async def test_api_get_counterparty(client: AsyncClient, session: AsyncSession):
    cp = CounterpartyFactory.build(code="GET-CP")
    session.add(cp)
    await session.commit()

    response = await client.get(f"/api/v1/counterparties/{cp.id}")
    assert response.status_code == 200
    assert response.json()["code"] == "GET-CP"


@pytest.mark.asyncio
async def test_api_get_counterparty_not_found(client: AsyncClient):
    response = await client.get(f"/api/v1/counterparties/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["code"] == "COUNTERPARTY_NOT_FOUND"


@pytest.mark.asyncio
async def test_api_list_counterparties(client: AsyncClient, session: AsyncSession):
    c1 = CounterpartyFactory.build(code="CP1")
    c2 = CounterpartyFactory.build(code="CP2")
    session.add_all([c1, c2])
    await session.commit()

    response = await client.get("/api/v1/counterparties")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_api_update_counterparty(client: AsyncClient, session: AsyncSession):
    cp = CounterpartyFactory.build(code="CP-OLD", name="Old CP")
    session.add(cp)
    await session.commit()

    payload = {"name": "New CP"}
    response = await client.patch(f"/api/v1/counterparties/{cp.id}", json=payload)
    assert response.status_code == 200
    assert response.json()["name"] == "New CP"


@pytest.mark.asyncio
async def test_api_update_counterparty_all_fields(
    client: AsyncClient, session: AsyncSession
):
    cp = CounterpartyFactory.build(code="CP-OLD", name="Old CP")
    session.add(cp)
    await session.commit()

    payload = {
        "code": "CP-NEW",
        "name": "New CP Name",
        "contacts": [
            {"name": "Sales Team", "email": "sales@agency.com", "phone": "555-555"}
        ],
    }
    response = await client.patch(f"/api/v1/counterparties/{cp.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "CP-NEW"
    assert data["name"] == "New CP Name"
    assert len(data["contacts"]) == 1
    assert data["contacts"][0]["name"] == "Sales Team"


@pytest.mark.asyncio
async def test_api_deactivate_counterparty(client: AsyncClient, session: AsyncSession):
    cp = CounterpartyFactory.build(status="Active")
    session.add(cp)
    await session.commit()

    response = await client.post(f"/api/v1/counterparties/{cp.id}/deactivate")
    assert response.status_code == 200
    assert response.json()["status"] == "Inactive"


@pytest.mark.asyncio
async def test_api_create_counterparty_empty_contact_field(client: AsyncClient):
    payload = {
        "code": "CP002",
        "name": "Bad Contact Corp",
        "contacts": [
            {
                "name": "",  # Invalid: min_length=1
                "email": "test@test.com",
                "phone": "12345",
            }
        ],
    }
    response = await client.post("/api/v1/counterparties", json=payload)
    # Pydantic validation handles this at the API layer, giving a 422 Unprocessable Entity
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_attach_role_invalid_role(client: AsyncClient, session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    payload = {"role": "SuperHero"}
    response = await client.post(f"/api/v1/counterparties/{cp.id}/roles", json=payload)
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_COUNTERPARTY_ROLE"
