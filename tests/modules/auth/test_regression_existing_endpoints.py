import pytest


@pytest.mark.asyncio
async def test_vessels_regression(unauthenticated_client, client):
    # No login -> 401
    response = await unauthenticated_client.get("/api/v1/vessels")
    assert response.status_code == 401

    # Login success (via client fixture) -> 200
    response = await client.get("/api/v1/vessels")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_ports_regression(unauthenticated_client, client):
    response = await unauthenticated_client.get("/api/v1/ports")
    assert response.status_code == 401

    response = await client.get("/api/v1/ports")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_counterparties_regression(unauthenticated_client, client):
    response = await unauthenticated_client.get("/api/v1/counterparties")
    assert response.status_code == 401

    response = await client.get("/api/v1/counterparties")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_voyages_regression(unauthenticated_client, client):
    response = await unauthenticated_client.get("/api/v1/voyages")
    assert response.status_code == 401

    response = await client.get("/api/v1/voyages")
    assert response.status_code == 200
