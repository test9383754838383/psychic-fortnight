import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.operational_reporting.models.activity_report import (
    ActivityReport,
    ActivityReportBunker,
    ReportStatus,
    ReportType,
)
from src.modules.operational_reporting.services.activity_report_service import (
    ActivityReportService,
)

ReportTypeLiteral = Literal["COMMENCING", "NOON", "ARRIVAL", "DEPARTURE", "TERMINATING"]
FuelGradeLiteral = Literal["VLSFO", "LSMGO", "HSFO", "MGO", "LNG"]


# ── DTOs ──────────────────────────────────────────────────────────────────────

class BunkerLineReadDTO(BaseModel):
    id: uuid.UUID
    activity_report_id: uuid.UUID
    fuel_grade: str
    reported_rob_mt: Optional[Decimal] = None
    reported_consumption_mt: Optional[Decimal] = None
    received_mt: Optional[Decimal] = None
    sulphur_pct: Optional[Decimal] = None
    bdn_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ActivityReportReadDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    port_call_id: Optional[uuid.UUID] = None
    report_type: str
    report_datetime: datetime
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    wind_force: Optional[int] = None
    sea_state: Optional[int] = None
    swell: Optional[str] = None
    rpm: Optional[Decimal] = None
    slip_pct: Optional[Decimal] = None
    speed_kn: Optional[Decimal] = None
    distance_nm: Optional[Decimal] = None
    status: str
    approved_at: Optional[datetime] = None
    approved_by: Optional[uuid.UUID] = None
    bunker_lines: list[BunkerLineReadDTO] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ActivityReportCreateBody(BaseModel):
    report_type: ReportTypeLiteral
    report_datetime: datetime
    port_call_id: Optional[uuid.UUID] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    wind_force: Optional[int] = None
    sea_state: Optional[int] = None
    swell: Optional[str] = None
    rpm: Optional[float] = None
    slip_pct: Optional[float] = None
    speed_kn: Optional[float] = None
    distance_nm: Optional[float] = None


