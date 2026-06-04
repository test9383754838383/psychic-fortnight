import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.cargo.models.cargo import CommodityType, QuantityUnit
from src.modules.cargo.services.cargo_service import CargoService, CargoCreateData, CargoUpdateData


# ------------------------------------------------------------------ #
# DTOs                                                               #
# ------------------------------------------------------------------ #

class CargoCreateDTO(BaseModel):
    commodity: str
    quantity: float
    unit: str = QuantityUnit.MT.value
    load_port_ref: Optional[uuid.UUID] = None
    discharge_port_ref: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class CargoUpdateDTO(BaseModel):
    commodity: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    load_port_ref: Optional[uuid.UUID] = None
    discharge_port_ref: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class CargoResponseDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    commodity: str
    quantity: Decimal
    unit: str
    load_port_ref: Optional[uuid.UUID] = None
    discharge_port_ref: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommodityEnumDTO(BaseModel):
    values: List[str]


class UnitEnumDTO(BaseModel):
    values: List[str]


# ------------------------------------------------------------------ #
# Routers                                                            #
# ------------------------------------------------------------------ #

voyage_router = APIRouter(prefix="/voyages/{voyage_id}/cargoes")
member_router = APIRouter(prefix="/cargoes")


@voyage_router.get("", response_model=List[CargoResponseDTO])
async def list_cargoes(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[CargoResponseDTO]:
    service = CargoService(session)
    cargoes = await service.list_for_voyage(voyage_id)
    return [CargoResponseDTO.model_validate(c) for c in cargoes]


@voyage_router.post("", response_model=CargoResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_cargo(
    voyage_id: uuid.UUID,
    data: CargoCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CargoResponseDTO:
    service = CargoService(session)
    create_data: CargoCreateData = {
        "voyage_id": voyage_id,
        "commodity": data.commodity,
        "quantity": Decimal(str(data.quantity)),
        "unit": data.unit,
        "load_port_ref": data.load_port_ref,
        "discharge_port_ref": data.discharge_port_ref,
        "notes": data.notes,
    }
    cargo = await service.create(create_data)
    return CargoResponseDTO.model_validate(cargo)


@member_router.get("/{cargo_id}", response_model=CargoResponseDTO)
async def get_cargo(
    cargo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CargoResponseDTO:
    service = CargoService(session)
    cargo = await service.get(cargo_id)
    return CargoResponseDTO.model_validate(cargo)


@member_router.patch("/{cargo_id}", response_model=CargoResponseDTO)
async def update_cargo(
    cargo_id: uuid.UUID,
    data: CargoUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CargoResponseDTO:
    service = CargoService(session)
    update_data: CargoUpdateData = {}  # type: ignore
    if data.commodity is not None:
        update_data["commodity"] = data.commodity
    if data.quantity is not None:
        update_data["quantity"] = Decimal(str(data.quantity))
    if data.unit is not None:
        update_data["unit"] = data.unit
    if data.load_port_ref is not None:
        update_data["load_port_ref"] = data.load_port_ref
    if data.discharge_port_ref is not None:
        update_data["discharge_port_ref"] = data.discharge_port_ref
    if data.notes is not None:
        update_data["notes"] = data.notes
    cargo = await service.update(cargo_id, update_data)
    return CargoResponseDTO.model_validate(cargo)


@member_router.delete("/{cargo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cargo(
    cargo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    service = CargoService(session)
    await service.delete(cargo_id)


@member_router.get("/meta/commodities", response_model=CommodityEnumDTO)
async def list_commodities(
    current_user: User = Depends(get_current_user),
) -> CommodityEnumDTO:
    return CommodityEnumDTO(values=[e.value for e in CommodityType])


@member_router.get("/meta/units", response_model=UnitEnumDTO)
async def list_units(
    current_user: User = Depends(get_current_user),
) -> UnitEnumDTO:
    return UnitEnumDTO(values=[e.value for e in QuantityUnit])
