import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.tasks.models.task import Task


class TaskRepository(SQLAlchemyAsyncRepository[Task]):
    model_type = Task

    async def list_filtered(
        self,
        status: str | None = None,
        assigned_to: uuid.UUID | None = None,
        entity_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Task]:
        stmt = select(Task)
        if status is not None:
            stmt = stmt.where(Task.status == status)
        if assigned_to is not None:
            stmt = stmt.where(Task.assigned_to == assigned_to)
        if entity_type is not None:
            stmt = stmt.where(Task.linked_entity_type == entity_type)
        stmt = stmt.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        return await self.get_one_or_none(id=task_id)
