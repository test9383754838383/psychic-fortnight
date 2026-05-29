from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.port_call.models.port_call import PortCall


class PortCallRepository(SQLAlchemyAsyncRepository[PortCall]):
    model_type = PortCall
