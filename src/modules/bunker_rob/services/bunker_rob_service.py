import uuid
from decimal import Decimal
from typing import Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.bunker_rob.exceptions import BunkerRobNotFoundError, InvalidFuelGradeError
from src.modules.bunker_rob.models.bunker_rob import FUEL_GRADES, PortCallBunkerRob
from src.modules.bunker_rob.repositories.bunker_rob_repository import BunkerRobRepository
from src.modules.voyage_spine import validate_voyage_exists

_VALID_GRADES = set(FUEL_GRADES)


class BunkerRobCreateData(TypedDict, total=False):
    port_call_id: uuid.UUID
    voyage_id: uuid.UUID
    fuel_grade: str
    rob_arrival_mt: Optional[Decimal]
    received_mt: Optional[Decimal]
    port_consumption_mt: Optional[Decimal]
    rob_departure_mt: Optional[Decimal]
    sulphur_pct: Optional[Decimal]
    bdn_number: Optional[str]


class BunkerRobUpdateData(TypedDict, total=False):
    rob_arrival_mt: Optional[Decimal]
    received_mt: Optional[Decimal]
    port_consumption_mt: Optional[Decimal]
    rob_departure_mt: Optional[Decimal]
    sulphur_pct: Optional[Decimal]
    bdn_number: Optional[str]


class BunkerRobService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = BunkerRobRepository(session=session)

    def calculated_port_consumption(self, rob: PortCallBunkerRob) -> Optional[Decimal]:
        if rob.rob_arrival_mt is None or rob.received_mt is None or rob.rob_departure_mt is None:
            return None
        return rob.rob_arrival_mt + rob.received_mt - rob.rob_departure_mt

    def variance(self, rob: PortCallBunkerRob) -> Optional[Decimal]:
        calc = self.calculated_port_consumption(rob)
        if calc is None or rob.port_consumption_mt is None:
            return None
        return rob.port_consumption_mt - calc

    async def create(self, data: BunkerRobCreateData) -> PortCallBunkerRob:
        fuel_grade = data["fuel_grade"]
        if fuel_grade not in _VALID_GRADES:
            raise InvalidFuelGradeError(fuel_grade)

        await validate_voyage_exists(self.session, data["voyage_id"])

        rob = PortCallBunkerRob(
            port_call_id=data["port_call_id"],
            voyage_id=data["voyage_id"],
            fuel_grade=fuel_grade,
            rob_arrival_mt=data.get("rob_arrival_mt"),
            received_mt=data.get("received_mt"),
            port_consumption_mt=data.get("port_consumption_mt"),
            rob_departure_mt=data.get("rob_departure_mt"),
            sulphur_pct=data.get("sulphur_pct"),
            bdn_number=data.get("bdn_number"),
        )
        await self.repository.add(rob)
        await self.session.commit()
        await self.session.refresh(rob)
        return rob

    async def get(self, rob_id: uuid.UUID) -> PortCallBunkerRob:
        rob = await self.repository.get_one_or_none(id=rob_id)
        if not rob:
            raise BunkerRobNotFoundError(str(rob_id))
        return rob

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[PortCallBunkerRob]:
        return await self.repository.list_for_voyage(voyage_id)

    async def list_for_port_call(self, port_call_id: uuid.UUID) -> list[PortCallBunkerRob]:
        return await self.repository.list_for_port_call(port_call_id)

    async def update(self, rob_id: uuid.UUID, data: BunkerRobUpdateData) -> PortCallBunkerRob:
        rob = await self.get(rob_id)

        for field in ("rob_arrival_mt", "received_mt", "port_consumption_mt", "rob_departure_mt", "sulphur_pct", "bdn_number"):
            if field in data:
                setattr(rob, field, data[field])  # type: ignore[literal-required]

        await self.repository.update(rob)
        await self.session.commit()
        await self.session.refresh(rob)
        return rob

    async def delete(self, rob_id: uuid.UUID) -> None:
        await self.get(rob_id)
        await self.repository.delete_by_id(rob_id)
        await self.session.commit()
