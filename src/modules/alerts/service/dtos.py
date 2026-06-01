import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class AlertCreateDTO:
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    alert_type: str
    message: str
    severity: str


@dataclass(frozen=True)
class AlertResolveDTO:
    resolution_note: str | None = None


@dataclass(frozen=True)
class AlertListFilters:
    severity: str | None = None
    resolved: bool | None = None
    entity_type: str | None = None
    limit: int = 50
    offset: int = 0
