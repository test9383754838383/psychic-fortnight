import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class TaskCreateDTO:
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    title: str
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    due_datetime: datetime | None = None
    originating_alert_id: uuid.UUID | None = None


@dataclass(frozen=True)
class TaskUpdateDTO:
    title: str | None = None
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    due_datetime: datetime | None = None
    status: str | None = None
    originating_alert_id: uuid.UUID | None = None


@dataclass(frozen=True)
class TaskListFilters:
    status: str | None = None
    assigned_to: uuid.UUID | None = None
    entity_type: str | None = None
    limit: int = 50
    offset: int = 0
