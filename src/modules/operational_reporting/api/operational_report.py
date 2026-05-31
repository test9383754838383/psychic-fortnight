import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session, require_role
from src.modules.auth.models.user import User
from src.modules.operational_reporting.models.operational_report import (
    OperationalReportStatus,
    OperationalReportType,
)
from src.modules.operational_reporting.services.operational_report_service import (
    OperationalReportService,
    ReportCreateData,
    ReportUpdateData,
)


# ------------------------------------------------------------------ #
# DTOs                                                                 #
# ------------------------------------------------------------------ #


class ReportCreateDTO(BaseModel):
    report_type: str
    submitted_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    position_lat: Optional[Decimal] = None
    position_lon: Optional[Decimal] = None
    speed_24h: Optional[Decimal] = None
    distance_to_go: Optional[Decimal] = None
    eta_next_port: Optional[datetime] = None
    bunker_rob_total_mt: Optional[Decimal] = None
    raw_content_ref: Optional[str] = None
    supersedes_report_id: Optional[uuid.UUID] = None


class ReportUpdateDTO(BaseModel):
    submitted_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    position_lat: Optional[Decimal] = None
    position_lon: Optional[Decimal] = None
    speed_24h: Optional[Decimal] = None
    distance_to_go: Optional[Decimal] = None
    eta_next_port: Optional[datetime] = None
    bunker_rob_total_mt: Optional[Decimal] = None
    raw_content_ref: Optional[str] = None


class ReportTransitionDTO(BaseModel):
    status: str


class OperationalReportResponseDTO(BaseModel):
    id: uuid.UUID
    voyage_id: Optional[uuid.UUID] = None
    port_call_id: Optional[uuid.UUID] = None
    report_type: str
    status: str
    submitted_by_user_id: uuid.UUID
    submitted_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    position_lat: Optional[Decimal] = None
    position_lon: Optional[Decimal] = None
    speed_24h: Optional[Decimal] = None
    distance_to_go: Optional[Decimal] = None
    eta_next_port: Optional[datetime] = None
    bunker_rob_total_mt: Optional[Decimal] = None
    raw_content_ref: Optional[str] = None
    supersedes_report_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------ #
# Router: voyage-nested report collection                             #
# ------------------------------------------------------------------ #

voyage_reports_router = APIRouter(prefix="/voyages/{voyage_id}/reports")


@voyage_reports_router.post(
    "",
    response_model=OperationalReportResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_voyage_report(
    voyage_id: uuid.UUID,
    data: ReportCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role({"Operations", "Admin"})),
) -> OperationalReportResponseDTO:
    """Create a voyage-level report (Noon). Requires Operations or Admin role."""
    service = OperationalReportService(session)
    create_data: ReportCreateData = {
        "voyage_id": voyage_id,
        "port_call_id": None,
        "report_type": data.report_type,
        "submitted_by_user_id": current_user.id,
        "submitted_at": data.submitted_at,
        "received_at": data.received_at,
        "position_lat": data.position_lat,
        "position_lon": data.position_lon,
        "speed_24h": data.speed_24h,
        "distance_to_go": data.distance_to_go,
        "eta_next_port": data.eta_next_port,
        "bunker_rob_total_mt": data.bunker_rob_total_mt,
        "raw_content_ref": data.raw_content_ref,
        "supersedes_report_id": data.supersedes_report_id,
    }
    report = await service.create(create_data)
    return OperationalReportResponseDTO.model_validate(report)


@voyage_reports_router.get("", response_model=List[OperationalReportResponseDTO])
async def list_voyage_reports(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[OperationalReportResponseDTO]:
    service = OperationalReportService(session)
    reports = await service.list_for_voyage(voyage_id)
    return [OperationalReportResponseDTO.model_validate(r) for r in reports]


# ------------------------------------------------------------------ #
# Router: port-call-nested report collection                          #
# ------------------------------------------------------------------ #

port_call_reports_router = APIRouter(prefix="/port-calls/{port_call_id}/reports")


@port_call_reports_router.post(
    "",
    response_model=OperationalReportResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_port_call_report(
    port_call_id: uuid.UUID,
    data: ReportCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role({"Operations", "Admin"})),
) -> OperationalReportResponseDTO:
    """Create a port-call-level report. Requires Operations or Admin role."""
    service = OperationalReportService(session)
    create_data: ReportCreateData = {
        "voyage_id": None,
        "port_call_id": port_call_id,
        "report_type": data.report_type,
        "submitted_by_user_id": current_user.id,
        "submitted_at": data.submitted_at,
        "received_at": data.received_at,
        "position_lat": data.position_lat,
        "position_lon": data.position_lon,
        "speed_24h": data.speed_24h,
        "distance_to_go": data.distance_to_go,
        "eta_next_port": data.eta_next_port,
        "bunker_rob_total_mt": data.bunker_rob_total_mt,
        "raw_content_ref": data.raw_content_ref,
        "supersedes_report_id": data.supersedes_report_id,
    }
    report = await service.create(create_data)
    return OperationalReportResponseDTO.model_validate(report)


@port_call_reports_router.get("", response_model=List[OperationalReportResponseDTO])
async def list_port_call_reports(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> List[OperationalReportResponseDTO]:
    service = OperationalReportService(session)
    reports = await service.list_for_port_call(port_call_id)
    return [OperationalReportResponseDTO.model_validate(r) for r in reports]


# ------------------------------------------------------------------ #
# Router: top-level member routes GET/PATCH/transition                #
# ------------------------------------------------------------------ #

reports_member_router = APIRouter(prefix="/reports")


@reports_member_router.get("/{report_id}", response_model=OperationalReportResponseDTO)
async def get_report(
    report_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> OperationalReportResponseDTO:
    service = OperationalReportService(session)
    report = await service.get(report_id)
    return OperationalReportResponseDTO.model_validate(report)


@reports_member_router.patch(
    "/{report_id}", response_model=OperationalReportResponseDTO
)
async def update_report(
    report_id: uuid.UUID,
    data: ReportUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role({"Operations", "Admin"})),
) -> OperationalReportResponseDTO:
    """Update a Pending report. Requires Operations or Admin role."""
    service = OperationalReportService(session)
    from typing import cast

    update_data = cast(
        ReportUpdateData,
        {k: v for k, v in data.model_dump().items() if v is not None},
    )
    report = await service.update(report_id, update_data)
    return OperationalReportResponseDTO.model_validate(report)


@reports_member_router.post(
    "/{report_id}/transition", response_model=OperationalReportResponseDTO
)
async def transition_report(
    report_id: uuid.UUID,
    data: ReportTransitionDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role({"Operations", "Admin"})),
) -> OperationalReportResponseDTO:
    """Transition report status. Requires Operations or Admin role."""
    service = OperationalReportService(session)
    report = await service.transition_status(report_id, data.status)
    return OperationalReportResponseDTO.model_validate(report)


__all__ = [
    "OperationalReportType",
    "OperationalReportStatus",
    "OperationalReportResponseDTO",
    "voyage_reports_router",
    "port_call_reports_router",
    "reports_member_router",
]
