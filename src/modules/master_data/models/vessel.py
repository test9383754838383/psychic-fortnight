from sqlalchemy import String
from advanced_alchemy.base import UUIDAuditBase
import enum
from sqlalchemy import CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column


class VesselStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


class VesselType(str, enum.Enum):
    TANKER = "Tanker"
    BULKER = "Bulker"
    CONTAINER = "Container"
    OTHER = "Other"


class Base(UUIDAuditBase):
    __abstract__ = True


class Vessel(Base):
    __tablename__ = "vessels"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    imo: Mapped[str] = mapped_column(String(7))
    vessel_type: Mapped[str] = mapped_column(String(50))
    flag: Mapped[str] = mapped_column(String(2))
    status: Mapped[str] = mapped_column(String(20), default=VesselStatus.ACTIVE.value)
    active_for_reporting: Mapped[bool] = mapped_column(default=True)

    owner_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    technical_manager_ref: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    ops_manager_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("length(imo) = 7", name="check_vessel_imo_length"),
        CheckConstraint(
            vessel_type.in_([e.value for e in VesselType]),
            name="check_vessel_type_enum",
        ),
        CheckConstraint(
            status.in_([e.value for e in VesselStatus]), name="check_vessel_status_enum"
        ),
    )
