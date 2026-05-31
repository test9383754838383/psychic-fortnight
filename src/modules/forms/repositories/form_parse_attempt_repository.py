from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.forms.models.models import FormParseAttempt


class FormParseAttemptRepository(SQLAlchemyAsyncRepository[FormParseAttempt]):
    model_type = FormParseAttempt
