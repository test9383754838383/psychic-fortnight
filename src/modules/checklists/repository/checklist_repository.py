import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from src.modules.checklists.constants import ITEM_STATUS_PENDING
from src.modules.checklists.models import Checklist, ChecklistItem


class ChecklistRepository(SQLAlchemyAsyncRepository[Checklist]):
    model_type = Checklist

    async def get_with_items(self, checklist_id: uuid.UUID) -> Checklist | None:
        stmt = (
            select(Checklist)
            .options(selectinload(Checklist.items))
            .where(Checklist.id == checklist_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_port_call(self, port_call_id: uuid.UUID) -> list[Checklist]:
        stmt = (
            select(Checklist)
            .options(selectinload(Checklist.items))
            .where(Checklist.port_call_id == port_call_id)
            .order_by(Checklist.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def has_pending_items(self, checklist_id: uuid.UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(ChecklistItem)
            .where(
                ChecklistItem.checklist_id == checklist_id,
                ChecklistItem.status == ITEM_STATUS_PENDING,
            )
        )
        result = await self.session.execute(stmt)
        return bool(result.scalar_one())


class ChecklistItemRepository(SQLAlchemyAsyncRepository[ChecklistItem]):
    model_type = ChecklistItem
