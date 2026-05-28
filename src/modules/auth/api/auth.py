from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.config import settings
from src.dependencies import get_db_session, get_current_user
from src.modules.auth.api.dto import LoginDTO, UserResponseDTO
from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address, enabled=not settings.TESTING)


@router.post("/login", response_model=UserResponseDTO)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(
    request: Request,
    response: Response,
    data: LoginDTO,
    db_session: AsyncSession = Depends(get_db_session),
) -> UserResponseDTO:
    auth_service = AuthService(db_session)
    user = await auth_service.authenticate(data.username, data.password)
    session_record = await auth_service.create_session(user.id)

    response.set_cookie(
        key="session_id",
        value=session_record.session_id,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600,
        path="/",
    )
    return UserResponseDTO.model_validate(user)


@router.get("/me", response_model=UserResponseDTO)
async def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    session_id = request.cookies.get("session_id")
    if session_id:
        auth_service = AuthService(db_session)
        await auth_service.delete_session(session_id)

    response.delete_cookie("session_id", path="/")
    return {"message": "Logged out"}
