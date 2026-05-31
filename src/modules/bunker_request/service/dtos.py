import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class BunkerRequestCreateDTO:
    fuel_type: str
    quantity_required_mt: float
    specification_grade: str | None = None
    max_sulphur_content: float | None = None
    port_call_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    eta_supply: datetime | None = None


@dataclass(frozen=True)
class BunkerRequestUpdateDTO:
    quantity_required_mt: float | None = None
    specification_grade: str | None = None
    max_sulphur_content: float | None = None
    supplier_id: uuid.UUID | None = None
    eta_supply: datetime | None = None
