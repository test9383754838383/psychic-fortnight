import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.operational_reporting.models.port_activity import PortActivity


class PortActivityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, obj: PortActivity) -> PortActivity:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def get_one_or_none(self, **kwargs: object) -> PortActivity | None:
        stmt = select(PortActivity)
        for key, val in kwargs.items():
            stmt = stmt.where(getattr(PortActivity, key) == val)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_port_call(self, port_call_id: uuid.UUID) -> List[PortActivity]:
        stmt = (
            select(PortActivity)
            .where(PortActivity.port_call_id == port_call_id)
            .order_by(PortActivity.event_timestamp, PortActivity.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
