import uuid
from datetime import datetime, timezone

from advanced_alchemy.base import UUIDBase
from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.checklists.constants import (
    CHECKLIST_STATUSES,
    CHECKLIST_TYPES,
    ITEM_STATUSES,
)
from src.modules.master_data.models.vessel import Base  # noqa: F401

_CHECKLIST_TYPE_CHECK = (
    "checklist_type IN (" + ", ".join(f"'{value}'" for value in CHECKLIST_TYPES) + ")"
)
_CHECKLIST_STATUS_CHECK = (
    "status IN (" + ", ".join(f"'{value}'" for value in CHECKLIST_STATUSES) + ")"
)
_ITEM_STATUS_CHECK = (
    "status IN (" + ", ".join(f"'{value}'" for value in ITEM_STATUSES) + ")"
)


class Checklist(UUIDBase):
    __tablename__ = "checklists"

    port_call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("port_calls.id"), nullable=False, index=True
    )
    checklist_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    items: Mapped[list["ChecklistItem"]] = relationship(
        "ChecklistItem",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="ChecklistItem.sequence_no",
        back_populates="checklist",
    )

    __table_args__ = (
        CheckConstraint(_CHECKLIST_TYPE_CHECK, name="ck_checklists_checklist_type"),
        CheckConstraint(_CHECKLIST_STATUS_CHECK, name="ck_checklists_status"),
    )


class ChecklistItem(UUIDBase):
    __tablename__ = "checklist_items"

    checklist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("checklists.id"), nullable=False, index=True
    )
    sequence_no: Mapped[int] = mapped_column(nullable=False)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    signed_off_at: Mapped[datetime | None] = mapped_column(nullable=True)
    signed_off_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    checklist: Mapped[Checklist] = relationship(
        "Checklist",
        lazy="selectin",
        back_populates="items",
    )

    __table_args__ = (
        CheckConstraint(_ITEM_STATUS_CHECK, name="ck_checklist_items_status"),
    )
