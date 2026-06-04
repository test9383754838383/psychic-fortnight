import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.bunker_rob.models.bunker_rob import FuelGrade
from src.modules.bunker_rob.services.bunker_rob_service import (
    BunkerRobService,
    BunkerRobCreateData,
    BunkerRobUpdateData,
)

FuelGradeLiteral = Literal["VLSFO", "LSMGO", "HSFO", "MGO", "LNG"]


class BunkerRobCreateBody(BaseModel):
    port_call_id: uuid.UUID
    fuel_grade: FuelGradeLiteral
    rob_arrival_mt: Optional[float] = None
    received_mt: Optional[float] = None
    port_consumption_mt: Optional[float] = None
    rob_departure_mt: Optional[float] = None
    sulphur_pct: Optional[float] = None
    bdn_number: Optional[str] = None


class BunkerRobUpdateBody(BaseModel):
    rob_arrival_mt: Optional[float] = None
    received_mt: Optional[float] = None
    port_consumption_mt: Optional[float] = None
    rob_departure_mt: Optional[float] = None
    sulphur_pct: Optional[float] = None
    bdn_number: Optional[str] = None


class BunkerRobReadDTO(BaseModel):
    id: uuid.UUID
    port_call_id: uuid.UUID
    voyage_id: uuid.UUID
    fuel_grade: str
    rob_arrival_mt: Optional[Decimal] = None
    received_mt: Optional[Decimal] = None
    port_consumption_mt: Optional[Decimal] = None
    rob_departure_mt: Optional[Decimal] = None
    sulphur_pct: Optional[Decimal] = None
    bdn_number: Optional[str] = None
    calculated_port_consumption_mt: Optional[Decimal] = None
    variance_mt: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


def _to_dto(service: BunkerRobService, rob: object) -> BunkerRobReadDTO:
    from src.modules.bunker_rob.models.bunker_rob import PortCallBunkerRob
    assert isinstance(rob, PortCallBunkerRob)
    return BunkerRobReadDTO(
        id=rob.id,
        port_call_id=rob.port_call_id,
        voyage_id=rob.voyage_id,
        fuel_grade=rob.fuel_grade,
        rob_arrival_mt=rob.rob_arrival_mt,
        received_mt=rob.received_mt,
        port_consumption_mt=rob.port_consumption_mt,
        rob_departure_mt=rob.rob_departure_mt,
        sulphur_pct=rob.sulphur_pct,
        bdn_number=rob.bdn_number,
        calculated_port_consumption_mt=service.calculated_port_consumption(rob),
        variance_mt=service.variance(rob),
        created_at=rob.created_at,
        updated_at=rob.updated_at,
    )


voyage_router = APIRouter(prefix="/voyages/{voyage_id}/bunker-robs")
port_call_router = APIRouter(prefix="/port-calls/{port_call_id}/bunker-robs")
member_router = APIRouter(prefix="/bunker-robs")


@voyage_router.get("", response_model=list[BunkerRobReadDTO], tags=["bunker-robs"])
async def list_for_voyage(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[BunkerRobReadDTO]:
    del current_user
    service = BunkerRobService(session)
    robs = await service.list_for_voyage(voyage_id)
    return [_to_dto(service, r) for r in robs]


@voyage_router.post(
    "", response_model=BunkerRobReadDTO, status_code=status.HTTP_201_CREATED, tags=["bunker-robs"]
)
async def create_bunker_rob(
    voyage_id: uuid.UUID,
    body: BunkerRobCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRobReadDTO:
    del current_user
    service = BunkerRobService(session)
    data: BunkerRobCreateData = {
        "port_call_id": body.port_call_id,
        "voyage_id": voyage_id,
        "fuel_grade": body.fuel_grade,
        "rob_arrival_mt": Decimal(str(body.rob_arrival_mt)) if body.rob_arrival_mt is not None else None,
        "received_mt": Decimal(str(body.received_mt)) if body.received_mt is not None else None,
        "port_consumption_mt": Decimal(str(body.port_consumption_mt)) if body.port_consumption_mt is not None else None,
        "rob_departure_mt": Decimal(str(body.rob_departure_mt)) if body.rob_departure_mt is not None else None,
        "sulphur_pct": Decimal(str(body.sulphur_pct)) if body.sulphur_pct is not None else None,
        "bdn_number": body.bdn_number,
    }
    rob = await service.create(data)
    return _to_dto(service, rob)


@port_call_router.get("", response_model=list[BunkerRobReadDTO], tags=["bunker-robs"])
async def list_for_port_call(
    port_call_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[BunkerRobReadDTO]:
    del current_user
    service = BunkerRobService(session)
    robs = await service.list_for_port_call(port_call_id)
    return [_to_dto(service, r) for r in robs]


@member_router.get("/{rob_id}", response_model=BunkerRobReadDTO, tags=["bunker-robs"])
async def get_bunker_rob(
    rob_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRobReadDTO:
    del current_user
    service = BunkerRobService(session)
    rob = await service.get(rob_id)
    return _to_dto(service, rob)


@member_router.patch("/{rob_id}", response_model=BunkerRobReadDTO, tags=["bunker-robs"])
async def update_bunker_rob(
    rob_id: uuid.UUID,
    body: BunkerRobUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BunkerRobReadDTO:
    del current_user
    service = BunkerRobService(session)
    update_data: BunkerRobUpdateData = {}  # type: ignore
    if body.rob_arrival_mt is not None:
        update_data["rob_arrival_mt"] = Decimal(str(body.rob_arrival_mt))
    if body.received_mt is not None:
        update_data["received_mt"] = Decimal(str(body.received_mt))
    if body.port_consumption_mt is not None:
        update_data["port_consumption_mt"] = Decimal(str(body.port_consumption_mt))
    if body.rob_departure_mt is not None:
        update_data["rob_departure_mt"] = Decimal(str(body.rob_departure_mt))
    if body.sulphur_pct is not None:
        update_data["sulphur_pct"] = Decimal(str(body.sulphur_pct))
    if body.bdn_number is not None:
        update_data["bdn_number"] = body.bdn_number
    rob = await service.update(rob_id, update_data)
    return _to_dto(service, rob)


@member_router.delete("/{rob_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["bunker-robs"])
async def delete_bunker_rob(
    rob_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    del current_user
    service = BunkerRobService(session)
    await service.delete(rob_id)
