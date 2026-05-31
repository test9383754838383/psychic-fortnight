import uuid
from datetime import date
from typing import List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.master_data import (
    validate_agent_active_with_role,
    CounterpartyNotFoundError,
)
from src.modules.port_call.exceptions import (
    AgentAppointmentNotFoundError,
    IllegalAgentAppointmentTransitionError,
    DuplicateActiveAppointmentError,
    AgentRoleError,
)
from src.modules.port_call.models.agent_appointment import (
    AgentAppointment,
    AgentAppointmentStatus,
)
from src.modules.port_call.repositories.agent_appointment_repository import (
    AgentAppointmentRepository,
)
from src.modules.port_call.repositories.port_call_repository import PortCallRepository


class AgentAppointmentCreateData(TypedDict, total=False):
    agent_ref: uuid.UUID
    appointed_date: date
    agent_appointment_ref: Optional[str]


class AgentAppointmentService:
    def __init__(self, session: AsyncSession):
        self.repository = AgentAppointmentRepository(session=session)
        self.port_call_repository = PortCallRepository(session=session)
        self.session = session

    async def nominate(
        self, port_call_id: uuid.UUID, data: AgentAppointmentCreateData
    ) -> AgentAppointment:
        # Validate agent
        try:
            await validate_agent_active_with_role(self.session, data["agent_ref"])
        except CounterpartyNotFoundError:
            # We wrap the generic not found/inactive in a more specific AgentRoleError
            # if we want, or just let it through. Specs say AgentRoleError (422).
            raise AgentRoleError(str(data["agent_ref"]))

        # Guard: reject if a non-cancelled appointment already exists (D-LOCK-7)
        active = await self.repository.get_active_for_port_call(str(port_call_id))
        if active:
            raise DuplicateActiveAppointmentError(str(port_call_id))

        appointment = AgentAppointment(
            port_call_id=port_call_id,
            agent_ref=data["agent_ref"],
            appointed_date=data["appointed_date"],
            agent_appointment_ref=data.get("agent_appointment_ref"),
            status=AgentAppointmentStatus.NOMINATED.value,
        )

        await self.repository.add(appointment)
        await self.session.commit()
        await self.session.refresh(appointment)
        return appointment

    async def appoint(self, appointment_id: uuid.UUID) -> AgentAppointment:
        appointment = await self.repository.get_one_or_none(id=appointment_id)
        if not appointment:
            raise AgentAppointmentNotFoundError(str(appointment_id))

        if appointment.status != AgentAppointmentStatus.NOMINATED.value:
            raise IllegalAgentAppointmentTransitionError(
                appointment.status, AgentAppointmentStatus.APPOINTED.value
            )

        appointment.status = AgentAppointmentStatus.APPOINTED.value
        await self.repository.update(appointment)
        await self.session.commit()
        await self.session.refresh(appointment)
        return appointment

    async def cancel(self, appointment_id: uuid.UUID) -> AgentAppointment:
        appointment = await self.repository.get_one_or_none(id=appointment_id)
        if not appointment:
            raise AgentAppointmentNotFoundError(str(appointment_id))

        if appointment.status == AgentAppointmentStatus.CANCELLED.value:
            return appointment  # Idempotent

        appointment.status = AgentAppointmentStatus.CANCELLED.value
        await self.repository.update(appointment)
        await self.session.commit()
        await self.session.refresh(appointment)
        return appointment

    async def replace(
        self, port_call_id: uuid.UUID, data: AgentAppointmentCreateData
    ) -> AgentAppointment:
        """Cancel the active appointment then create a new one in one transaction (D-LOCK-7)."""
        active = await self.repository.get_active_for_port_call(str(port_call_id))
        if active:
            active.status = AgentAppointmentStatus.CANCELLED.value
            await self.repository.update(active)
            # No commit yet, we do it in one transaction

        # Validate new agent
        try:
            await validate_agent_active_with_role(self.session, data["agent_ref"])
        except CounterpartyNotFoundError:
            raise AgentRoleError(str(data["agent_ref"]))

        new_appointment = AgentAppointment(
            port_call_id=port_call_id,
            agent_ref=data["agent_ref"],
            appointed_date=data["appointed_date"],
            agent_appointment_ref=data.get("agent_appointment_ref"),
            status=AgentAppointmentStatus.NOMINATED.value,
        )

        await self.repository.add(new_appointment)
        await self.session.commit()
        await self.session.refresh(new_appointment)
        return new_appointment

    async def list_for_port_call(
        self, port_call_id: uuid.UUID
    ) -> List[AgentAppointment]:
        return await self.repository.get_many(port_call_id=port_call_id)

    async def get_active(self, port_call_id: uuid.UUID) -> Optional[AgentAppointment]:
        return await self.repository.get_active_for_port_call(str(port_call_id))
