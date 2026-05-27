import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.master_data.services.vessel_service import VesselService

router = APIRouter()


class VesselBaseDTO(BaseModel):
    code: str
    name: str
    imo: str
    vessel_type: str
    flag: str
    active_for_reporting: bool = True


class VesselCreateDTO(VesselBaseDTO):
    pass


class VesselUpdateDTO(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    imo: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = None
    active_for_reporting: Optional[bool] = None


class VesselResponseDTO(VesselBaseDTO):
    id: uuid.UUID
    status: str

    model_config = ConfigDict(from_attributes=True)


@router.post("", response_model=VesselResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_vessel(
    data: VesselCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VesselResponseDTO:
    service = VesselService(session)
    vessel = await service.create(data.model_dump())
    return VesselResponseDTO.model_validate(vessel)


@router.get("", response_model=List[VesselResponseDTO])
async def list_vessels(
    status: Optional[str] = None,
    vessel_type: Optional[str] = None,
    flag: Optional[str] = None,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> List[VesselResponseDTO]:
    service = VesselService(session)
    vessels = await service.list(status=status, vessel_type=vessel_type, flag=flag)
    return [VesselResponseDTO.model_validate(v) for v in vessels]


@router.get("/{vessel_id}", response_model=VesselResponseDTO)
async def get_vessel(
    vessel_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VesselResponseDTO:
    service = VesselService(session)
    vessel = await service.get(vessel_id)
    return VesselResponseDTO.model_validate(vessel)


@router.patch("/{vessel_id}", response_model=VesselResponseDTO)
async def update_vessel(
    vessel_id: uuid.UUID,
    data: VesselUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VesselResponseDTO:
    service = VesselService(session)
    vessel = await service.update(vessel_id, data.model_dump(exclude_unset=True))
    return VesselResponseDTO.model_validate(vessel)


@router.post("/{vessel_id}/deactivate", response_model=VesselResponseDTO)
async def deactivate_vessel(
    vessel_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VesselResponseDTO:
    service = VesselService(session)
    vessel = await service.deactivate(vessel_id)
    return VesselResponseDTO.model_validate(vessel)
