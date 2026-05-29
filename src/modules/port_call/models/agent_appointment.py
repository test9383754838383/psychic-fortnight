import enum
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, String, Date, Index
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase


class AgentAppointmentStatus(str, enum.Enum):
    NOMINATED = "Nominated"
    APPOINTED = "Appointed"
    CANCELLED = "Cancelled"


class AgentAppointment(UUIDAuditBase):
    __tablename__ = "agent_appointments"

    port_call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("port_calls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_ref: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("counterparties.id"), nullable=False, index=True
    )
    appointed_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=AgentAppointmentStatus.NOMINATED.value, nullable=False
    )
    agent_appointment_ref: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            status.in_([e.value for e in AgentAppointmentStatus]),
            name="check_agent_appointment_status_enum",
        ),
        # Partial unique index (D-LOCK-7): at most one non-cancelled row per port call.
        Index(
            "ix_agent_appointment_active_unique",
            port_call_id,
            unique=True,
            postgresql_where=(status != "Cancelled"),
            sqlite_where=(status != "Cancelled"),
        ),
    )
