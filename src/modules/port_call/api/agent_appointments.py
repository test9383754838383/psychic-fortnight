import uuid
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.port_call.services.agent_appointment_service import (
    AgentAppointmentService,
    AgentAppointmentCreateData,
)

router = APIRouter()


# --- Pydantic DTOs ---


class AgentAppointmentCreateDTO(BaseModel):
    agent_ref: uuid.UUID
    appointed_date: date
    agent_appointment_ref: Optional[str] = None


class AgentAppointmentResponseDTO(BaseModel):
    id: uuid.UUID
    port_call_id: uuid.UUID
    agent_ref: uuid.UUID
    appointed_date: date
    status: str
    agent_appointment_ref: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Routes ---

# Nested under port call
port_call_router = APIRouter(prefix="/port-calls/{port_call_id}/agent-appointments")


@port_call_router.get("", response_model=List[AgentAppointmentResponseDTO])
async def list_agent_appointments(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[AgentAppointmentResponseDTO]:
    service = AgentAppointmentService(session)
    appointments = await service.list_for_port_call(port_call_id)
    return [AgentAppointmentResponseDTO.model_validate(a) for a in appointments]


@port_call_router.post(
    "", response_model=AgentAppointmentResponseDTO, status_code=status.HTTP_201_CREATED
)
async def nominate_agent(
    port_call_id: uuid.UUID,
    data: AgentAppointmentCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AgentAppointmentResponseDTO:
    service = AgentAppointmentService(session)
    create_data: AgentAppointmentCreateData = {
        "agent_ref": data.agent_ref,
        "appointed_date": data.appointed_date,
        "agent_appointment_ref": data.agent_appointment_ref,
    }

    # Check if we should replace or nominate
    # The requirement says: "POST a new appointment while one is active ->
    # service cancels the current active appointment, then creates the new row"
    active = await service.get_active(port_call_id)
    if active:
        appointment = await service.replace(port_call_id, create_data)
    else:
        appointment = await service.nominate(port_call_id, create_data)

    return AgentAppointmentResponseDTO.model_validate(appointment)


# Top-level member routes
member_router = APIRouter(prefix="/agent-appointments")


@member_router.post("/{id}/cancel", response_model=AgentAppointmentResponseDTO)
async def cancel_agent_appointment(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AgentAppointmentResponseDTO:
    service = AgentAppointmentService(session)
    appointment = await service.cancel(id)
    return AgentAppointmentResponseDTO.model_validate(appointment)


@member_router.patch("/{id}/appoint", response_model=AgentAppointmentResponseDTO)
async def appoint_agent(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AgentAppointmentResponseDTO:
    service = AgentAppointmentService(session)
    appointment = await service.appoint(id)
    return AgentAppointmentResponseDTO.model_validate(appointment)
