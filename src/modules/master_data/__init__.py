# Public Surface Exports
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.master_data.services.vessel_service import VesselService
from src.modules.master_data.services.port_service import PortService
from src.modules.master_data.services.counterparty_service import CounterpartyService
from src.modules.master_data.models.vessel import VesselStatus, VesselType
from src.modules.master_data.models.port import PortStatus
from src.modules.master_data.models.counterparty import CounterpartyStatus
from src.modules.master_data.models.counterparty_role import CounterpartyRoleEnum
from src.modules.master_data.exceptions import (
    VesselNotFoundError,
    PortNotFoundError,
    CounterpartyNotFoundError,
)

__all__ = [
    "VesselService",
    "PortService",
    "CounterpartyService",
    "VesselStatus",
    "VesselType",
    "PortStatus",
    "CounterpartyStatus",
    "CounterpartyRoleEnum",
    "VesselNotFoundError",
    "PortNotFoundError",
    "CounterpartyNotFoundError",
    "validate_port_active",
    "validate_agent_active_with_role",
]


async def validate_port_active(session: AsyncSession, port_id: uuid.UUID) -> None:
    """Check if port exists and is Active."""
    service = PortService(session)
    port = await service.get(port_id)
    if port.status != PortStatus.ACTIVE.value:
        raise PortNotFoundError(f"{port_id} is Inactive")


async def validate_agent_active_with_role(
    session: AsyncSession, counterparty_id: uuid.UUID
) -> None:
    """Check if counterparty exists, is Active, and has the Agent role."""
    service = CounterpartyService(session)
    cp = await service.get(counterparty_id)
    if cp.status != CounterpartyStatus.ACTIVE.value:
        raise CounterpartyNotFoundError(f"{counterparty_id} is Inactive")

    roles = [r.role for r in cp.roles]
    if "Agent" not in roles:
        # We'll use CounterpartyNotFoundError for missing role per public surface constraint
        # The service layer in port_call can wrap this in AgentRoleError
        raise CounterpartyNotFoundError(
            f"{counterparty_id} does not have the Agent role"
        )
