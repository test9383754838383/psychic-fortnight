from typing import AsyncGenerator, Callable, Any, Union, Set
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from src.config import settings
from src.modules.auth.models.user import User

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    request: Request, db_session: AsyncSession = Depends(get_db_session)
) -> User:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    from src.modules.auth.services.auth_service import AuthService
    from src.modules.auth.exceptions import AuthError

    auth_service = AuthService(db_session)
    try:
        user = await auth_service.validate_session(session_id)
    except AuthError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )

    return user


def require_role(allowed: Union[str, Set[str]]) -> Callable[..., Any]:
    """Dependency factory. Accepts a single role name or a set of role names (OR logic).

    Usage:
        require_role("Admin")          — Admin only
        require_role({"Admin", "Operations"})  — Admin OR Operations
    """
    allowed_set: Set[str] = {allowed} if isinstance(allowed, str) else set(allowed)

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        user_roles = {ur.role.name for ur in user.user_roles if ur.role}
        if not user_roles.intersection(allowed_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return role_checker
