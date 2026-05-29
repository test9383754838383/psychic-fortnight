import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDBase

from src.modules.master_data.models.vessel import Base  # noqa: F401 — shared metadata


class PortActivityEventType(str, enum.Enum):
    ARRIVED = "Arrived"
    ANCHORED = "Anchored"
    BERTHED = "Berthed"
    ALL_FAST = "All Fast"
    COMMENCED_LOADING = "Commenced Loading"
    COMPLETED_LOADING = "Completed Loading"
    COMMENCED_DISCHARGING = "Commenced Discharging"
    COMPLETED_DISCHARGING = "Completed Discharging"
    HOSES_CONNECTED = "Hoses Connected"
    HOSES_DISCONNECTED = "Hoses Disconnected"
    DEPARTED = "Departed"
    NOR_TENDERED = "NOR Tendered"
    NOR_RE_TENDERED = "NOR Re-tendered"
    NOR_ACCEPTED = "NOR Accepted"
    FREE_PRATIQUE_GRANTED = "Free Pratique Granted"
    TUGS_ENGAGED = "Tugs Engaged"
    TUGS_RELEASED = "Tugs Released"
    BUNKERING_COMMENCED = "Bunkering Commenced"
    BUNKERING_COMPLETED = "Bunkering Completed"
    DELAY_COMMENCED = "Delay Commenced"
    DELAY_ENDED = "Delay Ended"


_EVENT_TYPE_VALUES = [e.value for e in PortActivityEventType]

_EVENT_TYPE_CHECK = (
    "event_type IN (" + ", ".join(f"'{v}'" for v in _EVENT_TYPE_VALUES) + ")"
)


class PortActivity(UUIDBase):
    """Append-only log of operational events for a port call (D-LOCK-2)."""

    __tablename__ = "port_activities"

    port_call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("port_calls.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(nullable=False)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Correction chain (D-LOCK-2)
    corrects_activity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("port_activities.id"), nullable=True
    )
    correction_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Append-only: created_at only, NO updated_at (D-LOCK-2)
    created_at: Mapped[datetime] = mapped_column(nullable=False)

    __table_args__ = (
        CheckConstraint(_EVENT_TYPE_CHECK, name="ck_port_activities_event_type_enum"),
        CheckConstraint(
            "(corrects_activity_id IS NULL) OR (correction_reason IS NOT NULL)",
            name="ck_port_activities_correction_reason_required",
        ),
    )


class ActivityLog(UUIDBase):
    """Append-only free-text narrative log for a port call (D-LOCK-3)."""

    __tablename__ = "activity_logs"

    port_call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("port_calls.id"), nullable=False, index=True
    )
    logged_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    narrative: Mapped[str] = mapped_column(Text, nullable=False)
    # logged_at is immutable (= created_at). No updated_at (D-LOCK-3).
    logged_at: Mapped[datetime] = mapped_column(nullable=False)
