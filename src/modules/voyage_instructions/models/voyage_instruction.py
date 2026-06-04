import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import CheckConstraint, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase

from src.modules.master_data.models.vessel import Base  # noqa: F401 — shared metadata


class InstructionStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"


_STATUSES = [e.value for e in InstructionStatus]
_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in _STATUSES) + ")"


class InstructionTemplate(UUIDAuditBase):
    __tablename__ = "instruction_templates"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)


class VoyageInstruction(UUIDAuditBase):
    __tablename__ = "voyage_instructions"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # body = {"format": "html", "content": "<...>"}
    body: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    status: Mapped[str] = mapped_column(
        String(15), default=InstructionStatus.DRAFT.value, nullable=False, index=True
    )

    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("instruction_templates.id"), nullable=True
    )

    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    sent_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="ck_voyage_instructions_status"),
    )
