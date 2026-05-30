import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session, require_role
from src.modules.auth.models.user import User
from src.modules.operational_reporting.exceptions import AppendOnlyViolationError
from src.modules.operational_reporting.models.port_activity import (
    PortActivityEventType,
)
from src.modules.operational_reporting.services.port_activity_service import (
    ActivityLogCreateData,
    PortActivityCreateData,
    PortActivityService,
)


# ------------------------------------------------------------------ #
# DTOs                                                               #
# ------------------------------------------------------------------ #


class PortActivityCreateDTO(BaseModel):
    event_type: str
    event_timestamp: datetime
    notes: Optional[str] = None
    corrects_activity_id: Optional[uuid.UUID] = None
    correction_reason: Optional[str] = None


class PortActivityResponseDTO(BaseModel):
    id: uuid.UUID
    port_call_id: uuid.UUID
    event_type: str
    event_timestamp: datetime
    recorded_by_user_id: uuid.UUID
    notes: Optional[str] = None
    corrects_activity_id: Optional[uuid.UUID] = None
    correction_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityLogCreateDTO(BaseModel):
    narrative: str
    logged_at: Optional[datetime] = None


class ActivityLogResponseDTO(BaseModel):
    id: uuid.UUID
    port_call_id: uuid.UUID
    logged_by_user_id: uuid.UUID
    narrative: str
    logged_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------ #
# Router: POST/GET /port-calls/{id}/events                           #
# ------------------------------------------------------------------ #

port_call_events_router = APIRouter(prefix="/port-calls/{port_call_id}/events")


@port_call_events_router.post(
    "",
    response_model=PortActivityResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_port_activity_event(
    port_call_id: uuid.UUID,
    data: PortActivityCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role({"Operations", "Admin"})),
) -> PortActivityResponseDTO:
    """Create a port activity event. Requires Operations or Admin role."""
    service = PortActivityService(session)
    create_data: PortActivityCreateData = {
        "port_call_id": port_call_id,
        "event_type": data.event_type,
        "event_timestamp": data.event_timestamp,
        "recorded_by_user_id": current_user.id,
        "notes": data.notes,
        "corrects_activity_id": data.corrects_activity_id,
        "correction_reason": data.correction_reason,
    }
    event = await service.create_event(create_data)
    return PortActivityResponseDTO.model_validate(event)


@port_call_events_router.get("", response_model=List[PortActivityResponseDTO])
async def list_port_activity_events(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[PortActivityResponseDTO]:
    service = PortActivityService(session)
    events = await service.list_events(port_call_id)
    return [PortActivityResponseDTO.model_validate(e) for e in events]


# ------------------------------------------------------------------ #
# Router: POST/GET /port-calls/{id}/activity-log                     #
# ------------------------------------------------------------------ #

port_call_log_router = APIRouter(prefix="/port-calls/{port_call_id}/activity-log")


@port_call_log_router.post(
    "",
    response_model=ActivityLogResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def add_activity_log_entry(
    port_call_id: uuid.UUID,
    data: ActivityLogCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role({"Operations", "Admin"})),
) -> ActivityLogResponseDTO:
    service = PortActivityService(session)
    now = datetime.now(timezone.utc)
    log_data: ActivityLogCreateData = {
        "port_call_id": port_call_id,
        "logged_by_user_id": current_user.id,
        "narrative": data.narrative,
        "logged_at": data.logged_at or now,
    }
    entry = await service.add_log_entry(log_data)
    return ActivityLogResponseDTO.model_validate(entry)


@port_call_log_router.get("", response_model=List[ActivityLogResponseDTO])
async def list_activity_log_entries(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[ActivityLogResponseDTO]:
    service = PortActivityService(session)
    entries = await service.list_log_entries(port_call_id)
    return [ActivityLogResponseDTO.model_validate(e) for e in entries]


# ------------------------------------------------------------------ #
# 405 guard: no PUT/PATCH/DELETE on events or logs                   #
# ------------------------------------------------------------------ #


@port_call_events_router.put("/{event_id}", include_in_schema=False)
@port_call_events_router.patch("/{event_id}", include_in_schema=False)
@port_call_events_router.delete("/{event_id}", include_in_schema=False)
async def events_mutation_not_allowed(
    port_call_id: uuid.UUID,
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    raise AppendOnlyViolationError("PortActivity")


@port_call_log_router.put("/{entry_id}", include_in_schema=False)
@port_call_log_router.patch("/{entry_id}", include_in_schema=False)
@port_call_log_router.delete("/{entry_id}", include_in_schema=False)
async def log_mutation_not_allowed(
    port_call_id: uuid.UUID,
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    raise AppendOnlyViolationError("ActivityLog")


__all__ = [
    "PortActivityEventType",
    "PortActivityResponseDTO",
    "ActivityLogResponseDTO",
    "port_call_events_router",
    "port_call_log_router",
]
