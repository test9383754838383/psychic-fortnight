from fastapi import APIRouter
from .api.vessels import router as vessels_router
from .api.ports import router as ports_router
from .api.counterparties import router as counterparties_router

router = APIRouter()

router.include_router(vessels_router, prefix="/vessels", tags=["vessels"])
router.include_router(ports_router, prefix="/ports", tags=["ports"])
router.include_router(
    counterparties_router, prefix="/counterparties", tags=["counterparties"]
)
