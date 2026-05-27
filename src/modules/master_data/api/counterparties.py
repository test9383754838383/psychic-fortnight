import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.master_data.services.counterparty_service import (
    AgentFields,
    CounterpartyCreateData,
    CounterpartyService,
    CounterpartyUpdateData,
)
from src.modules.master_data.models import ContactDict

router = APIRouter()


class ContactDTO(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    role_hint: Optional[str] = None


class CounterpartyCreateDTO(BaseModel):
    code: str
    name: str
    contacts: List[ContactDTO] = []


class CounterpartyUpdateDTO(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    contacts: Optional[List[ContactDTO]] = None


class CounterpartyRoleResponseDTO(BaseModel):
    id: uuid.UUID
    counterparty_id: uuid.UUID
    role: str
    ports_serviced: Optional[List[str]] = None
    nomination_contact_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CounterpartyResponseDTO(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    status: str
    contacts: List[ContactDTO] = []
    roles: List[CounterpartyRoleResponseDTO] = []

    model_config = ConfigDict(from_attributes=True)


class CounterpartyRoleAttachDTO(BaseModel):
    role: str
    ports_serviced: Optional[List[str]] = None
    nomination_contact_email: Optional[str] = None


@router.post(
    "", response_model=CounterpartyResponseDTO, status_code=status.HTTP_201_CREATED
)
async def create_counterparty(
    data: CounterpartyCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> CounterpartyResponseDTO:
    service = CounterpartyService(session)
    create_data: CounterpartyCreateData = {
        "code": data.code,
        "name": data.name,
        "contacts": [
            ContactDict(
                name=c.name,
                email=c.email,
                phone=c.phone,
                role_hint=c.role_hint,
            )
            for c in data.contacts
        ],
    }
    counterparty = await service.create(create_data)
    return CounterpartyResponseDTO.model_validate(counterparty)


@router.get("", response_model=List[CounterpartyResponseDTO])
async def list_counterparties(
    status: Optional[str] = None,
    role: Optional[str] = None,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> List[CounterpartyResponseDTO]:
    service = CounterpartyService(session)
    counterparties = await service.list(status=status, role=role)
    return [CounterpartyResponseDTO.model_validate(c) for c in counterparties]


@router.get("/{counterparty_id}", response_model=CounterpartyResponseDTO)
async def get_counterparty(
    counterparty_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> CounterpartyResponseDTO:
    service = CounterpartyService(session)
    counterparty = await service.get(counterparty_id)
    return CounterpartyResponseDTO.model_validate(counterparty)


@router.patch("/{counterparty_id}", response_model=CounterpartyResponseDTO)
async def update_counterparty(
    counterparty_id: uuid.UUID,
    data: CounterpartyUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> CounterpartyResponseDTO:
    service = CounterpartyService(session)

    update_data: CounterpartyUpdateData = {}
    if data.code is not None:
        update_data["code"] = data.code
    if data.name is not None:
        update_data["name"] = data.name
    if data.contacts is not None:
        update_data["contacts"] = [
            ContactDict(
                name=c.name,
                email=c.email,
                phone=c.phone,
                role_hint=c.role_hint,
            )
            for c in data.contacts
        ]

    counterparty = await service.update(counterparty_id, update_data)
    return CounterpartyResponseDTO.model_validate(counterparty)


@router.post("/{counterparty_id}/deactivate", response_model=CounterpartyResponseDTO)
async def deactivate_counterparty(
    counterparty_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> CounterpartyResponseDTO:
    service = CounterpartyService(session)
    counterparty = await service.deactivate(counterparty_id)
    return CounterpartyResponseDTO.model_validate(counterparty)


@router.post("/{counterparty_id}/roles", response_model=CounterpartyResponseDTO)
async def attach_role(
    counterparty_id: uuid.UUID,
    data: CounterpartyRoleAttachDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> CounterpartyResponseDTO:
    service = CounterpartyService(session)

    agent_fields: Optional[AgentFields] = None
    if data.role == "Agent":
        agent_fields = AgentFields(
            ports_serviced=data.ports_serviced or [],
            nomination_contact_email=data.nomination_contact_email or "",
        )
    else:
        if data.ports_serviced is not None or data.nomination_contact_email is not None:
            agent_fields = AgentFields()
            if data.ports_serviced is not None:
                agent_fields["ports_serviced"] = data.ports_serviced
            if data.nomination_contact_email is not None:
                agent_fields["nomination_contact_email"] = data.nomination_contact_email

    counterparty = await service.attach_role(
        counterparty_id=counterparty_id, role=data.role, agent_fields=agent_fields
    )
    return CounterpartyResponseDTO.model_validate(counterparty)


@router.delete(
    "/{counterparty_id}/roles/{role}", response_model=CounterpartyResponseDTO
)
async def detach_role(
    counterparty_id: uuid.UUID,
    role: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> CounterpartyResponseDTO:
    service = CounterpartyService(session)
    counterparty = await service.detach_role(counterparty_id=counterparty_id, role=role)
    return CounterpartyResponseDTO.model_validate(counterparty)
