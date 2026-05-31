import uuid
from datetime import datetime, timezone

from advanced_alchemy.base import UUIDBase
from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.bunker_request.constants import FUEL_TYPES, STATUSES
from src.modules.master_data.models.vessel import Base  # noqa: F401

_FUEL_TYPE_CHECK = "fuel_type IN (" + ", ".join(f"'{v}'" for v in FUEL_TYPES) + ")"
_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in STATUSES) + ")"


class BunkerRequest(UUIDBase):
    __tablename__ = "bunker_requests"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    port_call_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("port_calls.id"), nullable=True, index=True
    )
    fuel_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity_required_mt: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=3), nullable=False
    )
    specification_grade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_sulphur_content: Mapped[float | None] = mapped_column(
        Numeric(precision=5, scale=4), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    blocker_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    raised_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    raised_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("counterparties.id"), nullable=True
    )
    eta_supply: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(_FUEL_TYPE_CHECK, name="ck_bunker_requests_fuel_type"),
        CheckConstraint(_STATUS_CHECK, name="ck_bunker_requests_status"),
    )
