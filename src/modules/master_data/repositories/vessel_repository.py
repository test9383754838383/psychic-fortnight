from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.master_data.models.vessel import Vessel


class VesselRepository(SQLAlchemyAsyncRepository[Vessel]):
    model_type = Vessel
