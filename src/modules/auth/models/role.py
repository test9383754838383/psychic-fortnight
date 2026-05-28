from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.modules.master_data.models.vessel import Base


class Role(Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)


class Permission(Base):
    __tablename__ = "permissions"

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
