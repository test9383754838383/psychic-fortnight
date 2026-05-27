from fastapi import APIRouter
from .api.vessels import router as vessels_router

router = APIRouter()

# Vessels router will be included here in M1
router.include_router(vessels_router, prefix="/vessels", tags=["vessels"])
