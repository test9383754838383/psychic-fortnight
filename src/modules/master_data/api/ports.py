import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.master_data.services.port_service import (
    PortCreateData,
    PortService,
    PortUpdateData,
)

router = APIRouter()


class PortBaseDTO(BaseModel):
    unlocode: str
    name: str
    timezone: str
    latitude: float
    longitude: float
    distance_table_ref: Optional[str] = None


class PortCreateDTO(PortBaseDTO):
    pass


class PortUpdateDTO(BaseModel):
    unlocode: Optional[str] = None
    name: Optional[str] = None
    timezone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_table_ref: Optional[str] = None


class PortResponseDTO(PortBaseDTO):
    id: uuid.UUID
    country: str
    status: str

    model_config = ConfigDict(from_attributes=True)


@router.post("", response_model=PortResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_port(
    data: PortCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> PortResponseDTO:
    service = PortService(session)
    create_data: PortCreateData = {
        "unlocode": data.unlocode,
        "name": data.name,
        "timezone": data.timezone,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "distance_table_ref": data.distance_table_ref,
    }
    port = await service.create(create_data)
    return PortResponseDTO.model_validate(port)


@router.get("", response_model=List[PortResponseDTO])
async def list_ports(
    status: Optional[str] = None,
    country: Optional[str] = None,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> List[PortResponseDTO]:
    service = PortService(session)
    ports = await service.list(status=status, country=country)
    return [PortResponseDTO.model_validate(p) for p in ports]


@router.get("/{port_id}", response_model=PortResponseDTO)
async def get_port(
    port_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> PortResponseDTO:
    service = PortService(session)
    port = await service.get(port_id)
    return PortResponseDTO.model_validate(port)


@router.patch("/{port_id}", response_model=PortResponseDTO)
async def update_port(
    port_id: uuid.UUID,
    data: PortUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> PortResponseDTO:
    service = PortService(session)

    update_data: PortUpdateData = {}
    if data.unlocode is not None:
        update_data["unlocode"] = data.unlocode
    if data.name is not None:
        update_data["name"] = data.name
    if data.timezone is not None:
        update_data["timezone"] = data.timezone
    if data.latitude is not None:
        update_data["latitude"] = data.latitude
    if data.longitude is not None:
        update_data["longitude"] = data.longitude
    if data.distance_table_ref is not None:
        update_data["distance_table_ref"] = data.distance_table_ref

    port = await service.update(port_id, update_data)
    return PortResponseDTO.model_validate(port)


@router.post("/{port_id}/deactivate", response_model=PortResponseDTO)
async def deactivate_port(
    port_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> PortResponseDTO:
    service = PortService(session)
    port = await service.deactivate(port_id)
    return PortResponseDTO.model_validate(port)
