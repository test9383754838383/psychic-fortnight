import uuid
from datetime import datetime

from advanced_alchemy.base import UUIDBase
from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.delay_tracking.constants import DELAY_TYPES, FAULT_ATTRIBUTIONS
from src.modules.master_data.models.vessel import Base  # noqa: F401

_DELAY_TYPE_CHECK = "delay_type IN (" + ", ".join(f"'{v}'" for v in DELAY_TYPES) + ")"
_FAULT_ATTRIBUTION_CHECK = (
    "fault_attribution IN (" + ", ".join(f"'{v}'" for v in FAULT_ATTRIBUTIONS) + ")"
)
# Mutual exclusivity: port_call_id and leg_ref cannot both be set
_ANCHOR_XOR_CHECK = "NOT (port_call_id IS NOT NULL AND leg_ref IS NOT NULL)"


class Delay(UUIDBase):
    __tablename__ = "delays"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    port_call_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("port_calls.id"), nullable=True, index=True
    )
    leg_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delay_type: Mapped[str] = mapped_column(String(50), nullable=False)
    fault_attribution: Mapped[str] = mapped_column(String(50), nullable=False)
    start_datetime: Mapped[datetime] = mapped_column(nullable=False)
    end_datetime: Mapped[datetime | None] = mapped_column(nullable=True)
    claimed_duration: Mapped[float | None] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    recorded_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(_DELAY_TYPE_CHECK, name="ck_delays_delay_type"),
        CheckConstraint(_FAULT_ATTRIBUTION_CHECK, name="ck_delays_fault_attribution"),
        CheckConstraint(_ANCHOR_XOR_CHECK, name="ck_delays_anchor_xor"),
    )
