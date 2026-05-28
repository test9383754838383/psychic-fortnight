from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.auth.models.session import Session


class SessionRepository(SQLAlchemyAsyncRepository[Session]):
    model_type = Session
