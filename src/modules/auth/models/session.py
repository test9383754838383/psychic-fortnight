import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import DefaultBase
from advanced_alchemy.mixins import AuditColumns
from advanced_alchemy.types import DateTimeUTC


class Session(AuditColumns, DefaultBase):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTimeUTC(timezone=True), index=True)
