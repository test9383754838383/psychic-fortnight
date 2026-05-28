import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from advanced_alchemy.base import DefaultBase
from advanced_alchemy.mixins import AuditColumns
from src.modules.master_data.models.vessel import Base

if TYPE_CHECKING:
    from src.modules.auth.models.role import Role


class UserRole(AuditColumns, DefaultBase):
    __tablename__ = "user_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )

    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", lazy="joined")


class User(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)

    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole", back_populates="user", lazy="selectin", cascade="all, delete-orphan"
    )
