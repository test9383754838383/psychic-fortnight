from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.voyage_spine.models.itinerary_line import ItineraryLine


class ItineraryLineRepository(SQLAlchemyAsyncRepository[ItineraryLine]):
    model_type = ItineraryLine
