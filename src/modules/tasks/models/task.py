import uuid
from datetime import datetime, timezone

from advanced_alchemy.base import UUIDBase
from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.tasks.constants import LINKED_ENTITY_TYPES, TASK_STATUSES
from src.modules.master_data.models.vessel import Base  # noqa: F401
from src.modules.alerts.models.alert import Alert  # noqa: F401

_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in TASK_STATUSES) + ")"
_LINKED_ENTITY_TYPE_CHECK = (
    "linked_entity_type IN (" + ", ".join(f"'{v}'" for v in LINKED_ENTITY_TYPES) + ")"
)


class Task(UUIDBase):
    __tablename__ = "tasks"

    linked_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    linked_entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    due_datetime: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=lambda: "Open"
    )
    originating_alert_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("alerts.id"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="ck_tasks_status"),
        CheckConstraint(_LINKED_ENTITY_TYPE_CHECK, name="ck_tasks_linked_entity_type"),
    )
