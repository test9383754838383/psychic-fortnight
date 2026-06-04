import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase

from src.modules.master_data.models.vessel import Base  # noqa: F401 — shared metadata

_ROB_STATUS_VALUES = ("estimated", "reported", "confirmed", "overridden")
_ROB_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in _ROB_STATUS_VALUES) + ")"


class FuelGrade(str, enum.Enum):
    VLSFO = "VLSFO"
    LSMGO = "LSMGO"
    HSFO = "HSFO"
    MGO = "MGO"
    LNG = "LNG"


FUEL_GRADES = [e.value for e in FuelGrade]

_GRADE_CHECK = "fuel_grade IN (" + ", ".join(f"'{v}'" for v in FUEL_GRADES) + ")"


class PortCallBunkerRob(UUIDAuditBase):
    __tablename__ = "port_call_bunker_robs"

    port_call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("port_calls.id"), nullable=False, index=True
    )
    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    fuel_grade: Mapped[str] = mapped_column(String(10), nullable=False)

    rob_arrival_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    received_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    port_consumption_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    rob_departure_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)

    sulphur_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    bdn_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # M8 provenance columns (all nullable — added via migration)
    arrival_source_report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("activity_reports.id"), nullable=True
    )
    departure_source_report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("activity_reports.id"), nullable=True
    )
    received_source_report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("activity_reports.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="estimated", nullable=False
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reconciliation_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    reported_vs_delta_variance_mt: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 3), nullable=True
    )

    __table_args__ = (
        CheckConstraint(_GRADE_CHECK, name="ck_port_call_bunker_robs_fuel_grade"),
        CheckConstraint(_ROB_STATUS_CHECK, name="ck_port_call_bunker_robs_status"),
    )
