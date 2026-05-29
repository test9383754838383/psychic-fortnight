import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.voyage_spine.api.voyages import router
from src.modules.voyage_spine.api.schedule_routes import router as schedule_router
from src.modules.voyage_spine.api.workspace_routes import router as workspace_router
from src.modules.voyage_spine.models.voyage import VoyageStatus
from src.modules.voyage_spine.models.itinerary_line import PortFunction
from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.exceptions import (
    VoyageNotFoundError,
    ItineraryLineNotFoundError,
)

__all__ = [
    "router",
    "schedule_router",
    "workspace_router",
    "VoyageStatus",
    "PortFunction",
    "VoyageNotFoundError",
    "validate_voyage_exists",
    "validate_itinerary_line_belongs_to_voyage",
]


async def validate_voyage_exists(session: AsyncSession, voyage_id: uuid.UUID) -> None:
    """Check if voyage exists."""
    service = VoyageService(session)
    await service.get(voyage_id)


async def validate_itinerary_line_belongs_to_voyage(
    session: AsyncSession, itinerary_line_id: uuid.UUID, voyage_id: uuid.UUID
) -> None:
    """Check if itinerary line exists and belongs to the voyage."""
    service = VoyageService(session)
    line = await service.itinerary_repository.get_one_or_none(id=itinerary_line_id)
    if not line:
        raise ItineraryLineNotFoundError(str(itinerary_line_id))
    if line.voyage_id != voyage_id:
        raise ItineraryLineNotFoundError(
            f"Line {itinerary_line_id} does not belong to voyage {voyage_id}"
        )
