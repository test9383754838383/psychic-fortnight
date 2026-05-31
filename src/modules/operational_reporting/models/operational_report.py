import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase


class OperationalReportType(str, enum.Enum):
    NOON = "Noon"
    ARRIVAL = "Arrival"
    DEPARTURE = "Departure"
    BUNKERING = "Bunkering"
    STATEMENT_OF_FACTS = "Statement of Facts"


class OperationalReportStatus(str, enum.Enum):
    PENDING = "Pending"
    QUERIED = "Queried"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


_REPORT_TYPE_VALUES = [e.value for e in OperationalReportType]
_REPORT_STATUS_VALUES = [e.value for e in OperationalReportStatus]

_REPORT_TYPE_CHECK = (
    "report_type IN (" + ", ".join(f"'{v}'" for v in _REPORT_TYPE_VALUES) + ")"
)
_REPORT_STATUS_CHECK = (
    "status IN (" + ", ".join(f"'{v}'" for v in _REPORT_STATUS_VALUES) + ")"
)
# XOR: exactly one of voyage_id / port_call_id must be set (D-LOCK-5, D-39)
_XOR_CHECK = (
    "(voyage_id IS NOT NULL AND port_call_id IS NULL) "
    "OR (voyage_id IS NULL AND port_call_id IS NOT NULL)"
)


class OperationalReport(UUIDAuditBase):
    """Structured voyage/port-call report with status lifecycle.

    updated_at is present (via UUIDAuditBase) because Pending reports
    are editable. The service blocks mutations after Accepted/Rejected.
    """

    __tablename__ = "operational_reports"

    # Anchor: exactly one of voyage_id / port_call_id set (D-LOCK-5)
    voyage_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("voyages.id"), nullable=True, index=True
    )
    port_call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("port_calls.id"), nullable=True, index=True
    )

    report_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default=OperationalReportStatus.PENDING.value,
        nullable=False,
        index=True,
    )

    submitted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    received_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Flat structured telemetry fields (D-LOCK-8)
    position_lat: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(9, 6), nullable=True
    )
    position_lon: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(9, 6), nullable=True
    )
    speed_24h: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    distance_to_go: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(7, 2), nullable=True
    )
    eta_next_port: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    # D-38: explicit name marks V1 single-fuel compromise
    bunker_rob_total_mt: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 3), nullable=True
    )

    raw_content_ref: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Supersession self-FK (D-LOCK-7, D-37)
    supersedes_report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("operational_reports.id"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(_REPORT_TYPE_CHECK, name="ck_operational_reports_report_type"),
        CheckConstraint(_REPORT_STATUS_CHECK, name="ck_operational_reports_status"),
        CheckConstraint(_XOR_CHECK, name="ck_operational_reports_anchor_xor"),
    )
