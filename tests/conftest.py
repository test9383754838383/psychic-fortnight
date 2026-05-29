import asyncio
import os
from typing import AsyncGenerator, Generator

os.environ["TESTING"] = "True"

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import event
from sqlalchemy.engine import Engine
from argon2 import PasswordHasher
import src.modules.auth.services.auth_service

from src.app import create_app
from src.dependencies import get_db_session


@pytest.fixture(scope="session", autouse=True)
def fast_argon2():
    """Override Argon2 parameters for faster tests."""
    fast_ph = PasswordHasher(time_cost=1, memory_cost=256, parallelism=1)
    src.modules.auth.services.auth_service.ph = fast_ph
    yield fast_ph


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    # Enable foreign key support in SQLite
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    import os
    import tempfile

    # Create a temporary file for the SQLite database
    fd, db_path = tempfile.mkstemp(suffix=".db", prefix="test_")
    os.close(fd)

    database_url = f"sqlite+aiosqlite:///{db_path}"
    engine = create_async_engine(database_url, echo=False)

    # Run migrations using Alembic
    def run_alembic_upgrade(connection):
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", database_url)
        alembic_cfg.attributes["connection"] = connection
        command.upgrade(alembic_cfg, "head")

    async with engine.begin() as conn:
        await conn.run_sync(run_alembic_upgrade)

    yield engine
    await engine.dispose()

    if os.path.exists(db_path):
        os.remove(db_path)


@pytest_asyncio.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    connection = await engine.connect()
    transaction = await connection.begin()
    session_factory = async_sessionmaker(connection, expire_on_commit=False)
    session = session_factory()

    yield session

    await session.close()
    await transaction.rollback()
    await connection.close()


@pytest_asyncio.fixture
async def app(session: AsyncSession) -> FastAPI:
    from src.config import settings

    settings.TESTING = True
    application = create_app()

    async def override_get_db_session():
        yield session

    application.dependency_overrides[get_db_session] = override_get_db_session
    return application


@pytest_asyncio.fixture
async def client(
    app: FastAPI, session: AsyncSession
) -> AsyncGenerator[AsyncClient, None]:
    # Create a test user and session so existing tests continue to work
    from src.modules.auth.services.auth_service import AuthService
    from src.modules.auth.models.role import Role
    from sqlalchemy import select

    # Ensure some basic roles exist for tests that might check them
    for role_name in ["Admin", "Operations", "Viewer"]:
        stmt = select(Role).where(Role.name == role_name)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            session.add(Role(name=role_name))
    await session.commit()

    auth_service = AuthService(session)
    user = await auth_service.create_user("testuser", "password", [])
    session_record = await auth_service.create_session(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        cookies={"session_id": session_record.session_id},
    ) as client:
        yield client


@pytest_asyncio.fixture
async def unauthenticated_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
