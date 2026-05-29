import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase


class PortCallStatus(str, enum.Enum):
    PLANNED = "Planned"
    ARRIVED_AT_PILOT_STATION = "Arrived at Pilot Station"
    AT_ANCHOR = "At Anchor"
    BERTHED = "Berthed"
    CARGO_OPS_COMPLETED = "Cargo Ops Completed"
    DEPARTED = "Departed"


class PortCall(UUIDAuditBase):
    __tablename__ = "port_calls"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    port_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ports.id"), nullable=False, index=True
    )
    itinerary_line_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("itinerary_lines.id"), nullable=True, index=True
    )

    status: Mapped[str] = mapped_column(
        String(50), default=PortCallStatus.PLANNED.value, nullable=False
    )

    # Estimates
    eta: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    etd: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Actuals (D-LOCK-4)
    ata: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    anchored_datetime: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    atb: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    cargo_ops_started_datetime: Mapped[Optional[datetime]] = mapped_column(
        nullable=True
    )
    cargo_ops_completed_datetime: Mapped[Optional[datetime]] = mapped_column(
        nullable=True
    )
    atd: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Timezone (D-LOCK-6)
    timezone_name: Mapped[str] = mapped_column(String(50), nullable=False)
    timezone_offset_minutes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # NOR & Clearance
    nor_tendered_datetime: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    nor_accepted_datetime: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    free_pratique_granted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    free_pratique_granted_datetime: Mapped[Optional[datetime]] = mapped_column(
        nullable=True
    )

    customs_cleared: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    customs_cleared_datetime: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    ops_notes: Mapped[Optional[str]] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            status.in_([e.value for e in PortCallStatus]),
            name="check_port_call_status_enum",
        ),
    )
