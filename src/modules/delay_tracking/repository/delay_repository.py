import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.delay_tracking.models.delay import Delay


class DelayRepository(SQLAlchemyAsyncRepository[Delay]):
    model_type = Delay

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[Delay]:
        stmt = (
            select(Delay)
            .where(Delay.voyage_id == voyage_id)
            .order_by(Delay.start_datetime)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
