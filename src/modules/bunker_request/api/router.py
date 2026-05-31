import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.bunker_request.constants import FUEL_TYPES
from src.modules.bunker_request.service.bunker_request_service import (
    BunkerRequestService,
)
from src.modules.bunker_request.service.dtos import (
    BunkerRequestCreateDTO,
    BunkerRequestUpdateDTO,
)

FuelTypeLiteral = Literal[
    "HFO", "VLSFO", "MGO", "LSMGO", "HSFO", "ULSD", "LNG", "Biofuel"
]


class BunkerRequestCreateBody(BaseModel):
    fuel_type: FuelTypeLiteral
    quantity_required_mt: float
    specification_grade: str | None = None
    max_sulphur_content: float | None = None
    port_call_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    eta_supply: datetime | None = None

    @field_validator("fuel_type")
    @classmethod
    def validate_fuel_type(cls, v: str) -> str:
        if v not in FUEL_TYPES:
            raise ValueError(f"Invalid fuel_type: {v}")
        return v


class BunkerRequestTransitionBody(BaseModel):
    status: str
    blocker_note: str | None = None


class BunkerRequestUpdateBody(BaseModel):
    quantity_required_mt: float | None = None
    specification_grade: str | None = None
    max_sulphur_content: float | None = None
    supplier_id: uuid.UUID | None = None
    eta_supply: datetime | None = None


class BunkerRequestReadDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    port_call_id: uuid.UUID | None = None
    fuel_type: str
    quantity_required_mt: float
    specification_grade: str | None = None
    max_sulphur_content: float | None = None
    status: str
    blocker_note: str | None = None
    raised_by: uuid.UUID
    raised_at: datetime
    supplier_id: uuid.UUID | None = None
    eta_supply: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


voyage_router = APIRouter(prefix="/voyages/{voyage_id}/bunker-requests")
member_router = APIRouter(prefix="/bunker-requests")


@voyage_router.post(
    "",
    response_model=BunkerRequestReadDTO,
    status_code=status.HTTP_201_CREATED,
    tags=["bunker-requests"],
)
async def create_bunker_request(
    voyage_id: uuid.UUID,
    data: BunkerRequestCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRequestReadDTO:
    service = BunkerRequestService(session)
    dto = BunkerRequestCreateDTO(
        fuel_type=data.fuel_type,
        quantity_required_mt=data.quantity_required_mt,
        specification_grade=data.specification_grade,
        max_sulphur_content=data.max_sulphur_content,
        port_call_id=data.port_call_id,
        supplier_id=data.supplier_id,
        eta_supply=data.eta_supply,
    )
    br = await service.create(voyage_id, dto, current_user)
    return BunkerRequestReadDTO.model_validate(br)


@voyage_router.get(
    "",
    response_model=list[BunkerRequestReadDTO],
    tags=["bunker-requests"],
)
async def list_bunker_requests(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[BunkerRequestReadDTO]:
    del current_user
    service = BunkerRequestService(session)
    brs = await service.list_for_voyage(voyage_id)
    return [BunkerRequestReadDTO.model_validate(br) for br in brs]


@member_router.get(
    "/{bunker_request_id}",
    response_model=BunkerRequestReadDTO,
    tags=["bunker-requests"],
)
async def get_bunker_request(
    bunker_request_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRequestReadDTO:
    del current_user
    service = BunkerRequestService(session)
    br = await service.get(bunker_request_id)
    return BunkerRequestReadDTO.model_validate(br)


@member_router.patch(
    "/{bunker_request_id}",
    response_model=BunkerRequestReadDTO,
    tags=["bunker-requests"],
)
async def update_bunker_request(
    bunker_request_id: uuid.UUID,
    data: BunkerRequestUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRequestReadDTO:
    service = BunkerRequestService(session)
    dto = BunkerRequestUpdateDTO(
        quantity_required_mt=data.quantity_required_mt,
        specification_grade=data.specification_grade,
        max_sulphur_content=data.max_sulphur_content,
        supplier_id=data.supplier_id,
        eta_supply=data.eta_supply,
    )
    br = await service.update(bunker_request_id, dto, current_user)
    return BunkerRequestReadDTO.model_validate(br)


@member_router.post(
    "/{bunker_request_id}/transition",
    response_model=BunkerRequestReadDTO,
    tags=["bunker-requests"],
)
async def transition_bunker_request(
    bunker_request_id: uuid.UUID,
    data: BunkerRequestTransitionBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRequestReadDTO:
    service = BunkerRequestService(session)
    br = await service.transition(
        bunker_request_id,
        data.status,
        current_user,
        blocker_note=data.blocker_note,
    )
    return BunkerRequestReadDTO.model_validate(br)
