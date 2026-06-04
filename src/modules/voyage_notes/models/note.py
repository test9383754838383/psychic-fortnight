import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from advanced_alchemy.base import UUIDAuditBase

from src.modules.master_data.models.vessel import Base  # noqa: F401 — shared metadata


class NoteCategory(str, enum.Enum):
    OPERATIONAL = "Operational"
    COMMERCIAL = "Commercial"
    SAFETY = "Safety"
    AGENT = "Agent"


class NotePriority(str, enum.Enum):
    LOW = "Low"
    NORMAL = "Normal"
    HIGH = "High"


_CATEGORIES = [e.value for e in NoteCategory]
_PRIORITIES = [e.value for e in NotePriority]

_CAT_CHECK = "category IN (" + ", ".join(f"'{v}'" for v in _CATEGORIES) + ")"
_PRI_CHECK = "priority IN (" + ", ".join(f"'{v}'" for v in _PRIORITIES) + ")"


class VoyageNote(UUIDAuditBase):
    __tablename__ = "voyage_notes"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(20), nullable=False, default=NoteCategory.OPERATIONAL.value
    )
    priority: Mapped[str] = mapped_column(
        String(10), nullable=False, default=NotePriority.NORMAL.value
    )
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    attachments: Mapped[list["NoteAttachment"]] = relationship(
        "NoteAttachment",
        back_populates="note",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(_CAT_CHECK, name="ck_voyage_notes_category"),
        CheckConstraint(_PRI_CHECK, name="ck_voyage_notes_priority"),
    )


class NoteAttachment(UUIDAuditBase):
    __tablename__ = "note_attachments"

    note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyage_notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    note: Mapped["VoyageNote"] = relationship("VoyageNote", back_populates="attachments")
