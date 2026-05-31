import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.port_call.services.port_call_service import (
    PortCallService,
    PortCallCreateData,
    PortCallUpdateData,
)
from src.modules.port_call.models.port_call import PortCallStatus

router = APIRouter()


# --- Pydantic DTOs ---


class PortCallCreateDTO(BaseModel):
    port_id: uuid.UUID
    itinerary_line_id: Optional[uuid.UUID] = None
    eta: Optional[datetime] = None
    etd: Optional[datetime] = None
    ops_notes: Optional[str] = None


class PortCallUpdateDTO(BaseModel):
    status: Optional[str] = None
    eta: Optional[datetime] = None
    etd: Optional[datetime] = None
    ata: Optional[datetime] = None
    anchored_datetime: Optional[datetime] = None
    atb: Optional[datetime] = None
    cargo_ops_started_datetime: Optional[datetime] = None
    cargo_ops_completed_datetime: Optional[datetime] = None
    atd: Optional[datetime] = None
    nor_tendered_datetime: Optional[datetime] = None
    nor_accepted_datetime: Optional[datetime] = None
    free_pratique_granted: Optional[bool] = None
    free_pratique_granted_datetime: Optional[datetime] = None
    customs_cleared: Optional[bool] = None
    customs_cleared_datetime: Optional[datetime] = None
    ops_notes: Optional[str] = None
    correction_reason: Optional[str] = None


class PortCallResponseDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    port_id: uuid.UUID
    itinerary_line_id: Optional[uuid.UUID] = None
    status: str
    eta: Optional[datetime] = None
    etd: Optional[datetime] = None
    ata: Optional[datetime] = None
    anchored_datetime: Optional[datetime] = None
    atb: Optional[datetime] = None
    cargo_ops_started_datetime: Optional[datetime] = None
    cargo_ops_completed_datetime: Optional[datetime] = None
    atd: Optional[datetime] = None
    timezone_name: str
    timezone_offset_minutes: Optional[int] = None
    nor_tendered_datetime: Optional[datetime] = None
    nor_accepted_datetime: Optional[datetime] = None
    free_pratique_granted: bool
    free_pratique_granted_datetime: Optional[datetime] = None
    customs_cleared: bool
    customs_cleared_datetime: Optional[datetime] = None
    ops_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortCallTransitionDTO(BaseModel):
    to: str
    at: Optional[datetime] = None


# --- Routes ---

# Nested under voyage
voyage_router = APIRouter(prefix="/voyages/{voyage_id}/port-calls")


@voyage_router.post(
    "", response_model=PortCallResponseDTO, status_code=status.HTTP_201_CREATED
)
async def create_port_call(
    voyage_id: uuid.UUID,
    data: PortCallCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PortCallResponseDTO:
    service = PortCallService(session)
    create_data: PortCallCreateData = {
        "voyage_id": voyage_id,
        "port_id": data.port_id,
        "itinerary_line_id": data.itinerary_line_id,
        "eta": data.eta,
        "etd": data.etd,
        "ops_notes": data.ops_notes,
    }
    pc = await service.create(create_data)
    return PortCallResponseDTO.model_validate(pc)


@voyage_router.get("", response_model=List[PortCallResponseDTO])
async def list_port_calls(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[PortCallResponseDTO]:
    service = PortCallService(session)
    port_calls = await service.list_for_voyage(voyage_id)
    return [PortCallResponseDTO.model_validate(pc) for pc in port_calls]


# Top-level member routes
member_router = APIRouter(prefix="/port-calls")


@member_router.get("/{port_call_id}", response_model=PortCallResponseDTO)
async def get_port_call(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PortCallResponseDTO:
    service = PortCallService(session)
    pc = await service.get(port_call_id)
    return PortCallResponseDTO.model_validate(pc)


@member_router.patch("/{port_call_id}", response_model=PortCallResponseDTO)
async def update_port_call(
    port_call_id: uuid.UUID,
    data: PortCallUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PortCallResponseDTO:
    service = PortCallService(session)

    # Extract caller roles
    caller_roles = {ur.role.name for ur in current_user.user_roles if ur.role}

    # Check if this is a correction (backward status change)
    # The service layer handles the logic, but we need to check roles here for the 403.
    if data.status:
        pc = await service.get(port_call_id)
        status_order = [
            PortCallStatus.PLANNED.value,
            PortCallStatus.ARRIVED_AT_PILOT_STATION.value,
            PortCallStatus.AT_ANCHOR.value,
            PortCallStatus.BERTHED.value,
            PortCallStatus.CARGO_OPS_COMPLETED.value,
            PortCallStatus.DEPARTED.value,
        ]
        try:
            current_idx = status_order.index(pc.status)
            new_idx = status_order.index(data.status)
            if new_idx < current_idx:
                # Backward change
                if not any(r in caller_roles for r in {"Admin", "Operations"}):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only Admin or Operations can perform backward status corrections",
                    )
        except ValueError:
            # Invalid status in DTO, service layer will catch it
            pass

    update_data: PortCallUpdateData = {
        k: v for k, v in data.model_dump().items() if v is not None
    }  # type: ignore

    pc = await service.update(port_call_id, update_data, caller_roles)
    return PortCallResponseDTO.model_validate(pc)


@member_router.post("/{port_call_id}/transition", response_model=PortCallResponseDTO)
async def transition_port_call(
    port_call_id: uuid.UUID,
    data: PortCallTransitionDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PortCallResponseDTO:
    service = PortCallService(session)
    pc = await service.transition_status(port_call_id, data.to, data.at)
    return PortCallResponseDTO.model_validate(pc)
