import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.operational_reporting.models.port_activity import ActivityLog


class ActivityLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, obj: ActivityLog) -> ActivityLog:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def list_for_port_call(self, port_call_id: uuid.UUID) -> List[ActivityLog]:
        stmt = (
            select(ActivityLog)
            .where(ActivityLog.port_call_id == port_call_id)
            .order_by(ActivityLog.logged_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
