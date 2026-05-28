import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from advanced_alchemy.base import UUIDAuditBase

if TYPE_CHECKING:
    from src.modules.voyage_spine.models.voyage import Voyage


class PortFunction(str, enum.Enum):
    LOAD = "Load"
    DISCHARGE = "Discharge"
    BUNKER = "Bunker"
    CANAL = "Canal"
    TRANSIT = "Transit"
    REPAIRS = "Repairs"
    OTHER = "Other"


class Base(UUIDAuditBase):
    __abstract__ = True


class ItineraryLine(Base):
    __tablename__ = "itinerary_lines"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence_no: Mapped[int] = mapped_column(nullable=False)
    port_ref: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ports.id"), nullable=False, index=True
    )
    port_function: Mapped[str] = mapped_column(String(20), nullable=False)
    planned_eta: Mapped[datetime] = mapped_column(nullable=False)
    planned_etd: Mapped[datetime] = mapped_column(nullable=False)

    # Back relation to Voyage
    voyage: Mapped["Voyage"] = relationship("Voyage", back_populates="itinerary_lines")

    __table_args__ = (
        UniqueConstraint("voyage_id", "sequence_no", name="uq_voyage_sequence"),
        CheckConstraint(
            planned_etd >= planned_eta,
            name="check_itinerary_line_eta_etd",
        ),
        CheckConstraint(
            port_function.in_([e.value for e in PortFunction]),
            name="check_port_function_enum",
        ),
    )
