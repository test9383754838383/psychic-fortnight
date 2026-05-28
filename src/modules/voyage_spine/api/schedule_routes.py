from datetime import date
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.voyage_spine.services.schedule_query import ScheduleQueryService
from src.modules.voyage_spine.schemas.schedule import VesselScheduleResponse

router = APIRouter()


@router.get("", response_model=VesselScheduleResponse)
async def get_schedule(
    date_from: date = Query(...),
    date_to: date = Query(...),
    vessel_ids: Optional[List[uuid.UUID]] = Query(None),
    status: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VesselScheduleResponse:
    service = ScheduleQueryService(session)
    return await service.get_schedule(
        date_from=date_from,
        date_to=date_to,
        vessel_ids=vessel_ids,
        status=status,
        search=search,
    )
