import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DelayCreateDTO:
    delay_type: str
    fault_attribution: str
    start_datetime: datetime
    description: str
    end_datetime: datetime | None = None
    claimed_duration: float | None = None
    port_call_id: uuid.UUID | None = None
    leg_ref: str | None = None


@dataclass(frozen=True)
class DelayUpdateDTO:
    delay_type: str | None = None
    fault_attribution: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    claimed_duration: float | None = None
    description: str | None = None
    port_call_id: uuid.UUID | None = None
    leg_ref: str | None = None
