import uuid
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session, require_role
from src.modules.auth.repositories.user_repository import UserRepository

router = APIRouter(tags=["users"])


class UserSummaryDTO(BaseModel):
    id: uuid.UUID
    username: str


@router.get(
    "/users",
    response_model=List[UserSummaryDTO],
    dependencies=[Depends(require_role({"Operations", "Admin"}))],
)
async def list_users(
    db_session: AsyncSession = Depends(get_db_session),
) -> List[UserSummaryDTO]:
    user_repo = UserRepository(session=db_session)
    users = await user_repo.get_many()
    return [UserSummaryDTO(id=u.id, username=u.username) for u in users]
