import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.cargo.models.cargo import Cargo


class CargoRepository(SQLAlchemyAsyncRepository[Cargo]):
    model_type = Cargo

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[Cargo]:
        stmt = (
            select(Cargo)
            .where(Cargo.voyage_id == voyage_id)
            .order_by(Cargo.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
