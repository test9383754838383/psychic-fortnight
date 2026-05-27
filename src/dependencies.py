from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from src.config import settings

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user_stub() -> str:
    """Stub for auth block. Returns a fixed test user identity."""
    return "test-user-id"


# API endpoints should depend on this.
# The auth block will replace this alias with the real implementation.
get_current_user = get_current_user_stub
