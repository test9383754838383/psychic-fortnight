import uuid
from decimal import Decimal
from typing import Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.cargo.exceptions import CargoNotFoundError, InvalidCommodityError, InvalidUnitError
from src.modules.cargo.models.cargo import Cargo, CommodityType, QuantityUnit
from src.modules.cargo.repositories.cargo_repository import CargoRepository
from src.modules.master_data import validate_port_active
from src.modules.voyage_spine import validate_voyage_exists

_VALID_COMMODITIES = {e.value for e in CommodityType}
_VALID_UNITS = {e.value for e in QuantityUnit}


class CargoCreateData(TypedDict, total=False):
    voyage_id: uuid.UUID
    commodity: str
    quantity: Decimal
    unit: str
    load_port_ref: Optional[uuid.UUID]
    discharge_port_ref: Optional[uuid.UUID]
    notes: Optional[str]


class CargoUpdateData(TypedDict, total=False):
    commodity: str
    quantity: Decimal
    unit: str
    load_port_ref: Optional[uuid.UUID]
    discharge_port_ref: Optional[uuid.UUID]
    notes: Optional[str]


class CargoService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = CargoRepository(session=session)

    async def create(self, data: CargoCreateData) -> Cargo:
        voyage_id = data["voyage_id"]
        commodity = data["commodity"]
        unit = data.get("unit", QuantityUnit.MT.value)

        await validate_voyage_exists(self.session, voyage_id)

        if commodity not in _VALID_COMMODITIES:
            raise InvalidCommodityError(commodity)
        if unit not in _VALID_UNITS:
            raise InvalidUnitError(unit)

        load_port_ref = data.get("load_port_ref")
        discharge_port_ref = data.get("discharge_port_ref")

        if load_port_ref:
            await validate_port_active(self.session, load_port_ref)
        if discharge_port_ref:
            await validate_port_active(self.session, discharge_port_ref)

        cargo = Cargo(
            voyage_id=voyage_id,
            commodity=commodity,
            quantity=data["quantity"],
            unit=unit,
            load_port_ref=load_port_ref,
            discharge_port_ref=discharge_port_ref,
            notes=data.get("notes"),
        )
        await self.repository.add(cargo)
        await self.session.commit()
        await self.session.refresh(cargo)
        return cargo

    async def get(self, cargo_id: uuid.UUID) -> Cargo:
        cargo = await self.repository.get_one_or_none(id=cargo_id)
        if not cargo:
            raise CargoNotFoundError(str(cargo_id))
        return cargo

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[Cargo]:
        return await self.repository.list_for_voyage(voyage_id)

    async def update(self, cargo_id: uuid.UUID, data: CargoUpdateData) -> Cargo:
        cargo = await self.get(cargo_id)

        if "commodity" in data:
            if data["commodity"] not in _VALID_COMMODITIES:
                raise InvalidCommodityError(data["commodity"])
            cargo.commodity = data["commodity"]

        if "unit" in data:
            if data["unit"] not in _VALID_UNITS:
                raise InvalidUnitError(data["unit"])
            cargo.unit = data["unit"]

        if "quantity" in data:
            cargo.quantity = data["quantity"]

        if "load_port_ref" in data:
            if data["load_port_ref"]:
                await validate_port_active(self.session, data["load_port_ref"])
            cargo.load_port_ref = data["load_port_ref"]

        if "discharge_port_ref" in data:
            if data["discharge_port_ref"]:
                await validate_port_active(self.session, data["discharge_port_ref"])
            cargo.discharge_port_ref = data["discharge_port_ref"]

        if "notes" in data:
            cargo.notes = data["notes"]

        await self.repository.update(cargo)
        await self.session.commit()
        await self.session.refresh(cargo)
        return cargo

    async def delete(self, cargo_id: uuid.UUID) -> None:
        await self.get(cargo_id)  # raises CargoNotFoundError if missing
        await self.repository.delete(cargo_id)
        await self.session.commit()
