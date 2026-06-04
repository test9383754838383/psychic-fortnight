import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.bunker_rob.models.bunker_rob import PortCallBunkerRob


class BunkerRobRepository(SQLAlchemyAsyncRepository[PortCallBunkerRob]):
    model_type = PortCallBunkerRob

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[PortCallBunkerRob]:
        stmt = (
            select(PortCallBunkerRob)
            .where(PortCallBunkerRob.voyage_id == voyage_id)
            .order_by(PortCallBunkerRob.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_port_call(self, port_call_id: uuid.UUID) -> list[PortCallBunkerRob]:
        stmt = (
            select(PortCallBunkerRob)
            .where(PortCallBunkerRob.port_call_id == port_call_id)
            .order_by(PortCallBunkerRob.fuel_grade)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_by_id(self, rob_id: uuid.UUID) -> None:
        stmt = select(PortCallBunkerRob).where(PortCallBunkerRob.id == rob_id)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            await self.session.delete(row)
