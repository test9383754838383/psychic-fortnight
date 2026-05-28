import pytest
from src.modules.auth.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_require_role_success(client, session):
    auth_service = AuthService(session)
    # Roles are seeded, but let's be sure Operations exists
    from src.modules.auth.models.role import Role
    from sqlalchemy import select

    stmt = select(Role).where(Role.name == "Operations")
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        session.add(Role(name="Operations"))
        await session.commit()

    await auth_service.create_user("ops_user", "password", ["Operations"])

    await client.post(
        "/api/v1/auth/login", json={"username": "ops_user", "password": "password"}
    )

    # We'll use an existing endpoint that requires some role if possible,
    # but currently none of them use require_role yet except admin.
    # So we'll just test against an admin endpoint with Admin role.

    await auth_service.create_user("admin_user", "password", ["Admin"])
    await client.post(
        "/api/v1/auth/login", json={"username": "admin_user", "password": "password"}
    )

    response = await client.get("/api/v1/admin/users")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_require_role_unauthorized(unauthenticated_client):
    # No login
    response = await unauthenticated_client.get("/api/v1/admin/users")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_require_role_forbidden(client, session):
    auth_service = AuthService(session)
    await auth_service.create_user("viewer_user", "password", ["Viewer"])

    await client.post(
        "/api/v1/auth/login", json={"username": "viewer_user", "password": "password"}
    )

    # Try to access admin endpoint
    response = await client.get("/api/v1/admin/users")
    assert response.status_code == 403
