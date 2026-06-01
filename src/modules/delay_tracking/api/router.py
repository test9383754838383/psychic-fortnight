import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.delay_tracking.models.delay import Delay
from src.modules.delay_tracking.service.delay_service import DelayService
from src.modules.delay_tracking.service.dtos import DelayCreateDTO, DelayUpdateDTO

DelayTypeLiteral = Literal[
    "Weather",
    "Mechanical",
    "Port Congestion",
    "Awaiting Berth",
    "Awaiting Orders",
    "Cargo Operations",
    "Bunkering Delay",
    "Strike",
    "Deviation",
    "Piracy/Security",
    "Quarantine/Disease",
    "Other",
]

FaultAttributionLiteral = Literal[
    "Vessel",
    "Charterer",
    "Port",
    "Weather",
    "Force Majeure",
]


class DelayCreateBody(BaseModel):
    delay_type: DelayTypeLiteral
    fault_attribution: FaultAttributionLiteral
    start_datetime: datetime
    description: str
    end_datetime: datetime | None = None
    claimed_duration: float | None = None
    port_call_id: uuid.UUID | None = None
    leg_ref: str | None = None

    @model_validator(mode="after")
    def validate_anchor_xor(self) -> "DelayCreateBody":
        if self.port_call_id is not None and self.leg_ref is not None:
            raise ValueError(
                "port_call_id and leg_ref are mutually exclusive — set at most one."
            )
        return self


class DelayUpdateBody(BaseModel):
    delay_type: DelayTypeLiteral | None = None
    fault_attribution: FaultAttributionLiteral | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    claimed_duration: float | None = None
    description: str | None = None
    port_call_id: uuid.UUID | None = None
    leg_ref: str | None = None

    @model_validator(mode="after")
    def validate_anchor_xor(self) -> "DelayUpdateBody":
        if self.port_call_id is not None and self.leg_ref is not None:
            raise ValueError(
                "port_call_id and leg_ref are mutually exclusive — set at most one."
            )
        return self


def _compute_actual_duration(delay: Delay) -> float | None:
    """Derive actual_duration in hours from start/end_datetime. None if open."""
    if delay.end_datetime is None:
        return None
    delta = delay.end_datetime - delay.start_datetime
    hours = delta.total_seconds() / 3600
    return round(hours, 2)


class DelayReadDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    port_call_id: uuid.UUID | None = None
    leg_ref: str | None = None
    delay_type: str
    fault_attribution: str
    start_datetime: datetime
    end_datetime: datetime | None = None
    actual_duration: float | None = None
    claimed_duration: float | None = None
    description: str
    recorded_by: uuid.UUID
    approved_by: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, delay: Delay) -> "DelayReadDTO":
        return cls(
            id=delay.id,
            voyage_id=delay.voyage_id,
            port_call_id=delay.port_call_id,
            leg_ref=delay.leg_ref,
            delay_type=delay.delay_type,
            fault_attribution=delay.fault_attribution,
            start_datetime=delay.start_datetime,
            end_datetime=delay.end_datetime,
            actual_duration=_compute_actual_duration(delay),
            claimed_duration=(
                float(delay.claimed_duration)
                if delay.claimed_duration is not None
                else None
            ),
            description=delay.description,
            recorded_by=delay.recorded_by,
            approved_by=delay.approved_by,
        )


voyage_router = APIRouter(prefix="/voyages/{voyage_id}/delays")
member_router = APIRouter(prefix="/delays")


@voyage_router.post(
    "",
    response_model=DelayReadDTO,
    status_code=status.HTTP_201_CREATED,
    tags=["delays"],
)
async def create_delay(
    voyage_id: uuid.UUID,
    data: DelayCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DelayReadDTO:
    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=data.delay_type,
        fault_attribution=data.fault_attribution,
        start_datetime=data.start_datetime,
        description=data.description,
        end_datetime=data.end_datetime,
        claimed_duration=data.claimed_duration,
        port_call_id=data.port_call_id,
        leg_ref=data.leg_ref,
    )
    delay = await service.create(voyage_id, dto, current_user)
    return DelayReadDTO.from_model(delay)


@voyage_router.get(
    "",
    response_model=list[DelayReadDTO],
    tags=["delays"],
)
async def list_delays(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[DelayReadDTO]:
    del current_user
    service = DelayService(session)
    delays = await service.list_for_voyage(voyage_id)
    return [DelayReadDTO.from_model(d) for d in delays]


@member_router.get(
    "/{delay_id}",
    response_model=DelayReadDTO,
    tags=["delays"],
)
async def get_delay(
    delay_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DelayReadDTO:
    del current_user
    service = DelayService(session)
    delay = await service.get(delay_id)
    return DelayReadDTO.from_model(delay)


@member_router.patch(
    "/{delay_id}",
    response_model=DelayReadDTO,
    tags=["delays"],
)
async def update_delay(
    delay_id: uuid.UUID,
    data: DelayUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DelayReadDTO:
    service = DelayService(session)
    dto = DelayUpdateDTO(
        delay_type=data.delay_type,
        fault_attribution=data.fault_attribution,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        claimed_duration=data.claimed_duration,
        description=data.description,
        port_call_id=data.port_call_id,
        leg_ref=data.leg_ref,
    )
    delay = await service.update(delay_id, dto, current_user)
    return DelayReadDTO.from_model(delay)


@member_router.post(
    "/{delay_id}/approve",
    response_model=DelayReadDTO,
    tags=["delays"],
)
async def approve_delay(
    delay_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DelayReadDTO:
    service = DelayService(session)
    delay = await service.approve(delay_id, current_user)
    return DelayReadDTO.from_model(delay)
