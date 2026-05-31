import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    String,
    Text,
    JSON,
    DateTime,
    Integer,
    Float,
)
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase

from src.modules.forms.constants import FORM_TYPES, FormStatus, FormSourceType
from src.modules.forms.types import JsonObject

# XOR check for voyage_id and port_call_id
_XOR_CHECK = (
    "(voyage_id IS NOT NULL AND port_call_id IS NULL) "
    "OR (voyage_id IS NULL AND port_call_id IS NOT NULL)"
)

# Form type check
_FORM_TYPE_CHECK = f"form_type IN ({', '.join(f"'{t}'" for t in FORM_TYPES)})"

# Form status check
_FORM_STATUS_CHECK = f"status IN ({', '.join(f"'{s.value}'" for s in FormStatus)})"


class Form(UUIDAuditBase):
    """Main Form entity representing a document in the review workflow."""

    __tablename__ = "forms"

    form_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=FormStatus.RECEIVED.value, nullable=False, index=True
    )

    voyage_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("voyages.id"), nullable=True, index=True
    )
    port_call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("port_calls.id"), nullable=True, index=True
    )

    submitted_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    accepted_parse_attempt_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey(
            "form_parse_attempts.id",
            use_alter=True,
            name="fk_forms_accepted_parse_attempt_id",
        ),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(_FORM_TYPE_CHECK, name="ck_forms_form_type"),
        CheckConstraint(_FORM_STATUS_CHECK, name="ck_forms_status"),
        CheckConstraint(_XOR_CHECK, name="ck_forms_anchor_xor"),
    )


class FormDetail(UUIDAuditBase):
    """Secondary storage for form raw fields and source metadata."""

    __tablename__ = "form_details"

    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id"), unique=True, nullable=False
    )
    raw_fields: Mapped[JsonObject] = mapped_column(JSON, nullable=False)
    raw_source_ref: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_text_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(20), default=FormSourceType.PASTE.value, nullable=False
    )


class FormParseAttempt(UUIDAuditBase):
    """Audit log of an LLM parse attempt."""

    __tablename__ = "form_parse_attempts"

    form_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("forms.id"), nullable=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), nullable=False)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False)
    retry_no: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_estimate: Mapped[float] = mapped_column(Float, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
