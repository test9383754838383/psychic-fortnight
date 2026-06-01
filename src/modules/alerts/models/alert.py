import uuid
from datetime import datetime, timezone

from advanced_alchemy.base import UUIDBase
from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.alerts.constants import ALERT_TYPES, LINKED_ENTITY_TYPES, SEVERITIES
from src.modules.master_data.models.vessel import Base  # noqa: F401

_ALERT_TYPE_CHECK = "alert_type IN (" + ", ".join(f"'{v}'" for v in ALERT_TYPES) + ")"
_SEVERITY_CHECK = "severity IN (" + ", ".join(f"'{v}'" for v in SEVERITIES) + ")"
_LINKED_ENTITY_TYPE_CHECK = (
    "linked_entity_type IN (" + ", ".join(f"'{v}'" for v in LINKED_ENTITY_TYPES) + ")"
)


class Alert(UUIDBase):
    __tablename__ = "alerts"

    linked_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    linked_entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    resolution_note: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    __table_args__ = (
        CheckConstraint(_ALERT_TYPE_CHECK, name="ck_alerts_alert_type"),
        CheckConstraint(_SEVERITY_CHECK, name="ck_alerts_severity"),
        CheckConstraint(_LINKED_ENTITY_TYPE_CHECK, name="ck_alerts_linked_entity_type"),
    )
