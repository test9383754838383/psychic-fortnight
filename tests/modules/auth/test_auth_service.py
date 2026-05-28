import pytest
from datetime import datetime, timedelta, timezone
from src.modules.auth.services.auth_service import AuthService, ph
from src.modules.auth.exceptions import (
    InvalidCredentialsError,
    InactiveUserError,
    SessionExpiredError,
    SessionNotFoundError,
)
from src.modules.auth.models.role import Role


@pytest.mark.asyncio
async def test_create_user_happy_path(session, role_factory):
    # Roles are seeded in migration, but let's ensure Admin exists
    from sqlalchemy import select

    stmt = select(Role).where(Role.name == "Admin")
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        admin_role = Role(name="Admin")
        session.add(admin_role)
        await session.commit()

    service = AuthService(session)
    user = await service.create_user("testuser", "password123", ["Admin"])

    assert user.username == "testuser"
    assert user.is_active is True
    assert len(user.user_roles) == 1
    assert user.user_roles[0].role.name == "Admin"
    assert ph.verify(user.hashed_password, "password123")


@pytest.mark.asyncio
async def test_authenticate_happy_path(session, user_factory):
    hashed = ph.hash("secret")
    user = user_factory.build(username="authuser", hashed_password=hashed)
    session.add(user)
    await session.commit()

    service = AuthService(session)
    authenticated_user = await service.authenticate("authuser", "secret")
    assert authenticated_user.id == user.id


@pytest.mark.asyncio
async def test_authenticate_case_insensitive(session, user_factory):
    hashed = ph.hash("secret")
    user = user_factory.build(username="caseuser", hashed_password=hashed)
    session.add(user)
    await session.commit()

    service = AuthService(session)
    authenticated_user = await service.authenticate("CaseUser", "secret")
    assert authenticated_user.id == user.id


@pytest.mark.asyncio
async def test_authenticate_wrong_password(session, user_factory):
    hashed = ph.hash("secret")
    user = user_factory.build(username="wrongpw", hashed_password=hashed)
    session.add(user)
    await session.commit()

    service = AuthService(session)
    with pytest.raises(InvalidCredentialsError):
        await service.authenticate("wrongpw", "wrong")


@pytest.mark.asyncio
async def test_authenticate_nonexistent_user(session):
    service = AuthService(session)
    with pytest.raises(InvalidCredentialsError):
        await service.authenticate("nonexistent", "password")


@pytest.mark.asyncio
async def test_authenticate_inactive_user(session, user_factory):
    hashed = ph.hash("secret")
    user = user_factory.build(
        username="inactive", hashed_password=hashed, is_active=False
    )
    session.add(user)
    await session.commit()

    service = AuthService(session)
    with pytest.raises(InactiveUserError):
        await service.authenticate("inactive", "secret")


@pytest.mark.asyncio
async def test_session_lifecycle(session, user_factory):
    user = user_factory.build()
    session.add(user)
    await session.commit()

    service = AuthService(session)
    s = await service.create_session(user.id)
    assert s.session_id is not None

    # Validate
    validated_user = await service.validate_session(s.session_id)
    assert validated_user.id == user.id

    # Delete
    await service.delete_session(s.session_id)
    with pytest.raises(SessionNotFoundError):
        await service.validate_session(s.session_id)


@pytest.mark.asyncio
async def test_session_expired_absolute(session, user_factory, session_factory):
    user = user_factory.build()
    session.add(user)
    await session.commit()

    now = datetime.now(timezone.utc)
    expired_at = now - timedelta(seconds=1)
    s = session_factory.build(
        user_id=user.id,
        created_at=now - timedelta(hours=9),
        expires_at=expired_at,
        last_seen_at=now,
    )
    session.add(s)
    await session.commit()

    service = AuthService(session)
    with pytest.raises(SessionExpiredError):
        await service.validate_session(s.session_id)


@pytest.mark.asyncio
async def test_session_expired_idle(session, user_factory, session_factory):
    user = user_factory.build()
    session.add(user)
    await session.commit()

    now = datetime.now(timezone.utc)
    s = session_factory.build(
        user_id=user.id,
        created_at=now,
        expires_at=now + timedelta(hours=8),
        last_seen_at=now - timedelta(minutes=31),
    )
    session.add(s)
    await session.commit()

    service = AuthService(session)
    with pytest.raises(SessionExpiredError):
        await service.validate_session(s.session_id)


@pytest.mark.asyncio
async def test_purge_expired_sessions(session, user_factory, session_factory):
    user = user_factory.build()
    session.add(user)
    await session.commit()

    now = datetime.now(timezone.utc)
    # Valid
    s1 = session_factory.build(
        session_id="s1",
        user_id=user.id,
        expires_at=now + timedelta(hours=1),
        last_seen_at=now,
    )
    # Expired absolute
    s2 = session_factory.build(
        session_id="s2",
        user_id=user.id,
        expires_at=now - timedelta(seconds=1),
        last_seen_at=now,
    )
    # Expired idle
    s3 = session_factory.build(
        session_id="s3",
        user_id=user.id,
        expires_at=now + timedelta(hours=1),
        last_seen_at=now - timedelta(minutes=31),
    )

    session.add_all([s1, s2, s3])
    await session.commit()

    service = AuthService(session)
    purged_count = await service.purge_expired_sessions()
    assert purged_count == 2

    from sqlalchemy import select
    from src.modules.auth.models.session import Session as SessionModel

    result = await session.execute(select(SessionModel))
    remaining = result.scalars().all()
    assert len(remaining) == 1
    assert remaining[0].session_id == "s1"
