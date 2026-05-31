from typing import Optional
from sqlalchemy import select
from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from src.modules.port_call.models.agent_appointment import (
    AgentAppointment,
    AgentAppointmentStatus,
)


class AgentAppointmentRepository(SQLAlchemyAsyncRepository[AgentAppointment]):
    model_type = AgentAppointment

    async def get_active_for_port_call(
        self, port_call_id: str
    ) -> Optional[AgentAppointment]:
        """Get the latest non-cancelled appointment for a port call."""
        stmt = (
            select(AgentAppointment)
            .where(
                AgentAppointment.port_call_id == port_call_id,
                AgentAppointment.status != AgentAppointmentStatus.CANCELLED.value,
            )
            .order_by(AgentAppointment.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
