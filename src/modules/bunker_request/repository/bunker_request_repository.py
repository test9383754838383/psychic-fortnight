import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.bunker_request.models.bunker_request import BunkerRequest


class BunkerRequestRepository(SQLAlchemyAsyncRepository[BunkerRequest]):
    model_type = BunkerRequest

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[BunkerRequest]:
        stmt = (
            select(BunkerRequest)
            .where(BunkerRequest.voyage_id == voyage_id)
            .order_by(BunkerRequest.raised_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
