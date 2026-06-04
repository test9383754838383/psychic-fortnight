"""GET /api/v1/users — Operations-accessible user list (not Admin-only).

Behavior:
- Returns [{id, username}] — no hashed_password
- Requires authenticated session
- Requires Operations or Admin role
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_list_users_requires_auth(unauthenticated_client: AsyncClient) -> None:
    res = await unauthenticated_client.get("/api/v1/users")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_users_requires_operations_role(
    client: AsyncClient, session: AsyncSession
) -> None:
    auth_service = AuthService(session)
    await auth_service.create_user("viewer_u", "pass", ["Viewer"])
    await client.post("/api/v1/auth/login", json={"username": "viewer_u", "password": "pass"})

    res = await client.get("/api/v1/users")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_list_users_accessible_by_operations(
    client: AsyncClient, session: AsyncSession
) -> None:
    auth_service = AuthService(session)
    ops_user = await auth_service.create_user("ops_list_u", "pass", ["Operations"])
    await client.post(
        "/api/v1/auth/login", json={"username": "ops_list_u", "password": "pass"}
    )

    res = await client.get("/api/v1/users")
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    ids = [u["id"] for u in body]
    assert str(ops_user.id) in ids
    # No hashed_password exposed
    for user in body:
        assert "hashed_password" not in user
        assert "id" in user
        assert "username" in user


@pytest.mark.asyncio
async def test_list_users_accessible_by_admin(
    client: AsyncClient, session: AsyncSession
) -> None:
    auth_service = AuthService(session)
    await auth_service.create_user("admin_list_u", "pass", ["Admin"])
    await client.post(
        "/api/v1/auth/login", json={"username": "admin_list_u", "password": "pass"}
    )

    res = await client.get("/api/v1/users")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
