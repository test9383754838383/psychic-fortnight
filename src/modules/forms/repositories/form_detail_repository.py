from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.forms.models.models import FormDetail


class FormDetailRepository(SQLAlchemyAsyncRepository[FormDetail]):
    model_type = FormDetail
