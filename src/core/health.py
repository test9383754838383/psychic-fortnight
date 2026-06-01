from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session

health_router = APIRouter()


@health_router.get("/health", tags=["health"])
async def get_health(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """DB ping. Unauthenticated. Used by Caddy health_checks and CI."""
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception:
        return {"status": "ok", "db": "error"}