class ActivityReportUpdateBody(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    wind_force: Optional[int] = None
    sea_state: Optional[int] = None
    swell: Optional[str] = None
    rpm: Optional[float] = None
    slip_pct: Optional[float] = None
    speed_kn: Optional[float] = None
    distance_nm: Optional[float] = None


class BunkerLineCreateBody(BaseModel):
    fuel_grade: FuelGradeLiteral
    reported_rob_mt: Optional[float] = None
    reported_consumption_mt: Optional[float] = None
    received_mt: Optional[float] = None
    sulphur_pct: Optional[float] = None
    bdn_number: Optional[str] = None


class BunkerLineUpdateBody(BaseModel):
    reported_rob_mt: Optional[float] = None
    reported_consumption_mt: Optional[float] = None
    received_mt: Optional[float] = None
    sulphur_pct: Optional[float] = None
    bdn_number: Optional[str] = None


def _d(v: Optional[float]) -> Optional[Decimal]:
    return Decimal(str(v)) if v is not None else None


def _report_dto(r: ActivityReport) -> ActivityReportReadDTO:
    return ActivityReportReadDTO.model_validate(r)


def _line_dto(l: ActivityReportBunker) -> BunkerLineReadDTO:
    return BunkerLineReadDTO.model_validate(l)


# ── routers ───────────────────────────────────────────────────────────────────

voyage_router = APIRouter(prefix="/voyages/{voyage_id}/activity-reports")
member_router = APIRouter(prefix="/activity-reports")
bunker_line_router = APIRouter(prefix="/activity-report-bunkers")


@voyage_router.get("", response_model=list[ActivityReportReadDTO], tags=["activity-reports"])
async def list_activity_reports(
    voyage_id: uuid.UUID,
    report_status: Optional[str] = Query(None, alias="status"),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ActivityReportReadDTO]:
    del current_user
    svc = ActivityReportService(session)
    reports = await svc.list_for_voyage(voyage_id, status=report_status)
    return [_report_dto(r) for r in reports]


@voyage_router.post(
    "", response_model=ActivityReportReadDTO,
    status_code=status.HTTP_201_CREATED, tags=["activity-reports"]
)
async def create_activity_report(
    voyage_id: uuid.UUID,
    body: ActivityReportCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ActivityReportReadDTO:
    del current_user
    svc = ActivityReportService(session)
    report = await svc.create(
        voyage_id=voyage_id,
        port_call_id=body.port_call_id,
        report_type=ReportType(body.report_type),
        report_datetime=body.report_datetime,
        latitude=_d(body.latitude),
        longitude=_d(body.longitude),
        wind_force=body.wind_force,
        sea_state=body.sea_state,
        swell=body.swell,
        rpm=_d(body.rpm),
        slip_pct=_d(body.slip_pct),
        speed_kn=_d(body.speed_kn),
        distance_nm=_d(body.distance_nm),
    )
    return _report_dto(report)


@member_router.get("/{report_id}", response_model=ActivityReportReadDTO, tags=["activity-reports"])
async def get_activity_report(
    report_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ActivityReportReadDTO:
    del current_user
    svc = ActivityReportService(session)
    return _report_dto(await svc.get(report_id))


@member_router.patch("/{report_id}", response_model=ActivityReportReadDTO, tags=["activity-reports"])
async def update_activity_report(
    report_id: uuid.UUID,
    body: ActivityReportUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ActivityReportReadDTO:
    del current_user
    svc = ActivityReportService(session)
    report = await svc.update(
        report_id,
        latitude=_d(body.latitude),
        longitude=_d(body.longitude),
        wind_force=body.wind_force,
        sea_state=body.sea_state,
        swell=body.swell,
        rpm=_d(body.rpm),
        slip_pct=_d(body.slip_pct),
        speed_kn=_d(body.speed_kn),
        distance_nm=_d(body.distance_nm),
    )
    return _report_dto(report)


@member_router.post("/{report_id}/submit", response_model=ActivityReportReadDTO, tags=["activity-reports"])
async def submit_activity_report(
    report_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ActivityReportReadDTO:
    del current_user
    svc = ActivityReportService(session)
    return _report_dto(await svc.submit(report_id))


@member_router.post("/{report_id}/approve", response_model=ActivityReportReadDTO, tags=["activity-reports"])
async def approve_activity_report(
    report_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ActivityReportReadDTO:
    svc = ActivityReportService(session)
    return _report_dto(await svc.approve(report_id, current_user))


@member_router.post(
    "/{report_id}/bunker-lines",
    response_model=BunkerLineReadDTO,
    status_code=status.HTTP_201_CREATED,
    tags=["activity-reports"],
)
async def add_bunker_line(
    report_id: uuid.UUID,
    body: BunkerLineCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerLineReadDTO:
    del current_user
    svc = ActivityReportService(session)
    line = await svc.add_bunker_line(
        report_id=report_id,
        fuel_grade=body.fuel_grade,
        reported_rob_mt=_d(body.reported_rob_mt),
        reported_consumption_mt=_d(body.reported_consumption_mt),
        received_mt=_d(body.received_mt),
        sulphur_pct=_d(body.sulphur_pct),
        bdn_number=body.bdn_number,
    )
    return _line_dto(line)


@bunker_line_router.patch("/{line_id}", response_model=BunkerLineReadDTO, tags=["activity-reports"])
async def update_bunker_line(
    line_id: uuid.UUID,
    body: BunkerLineUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerLineReadDTO:
    del current_user
    svc = ActivityReportService(session)
    line = await svc.update_bunker_line(
        line_id,
        reported_rob_mt=_d(body.reported_rob_mt),
        reported_consumption_mt=_d(body.reported_consumption_mt),
        received_mt=_d(body.received_mt),
        sulphur_pct=_d(body.sulphur_pct),
        bdn_number=body.bdn_number,
    )
    return _line_dto(line)


@bunker_line_router.delete(
    "/{line_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["activity-reports"]
)
async def delete_bunker_line(
    line_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    del current_user
    svc = ActivityReportService(session)
    await svc.delete_bunker_line(line_id)
