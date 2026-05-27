import enum
from sqlalchemy import String, Float, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from src.modules.master_data.models.vessel import Base


class PortStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


class Port(Base):
    __tablename__ = "ports"

    unlocode: Mapped[str] = mapped_column(String(5), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    distance_table_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=PortStatus.ACTIVE.value)

    __table_args__ = (
        CheckConstraint("length(unlocode) = 5", name="check_port_unlocode_length"),
        CheckConstraint(
            latitude.between(-90.0, 90.0), name="check_port_latitude_range"
        ),
        CheckConstraint(
            longitude.between(-180.0, 180.0), name="check_port_longitude_range"
        ),
        CheckConstraint(
            status.in_([e.value for e in PortStatus]), name="check_port_status_enum"
        ),
    )
