"""Tests for GET /health endpoint."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_ok(unauthenticated_client: AsyncClient) -> None:
    """GET /health returns 200 with expected JSON body. No auth required."""
    response = await unauthenticated_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"


@pytest.mark.asyncio
async def test_health_no_auth_required(unauthenticated_client: AsyncClient) -> None:
    """Health endpoint is accessible without any session cookie."""
    response = await unauthenticated_client.get("/health")
    assert response.status_code == 200
