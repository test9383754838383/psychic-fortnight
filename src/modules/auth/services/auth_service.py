import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from src.config import settings
from src.modules.auth.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    RoleNotFoundError,
    SessionExpiredError,
    SessionNotFoundError,
    UsernameAlreadyExistsError,
)
from src.modules.auth.models.user import User, UserRole
from src.modules.auth.models.role import Role
from src.modules.auth.models.session import Session
from src.modules.auth.repositories.user_repository import UserRepository
from src.modules.auth.repositories.session_repository import SessionRepository


ph = PasswordHasher(
    time_cost=settings.ARGON2_TIME_COST,
    memory_cost=settings.ARGON2_MEMORY_COST,
    parallelism=settings.ARGON2_PARALLELISM,
)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.user_repo = UserRepository(session=session)
        self.session_repo = SessionRepository(session=session)
        self.session = session

    async def create_user(
        self, username: str, password: str, role_names: List[str]
    ) -> User:
        username = username.lower()
        existing = await self.user_repo.get_one_or_none(username=username)
        if existing:
            raise UsernameAlreadyExistsError(username)

        hashed_password = await run_in_threadpool(ph.hash, password)

        user = User(username=username, hashed_password=hashed_password)

        for role_name in role_names:
            stmt = select(Role).where(Role.name == role_name)
            result = await self.session.execute(stmt)
            role = result.scalar_one_or_none()
            if not role:
                raise RoleNotFoundError(role_name)
            user.user_roles.append(UserRole(role=role))

        await self.user_repo.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def authenticate(self, username: str, password: str) -> User:
        username = username.lower()
        user = await self.user_repo.get_one_or_none(username=username)
        if not user:
            # Hash anyway to prevent timing attacks
            await run_in_threadpool(ph.hash, "dummy-password")
            raise InvalidCredentialsError()

        if not user.is_active:
            raise InactiveUserError()

        try:
            await run_in_threadpool(ph.verify, user.hashed_password, password)
        except VerifyMismatchError:
            raise InvalidCredentialsError()

        return user

    async def create_session(self, user_id: uuid.UUID) -> Session:
        session_id = secrets.token_hex(32)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS)

        session = Session(
            session_id=session_id,
            user_id=user_id,
            created_at=now,
            last_seen_at=now,
            expires_at=expires_at,
        )
        await self.session_repo.add(session)
        await self.session.commit()
        return session

    async def validate_session(self, session_id: str) -> User:
        now = datetime.now(timezone.utc)

        stmt_session = select(Session).where(Session.session_id == session_id)
        result_session = await self.session.execute(stmt_session)
        session_record = result_session.scalar_one_or_none()

        if not session_record:
            raise SessionNotFoundError()

        # Absolute TTL check
        if now > session_record.expires_at:
            await self.delete_session(session_id)
            raise SessionExpiredError()

        # Idle TTL check
        idle_limit = session_record.last_seen_at + timedelta(
            minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES
        )
        if now > idle_limit:
            await self.delete_session(session_id)
            raise SessionExpiredError()

        # Update last_seen_at
        session_record.last_seen_at = now
        await self.session.commit()

        # Get user with roles
        from sqlalchemy.orm import selectinload

        stmt_user = (
            select(User)
            .where(User.id == session_record.user_id)
            .options(selectinload(User.user_roles).joinedload(UserRole.role))
        )
        result_user = await self.session.execute(stmt_user)
        user = result_user.scalar_one_or_none()

        if not user or not user.is_active:
            raise SessionNotFoundError()

        return user

    async def delete_session(self, session_id: str) -> None:
        await self.session_repo.delete(session_id)
        await self.session.commit()

    async def purge_expired_sessions(self) -> int:
        now = datetime.now(timezone.utc)
        idle_threshold = now - timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)

        stmt = delete(Session).where(
            (Session.expires_at < now) | (Session.last_seen_at < idle_threshold)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return int(result.rowcount) if hasattr(result, "rowcount") else 0
