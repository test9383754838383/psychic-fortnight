import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.modules.master_data.conftest import VesselFactory


@pytest.mark.asyncio
async def test_get_schedule_api_200(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    date_from = "2026-06-01"
    date_to = "2026-06-30"

    response = await client.get(
        f"/api/v1/schedule?date_from={date_from}&date_to={date_to}"
    )
    assert response.status_code == 200
    data = response.json()
    assert "vessels" in data
    assert len(data["vessels"]) == 1
    assert data["vessels"][0]["vessel_id"] == str(vessel.id)


@pytest.mark.asyncio
async def test_get_schedule_api_422_invalid_dates(client: AsyncClient):
    # Missing date_from/date_to
    response = await client.get("/api/v1/schedule")
    assert response.status_code == 422

    # Invalid date format (not ISO date)
    response = await client.get(
        "/api/v1/schedule?date_from=2026-06-01T12:00:00Z&date_to=2026-06-30"
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_schedule_api_422_oversized_window(client: AsyncClient):
    date_from = "2026-06-01"
    date_to = "2027-07-01"  # > 365 days

    response = await client.get(
        f"/api/v1/schedule?date_from={date_from}&date_to={date_to}"
    )
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "SCHEDULE_WINDOW_TOO_LARGE"


@pytest.mark.asyncio
async def test_get_schedule_api_401_unauthenticated(
    unauthenticated_client: AsyncClient,
):
    date_from = "2026-06-01"
    date_to = "2026-06-30"
    response = await unauthenticated_client.get(
        f"/api/v1/schedule?date_from={date_from}&date_to={date_to}"
    )
    assert response.status_code == 401
