from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.voyage_spine.models.voyage import Voyage


class VoyageRepository(SQLAlchemyAsyncRepository[Voyage]):
    model_type = Voyage
