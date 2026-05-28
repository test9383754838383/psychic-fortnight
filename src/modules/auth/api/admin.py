import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.concurrency import run_in_threadpool

from src.dependencies import get_db_session, require_role
from src.modules.auth.api.dto import UserCreateDTO, UserUpdateDTO, UserResponseDTO
from src.modules.auth.services.auth_service import AuthService, ph
from src.modules.auth.repositories.user_repository import UserRepository
from src.modules.auth.exceptions import UserNotFoundError

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/users",
    response_model=UserResponseDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("Admin"))],
)
async def create_user(
    data: UserCreateDTO, db_session: AsyncSession = Depends(get_db_session)
) -> UserResponseDTO:
    auth_service = AuthService(db_session)
    user = await auth_service.create_user(data.username, data.password, data.role_names)
    return UserResponseDTO.model_validate(user)


@router.get(
    "/users",
    response_model=List[UserResponseDTO],
    dependencies=[Depends(require_role("Admin"))],
)
async def list_users(
    db_session: AsyncSession = Depends(get_db_session),
) -> List[UserResponseDTO]:
    user_repo = UserRepository(session=db_session)
    users = await user_repo.get_many()
    return [UserResponseDTO.model_validate(u) for u in users]


@router.patch(
    "/users/{id}",
    response_model=UserResponseDTO,
    dependencies=[Depends(require_role("Admin"))],
)
async def update_user(
    id: uuid.UUID,
    data: UserUpdateDTO,
    db_session: AsyncSession = Depends(get_db_session),
) -> UserResponseDTO:
    user_repo = UserRepository(session=db_session)
    user = await user_repo.get_one_or_none(id=id)
    if not user:
        raise UserNotFoundError(str(id))

    if data.username:
        user.username = data.username.lower()
    if data.password:
        user.hashed_password = await run_in_threadpool(ph.hash, data.password)
    if data.is_active is not None:
        user.is_active = data.is_active

    await user_repo.update(user)
    await db_session.commit()
    await db_session.refresh(user)
    return UserResponseDTO.model_validate(user)
