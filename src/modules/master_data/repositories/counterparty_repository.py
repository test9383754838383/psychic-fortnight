from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.master_data.models.counterparty import Counterparty


class CounterpartyRepository(SQLAlchemyAsyncRepository[Counterparty]):
    model_type = Counterparty
