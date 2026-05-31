from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.forms.models.models import Form


class FormRepository(SQLAlchemyAsyncRepository[Form]):
    model_type = Form
