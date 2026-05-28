import pytest
from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.role import Role
from sqlalchemy import select


@pytest.mark.asyncio
async def test_login_success(client, session):
    # Ensure Admin role exists
    stmt = select(Role).where(Role.name == "Admin")
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        session.add(Role(name="Admin"))
        await session.commit()

    auth_service = AuthService(session)
    await auth_service.create_user("apiuser", "password123", ["Admin"])

    response = await client.post(
        "/api/v1/auth/login", json={"username": "apiuser", "password": "password123"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "apiuser"
    assert "Admin" in data["roles"]
    assert "session_id" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    response = await client.post(
        "/api/v1/auth/login", json={"username": "wrong", "password": "wrong"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint(client, session):
    auth_service = AuthService(session)
    await auth_service.create_user("meuser", "password123", [])

    # Login to get cookie
    login_resp = await client.post(
        "/api/v1/auth/login", json={"username": "meuser", "password": "password123"}
    )
    assert login_resp.status_code == 200

    # Call /me
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["username"] == "meuser"


@pytest.mark.asyncio
async def test_logout(unauthenticated_client, session):
    auth_service = AuthService(session)
    await auth_service.create_user("logoutuser", "password123", [])

    # Login
    login_resp = await unauthenticated_client.post(
        "/api/v1/auth/login", json={"username": "logoutuser", "password": "password123"}
    )
    assert login_resp.status_code == 200

    # Logout
    response = await unauthenticated_client.post("/api/v1/auth/logout")
    assert response.status_code == 200

    # Assert cookie is cleared with the correct path
    set_cookie_header = response.headers.get("set-cookie", "")
    assert 'session_id=""' in set_cookie_header or "session_id=;" in set_cookie_header
    assert (
        "Path=/;" in set_cookie_header
        or "Path=/" == set_cookie_header.split("Path=")[-1].strip()
    )

    # Verify /me fails
    me_resp = await unauthenticated_client.get("/api/v1/auth/me")
    assert me_resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_list_users(client, session):
    # Ensure Admin role exists
    stmt = select(Role).where(Role.name == "Admin")
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        session.add(Role(name="Admin"))
        await session.commit()

    auth_service = AuthService(session)
    await auth_service.create_user("admin", "adminpw", ["Admin"])

    # Login as admin
    login_resp = await client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "adminpw"}
    )
    assert login_resp.status_code == 200

    response = await client.get("/api/v1/admin/users")
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 1


@pytest.mark.asyncio
async def test_admin_create_user(client, session):
    # Ensure Admin role exists
    stmt = select(Role).where(Role.name == "Admin")
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        session.add(Role(name="Admin"))
        await session.commit()

    auth_service = AuthService(session)
    await auth_service.create_user("admin2", "adminpw", ["Admin"])

    login_resp = await client.post(
        "/api/v1/auth/login", json={"username": "admin2", "password": "adminpw"}
    )
    assert login_resp.status_code == 200

    response = await client.post(
        "/api/v1/admin/users",
        json={
            "username": "newuser",
            "password": "newpassword",
            "role_names": ["Admin"],
        },
    )
    assert response.status_code == 201
    assert response.json()["username"] == "newuser"


@pytest.mark.asyncio
async def test_admin_update_user(client, session):
    # Ensure Admin role exists
    stmt = select(Role).where(Role.name == "Admin")
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        session.add(Role(name="Admin"))
        await session.commit()

    auth_service = AuthService(session)
    user = await auth_service.create_user("update-me", "password", [])

    # Login as admin
    await auth_service.create_user("admin-upd", "adminpw", ["Admin"])
    await client.post(
        "/api/v1/auth/login", json={"username": "admin-upd", "password": "adminpw"}
    )

    response = await client.patch(
        f"/api/v1/admin/users/{user.id}",
        json={"username": "updated-name", "is_active": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "updated-name"
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_rbac_forbidden(client, session):
    auth_service = AuthService(session)
    await auth_service.create_user("viewer", "pw", [])

    login_resp = await client.post(
        "/api/v1/auth/login", json={"username": "viewer", "password": "pw"}
    )
    assert login_resp.status_code == 200

    # Try to access admin endpoint
    response = await client.get("/api/v1/admin/users")
    assert response.status_code == 403
