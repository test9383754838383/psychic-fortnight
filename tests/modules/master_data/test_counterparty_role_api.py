import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.modules.master_data.conftest import (
    CounterpartyFactory,
    CounterpartyRoleFactory,
)


@pytest.mark.asyncio
async def test_api_attach_role_owner(client: AsyncClient, session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    payload = {"role": "Owner"}
    response = await client.post(f"/api/v1/counterparties/{cp.id}/roles", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["roles"]) == 1
    assert data["roles"][0]["role"] == "Owner"


@pytest.mark.asyncio
async def test_api_attach_role_agent_happy_path(
    client: AsyncClient, session: AsyncSession
):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    payload = {
        "role": "Agent",
        "ports_serviced": ["NLRTM"],
        "nomination_contact_email": "agent@rotterdam.com",
    }
    response = await client.post(f"/api/v1/counterparties/{cp.id}/roles", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["roles"]) == 1
    role = data["roles"][0]
    assert role["role"] == "Agent"
    assert role["ports_serviced"] == ["NLRTM"]
    assert role["nomination_contact_email"] == "agent@rotterdam.com"


@pytest.mark.asyncio
async def test_api_attach_role_agent_validation_error(
    client: AsyncClient, session: AsyncSession
):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    # Missing ports_serviced
    payload = {
        "role": "Agent",
        "nomination_contact_email": "agent@rotterdam.com",
    }
    response = await client.post(f"/api/v1/counterparties/{cp.id}/roles", json=payload)
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_AGENT_FIELDS"


@pytest.mark.asyncio
async def test_api_detach_role(client: AsyncClient, session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    role = CounterpartyRoleFactory.build(counterparty=cp, role="Owner")
    session.add(role)
    await session.commit()

    response = await client.delete(f"/api/v1/counterparties/{cp.id}/roles/Owner")
    assert response.status_code == 200
    data = response.json()
    assert len(data["roles"]) == 0
