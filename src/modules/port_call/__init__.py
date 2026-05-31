import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.port_call.api.port_calls import (
    voyage_router,
    member_router as pc_member_router,
)
from src.modules.port_call.api.agent_appointments import (
    port_call_router as pc_appointment_router,
    member_router as appointment_member_router,
)
from src.modules.port_call.models.port_call import PortCallStatus
from src.modules.port_call.models.agent_appointment import AgentAppointmentStatus
from src.modules.port_call.exceptions import PortCallNotFoundError

__all__ = [
    "voyage_router",
    "pc_member_router",
    "pc_appointment_router",
    "appointment_member_router",
    "PortCallStatus",
    "AgentAppointmentStatus",
    "validate_port_call_exists",
]


async def validate_port_call_exists(
    session: AsyncSession, port_call_id: uuid.UUID
) -> None:
    """Check if port call exists. Raises PortCallNotFoundError if not found."""
    from src.modules.port_call.repositories.port_call_repository import (
        PortCallRepository,
    )

    repo = PortCallRepository(session=session)
    pc = await repo.get_one_or_none(id=port_call_id)
    if not pc:
        raise PortCallNotFoundError(str(port_call_id))
