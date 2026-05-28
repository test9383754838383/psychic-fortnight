import pytest
from datetime import datetime, timedelta, timezone
from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.session import Session


@pytest.mark.asyncio
async def test_session_purge(session, user_factory, session_factory):
    auth_service = AuthService(session)
    user = user_factory.build()
    session.add(user)
    await session.commit()

    now = datetime.now(timezone.utc)
    # Valid
    s1 = session_factory.build(
        session_id="valid",
        user_id=user.id,
        expires_at=now + timedelta(hours=1),
        last_seen_at=now,
    )
    # Expired
    s2 = session_factory.build(
        session_id="expired",
        user_id=user.id,
        expires_at=now - timedelta(seconds=1),
        last_seen_at=now,
    )

    session.add_all([s1, s2])
    await session.commit()

    count = await auth_service.purge_expired_sessions()
    assert count == 1

    from sqlalchemy import select

    result = await session.execute(select(Session).where(Session.session_id == "valid"))
    assert result.scalar_one_or_none() is not None

    result = await session.execute(
        select(Session).where(Session.session_id == "expired")
    )
    assert result.scalar_one_or_none() is None
