from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.master_data.models.counterparty_role import CounterpartyRole


class CounterpartyRoleRepository(SQLAlchemyAsyncRepository[CounterpartyRole]):
    model_type = CounterpartyRole
