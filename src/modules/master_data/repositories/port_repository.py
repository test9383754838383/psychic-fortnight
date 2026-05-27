from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.master_data.models.port import Port


class PortRepository(SQLAlchemyAsyncRepository[Port]):
    model_type = Port
