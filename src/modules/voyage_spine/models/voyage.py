import enum
import uuid
from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from src.modules.voyage_spine.models.itinerary_line import ItineraryLine

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.orderinglist import ordering_list
from advanced_alchemy.base import UUIDAuditBase


class VoyageStatus(str, enum.Enum):
    SCHEDULED = "Scheduled"
    COMMENCED = "Commenced"
    COMPLETED = "Completed"
    CLOSED = "Closed"
    CANCELLED = "Cancelled"


class CpType(str, enum.Enum):
    CVC = "CVC"
    TC = "TC"
    VC = "VC"


class Base(UUIDAuditBase):
    __abstract__ = True


class Voyage(Base):
    __tablename__ = "voyages"

    voyage_no: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    vessel_ref: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vessels.id"), nullable=False, index=True
    )
    charterer_ref: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("counterparties.id"), nullable=True, index=True
    )
    previous_voyage_ref: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("voyages.id"), nullable=True, index=True
    )

    # Flat VoyageOperatingTerms columns (D-LOCK-2)
    terms_charterer_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    terms_cp_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    terms_cp_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    terms_cp_document_ref: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default=VoyageStatus.SCHEDULED.value, nullable=False
    )
    commencing_datetime: Mapped[datetime] = mapped_column(nullable=False)
    expected_completing_datetime: Mapped[Optional[datetime]] = mapped_column(
        nullable=True
    )
    expected_completing_manual_override: Mapped[bool] = mapped_column(
        default=False, nullable=False
    )

    voyage_instructions: Mapped[Optional[str]] = mapped_column(nullable=True)
    ops_notes: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Transition timestamps
    commenced_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # ItineraryLine relationship (D-LOCK-1)
    itinerary_lines: Mapped[List["ItineraryLine"]] = relationship(
        "ItineraryLine",
        order_by="ItineraryLine.sequence_no",
        collection_class=ordering_list("sequence_no"),
        cascade="all, delete-orphan",
        back_populates="voyage",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            status.in_([e.value for e in VoyageStatus]),
            name="check_voyage_status_enum",
        ),
        CheckConstraint(
            terms_cp_type.in_([e.value for e in CpType]),
            name="check_voyage_cp_type_enum",
        ),
    )
