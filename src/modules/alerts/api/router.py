import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.alerts.constants import (
    ALERT_TYPES,
    LINKED_ENTITY_TYPES,
    SEVERITIES,
)
from src.modules.alerts.models.alert import Alert
from src.modules.alerts.service.alert_service import AlertService
from src.modules.alerts.service.dtos import (
    AlertCreateDTO,
    AlertListFilters,
    AlertResolveDTO,
)
from src.modules.auth.models.user import User

AlertTypeLiteral = Literal[
    "ETA Overdue",
    "Departure Overdue",
    "NOR Not Tendered",
    "Agent Not Confirmed",
    "Form Not Received",
    "Bunker Request Blocked",
    "Voyage Not Commenced",
    "Performance Deviation",
    "Consumption Deviation",
    "Noon Report Missing",
]

SeverityLiteral = Literal["Info", "Warning", "Critical"]

EntityTypeLiteral = Literal["Voyage", "PortCall", "Vessel"]

# Silence unused import warnings — these are used in type constraints
_ALERT_TYPES = ALERT_TYPES
_SEVERITIES = SEVERITIES
_LINKED_ENTITY_TYPES = LINKED_ENTITY_TYPES


class AlertCreateBody(BaseModel):
    linked_entity_type: EntityTypeLiteral
    linked_entity_id: uuid.UUID
    alert_type: AlertTypeLiteral
    message: str
    severity: SeverityLiteral


class AlertResolveBody(BaseModel):
    resolution_note: str | None = None


class AlertReadDTO(BaseModel):
    id: uuid.UUID
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    alert_type: str
    triggered_at: datetime
    message: str
    severity: str
    resolved_at: datetime | None = None
    resolved_by: uuid.UUID | None = None
    resolution_note: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, alert: Alert) -> "AlertReadDTO":
        return cls(
            id=alert.id,
            linked_entity_type=alert.linked_entity_type,
            linked_entity_id=alert.linked_entity_id,
            alert_type=alert.alert_type,
            triggered_at=alert.triggered_at,
            message=alert.message,
            severity=alert.severity,
            resolved_at=alert.resolved_at,
            resolved_by=alert.resolved_by,
            resolution_note=alert.resolution_note,
        )


alerts_router = APIRouter(prefix="/alerts")


@alerts_router.post(
    "",
    response_model=AlertReadDTO,
    status_code=status.HTTP_201_CREATED,
    tags=["alerts"],
)
async def create_alert(
    data: AlertCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertReadDTO:
    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=data.linked_entity_type,
        linked_entity_id=data.linked_entity_id,
        alert_type=data.alert_type,
        message=data.message,
        severity=data.severity,
    )
    alert = await service.create(dto, current_user)
    return AlertReadDTO.from_model(alert)


@alerts_router.get(
    "",
    response_model=list[AlertReadDTO],
    tags=["alerts"],
)
async def list_alerts(
    severity: SeverityLiteral | None = None,
    resolved: bool | None = None,
    entity_type: EntityTypeLiteral | None = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[AlertReadDTO]:
    del current_user
    service = AlertService(session)
    filters = AlertListFilters(
        severity=severity,
        resolved=resolved,
        entity_type=entity_type,
        limit=limit,
        offset=offset,
    )
    alerts = await service.list(filters)
    return [AlertReadDTO.from_model(a) for a in alerts]


@alerts_router.get(
    "/{alert_id}",
    response_model=AlertReadDTO,
    tags=["alerts"],
)
async def get_alert(
    alert_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertReadDTO:
    del current_user
    service = AlertService(session)
    alert = await service.get(alert_id)
    return AlertReadDTO.from_model(alert)


@alerts_router.post(
    "/{alert_id}/resolve",
    response_model=AlertReadDTO,
    tags=["alerts"],
)
async def resolve_alert(
    alert_id: uuid.UUID,
    data: AlertResolveBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertReadDTO:
    service = AlertService(session)
    dto = AlertResolveDTO(resolution_note=data.resolution_note)
    alert = await service.resolve(alert_id, dto, current_user)
    return AlertReadDTO.from_model(alert)
