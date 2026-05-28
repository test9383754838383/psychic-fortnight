import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.modules.master_data.conftest import VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_get_workspace_api_200(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id, voyage_no="VOY-123")
    session.add(voyage)
    await session.commit()

    response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    data = response.json()
    assert data["voyage_id"] == str(voyage.id)
    assert data["voyage_no"] == "VOY-123"
    assert data["vessel"]["id"] == str(vessel.id)


@pytest.mark.asyncio
async def test_get_workspace_api_404(client: AsyncClient):
    response = await client.get(f"/api/v1/voyages/{uuid.uuid4()}/workspace")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_workspace_api_401_unauthenticated(
    unauthenticated_client: AsyncClient,
):
    response = await unauthenticated_client.get(
        f"/api/v1/voyages/{uuid.uuid4()}/workspace"
    )
    assert response.status_code == 401
