import enum
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from advanced_alchemy.base import UUIDAuditBase

from src.modules.master_data.models.vessel import Base  # noqa: F401 — shared metadata


class CommodityType(str, enum.Enum):
    CRUDE_OIL = "Crude Oil"
    FUEL_OIL = "Fuel Oil"
    GASOIL = "Gasoil"
    NAPHTHA = "Naphtha"
    GRAIN = "Grain"
    COAL = "Coal"
    IRON_ORE = "Iron Ore"
    CONTAINERS = "Containers"
    OTHER = "Other"


class QuantityUnit(str, enum.Enum):
    MT = "MT"
    BBL = "BBL"
    CBM = "CBM"


_COMMODITY_VALUES = [e.value for e in CommodityType]
_UNIT_VALUES = [e.value for e in QuantityUnit]

_COMMODITY_CHECK = "commodity IN (" + ", ".join(f"'{v}'" for v in _COMMODITY_VALUES) + ")"
_UNIT_CHECK = "unit IN (" + ", ".join(f"'{v}'" for v in _UNIT_VALUES) + ")"


class Cargo(UUIDAuditBase):
    __tablename__ = "cargoes"

    voyage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("voyages.id"), nullable=False, index=True
    )
    commodity: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(
        String(10), default=QuantityUnit.MT.value, nullable=False
    )
    load_port_ref: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ports.id"), nullable=True, index=True
    )
    discharge_port_ref: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ports.id"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(_COMMODITY_CHECK, name="ck_cargoes_commodity"),
        CheckConstraint(_UNIT_CHECK, name="ck_cargoes_unit"),
    )
