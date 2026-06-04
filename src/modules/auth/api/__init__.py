from src.modules.auth.api.auth import router
from src.modules.auth.api.admin import router as admin_router
from src.modules.auth.api.users import router as users_router

__all__ = ["router", "admin_router", "users_router"]
