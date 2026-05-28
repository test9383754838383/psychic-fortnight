from typing import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore
from apscheduler.triggers.interval import IntervalTrigger  # type: ignore

from src.config import settings
from src.exceptions import DomainError, domain_error_handler
from src.modules.master_data.api import router as master_data_router
from src.modules.voyage_spine import router as voyage_spine_router
from src.modules.auth.api import router as auth_router, admin_router
from src.modules.auth.api.auth import limiter
from src.modules.auth.services.auth_service import AuthService
from src.dependencies import AsyncSessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    scheduler = AsyncIOScheduler()

    async def purge_sessions_task() -> None:
        async with AsyncSessionLocal() as session:
            auth_service = AuthService(session)
            await auth_service.purge_expired_sessions()

    scheduler.add_job(
        purge_sessions_task,
        IntervalTrigger(hours=settings.SESSION_PURGE_INTERVAL_HOURS),
        id="purge_sessions",
        replace_existing=True,
    )
    scheduler.start()
    app.state.scheduler = scheduler

    yield

    # Shutdown
    scheduler.shutdown()


def create_app() -> FastAPI:
    app = FastAPI(title="ERP Operations", lifespan=lifespan)

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

    app.add_exception_handler(DomainError, domain_error_handler)

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(admin_router, prefix="/api/v1")
    app.include_router(master_data_router, prefix="/api/v1")
    app.include_router(voyage_spine_router, prefix="/api/v1/voyages", tags=["voyages"])

    return app
