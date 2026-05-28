from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.auth.models.user import User


class UserRepository(SQLAlchemyAsyncRepository[User]):
    model_type = User
