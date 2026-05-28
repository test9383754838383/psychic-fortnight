from fastapi import APIRouter
from .api.vessels import router as vessels_router
from .api.ports import router as ports_router
from .api.counterparties import router as counterparties_router

# Public Surface Exports
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

router = APIRouter()

router.include_router(vessels_router, prefix="/vessels", tags=["vessels"])
router.include_router(ports_router, prefix="/ports", tags=["ports"])
router.include_router(
    counterparties_router, prefix="/counterparties", tags=["counterparties"]
)

__all__ = [
    "router",
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
]
