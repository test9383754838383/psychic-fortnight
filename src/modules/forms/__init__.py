"""Forms module public surface.

All external imports must be from the root of this module.
"""

from src.modules.forms.constants import FORM_TYPES
from src.modules.forms.models.schemas import (
    ArrivalReportSchema,
    BunkeringReportSchema,
    DepartureReportSchema,
    NoonReportSchema,
    StatementOfFactsSchema,
)
from src.modules.forms.service.parser import (
    ExtractionError,
    FormParserService,
    ParseOutcome,
    UnknownFormTypeError,
)
from src.modules.forms.api.router import router

__all__ = [
    "FORM_TYPES",
    "NoonReportSchema",
    "ArrivalReportSchema",
    "DepartureReportSchema",
    "BunkeringReportSchema",
    "StatementOfFactsSchema",
    "FormParserService",
    "ParseOutcome",
    "UnknownFormTypeError",
    "ExtractionError",
    "router",
]
