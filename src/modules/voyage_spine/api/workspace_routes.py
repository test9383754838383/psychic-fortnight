import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.voyage_spine.services.workspace_query import WorkspaceQueryService
from src.modules.voyage_spine.schemas.workspace import VoyageWorkspaceResponse

router = APIRouter()


@router.get("/{voyage_id}/workspace", response_model=VoyageWorkspaceResponse)
async def get_workspace(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VoyageWorkspaceResponse:
    service = WorkspaceQueryService(session)
    return await service.get_workspace(voyage_id)
