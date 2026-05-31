import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.checklists.service.checklist_service import ChecklistService

ChecklistTypeLiteral = Literal[
    "Pre-Arrival",
    "Pre-Departure",
]


class ChecklistCreateDTO(BaseModel):
    checklist_type: ChecklistTypeLiteral


class ChecklistItemReadDTO(BaseModel):
    id: uuid.UUID
    checklist_id: uuid.UUID
    sequence_no: int
    item_name: str
    status: str
    signed_off_at: datetime | None = None
    signed_off_by: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class ChecklistReadDTO(BaseModel):
    id: uuid.UUID
    port_call_id: uuid.UUID
    checklist_type: str
    status: str
    created_at: datetime
    items: list[ChecklistItemReadDTO]

    model_config = ConfigDict(from_attributes=True)


port_call_router = APIRouter(prefix="/port-calls/{port_call_id}/checklists")
member_router = APIRouter(prefix="/checklists")
item_router = APIRouter(prefix="/checklist-items")


@port_call_router.post(
    "",
    response_model=ChecklistReadDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_checklist(
    port_call_id: uuid.UUID,
    data: ChecklistCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChecklistReadDTO:
    service = ChecklistService(session)
    checklist = await service.create(port_call_id, data.checklist_type, current_user)
    return ChecklistReadDTO.model_validate(checklist)


@port_call_router.get("", response_model=list[ChecklistReadDTO])
async def list_checklists(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ChecklistReadDTO]:
    del current_user
    service = ChecklistService(session)
    checklists = await service.list_by_port_call(port_call_id)
    return [ChecklistReadDTO.model_validate(checklist) for checklist in checklists]


@member_router.get("/{checklist_id}", response_model=ChecklistReadDTO)
async def get_checklist(
    checklist_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChecklistReadDTO:
    del current_user
    service = ChecklistService(session)
    checklist = await service.get_one(checklist_id)
    return ChecklistReadDTO.model_validate(checklist)


@item_router.post("/{item_id}/sign-off", response_model=ChecklistItemReadDTO)
async def sign_off_checklist_item(
    item_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChecklistItemReadDTO:
    service = ChecklistService(session)
    item = await service.sign_off(item_id, current_user)
    return ChecklistItemReadDTO.model_validate(item)
