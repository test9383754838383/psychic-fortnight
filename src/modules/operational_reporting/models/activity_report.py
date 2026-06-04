import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from advanced_alchemy.base import UUIDAuditBase

from src.modules.master_data.models.vessel import Base  # noqa: F401 — shared metadata
from src.modules.bunker_rob.models.bunker_rob import FUEL_GRADES


class ReportType(str, enum.Enum):
    COMMENCING = "COMMENCING"
    NOON = "NOON"
    ARRIVAL = "ARRIVAL"
    DEPARTURE = "DEPARTURE"
    TERMINATING = "TERMINATING"


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"


_REPORT_TYPES = [e.value for e in ReportType]
_REPORT_STATUSES = [e.value for e in ReportStatus]
_GRADE_CHECK = "fuel_grade IN (" + ", ".join(f"'{v}'" for v in FUEL_GRADES) + ")"

_TYPE_CHECK = "report_type IN (" + ", ".join(f"'{v}'" for v in _REPORT_TYPES) + ")"
_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in _REPORT_STATUSES) + ")"


class ActivityReport(UUIDAuditBase):
    __tablename__ = "activity_reports"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    port_call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("port_calls.id"), nullable=True, index=True
    )

    report_type: Mapped[str] = mapped_column(String(20), nullable=False)
    report_datetime: Mapped[datetime] = mapped_column(nullable=False)

    latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 5), nullable=True)
    longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 5), nullable=True)

    wind_force: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sea_state: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    swell: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    rpm: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    slip_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    speed_kn: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    distance_nm: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)

    status: Mapped[str] = mapped_column(
        String(15), default=ReportStatus.DRAFT.value, nullable=False, index=True
    )

    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    bunker_lines: Mapped[list["ActivityReportBunker"]] = relationship(
        "ActivityReportBunker",
        back_populates="report",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(_TYPE_CHECK, name="ck_activity_reports_report_type"),
        CheckConstraint(_STATUS_CHECK, name="ck_activity_reports_status"),
    )


class ActivityReportBunker(UUIDAuditBase):
    __tablename__ = "activity_report_bunkers"

    activity_report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity_reports.id"), nullable=False, index=True
    )
    fuel_grade: Mapped[str] = mapped_column(String(10), nullable=False)

    reported_rob_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    reported_consumption_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    received_mt: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    sulphur_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    bdn_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    report: Mapped["ActivityReport"] = relationship(
        "ActivityReport", back_populates="bunker_lines"
    )

    __table_args__ = (
        CheckConstraint(_GRADE_CHECK, name="ck_activity_report_bunkers_fuel_grade"),
    )
