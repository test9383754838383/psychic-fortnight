import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.alerts.repository.alert_repository import AlertRepository
from src.modules.auth.models.user import User
from src.modules.tasks.constants import TASK_STATUS_DONE
from src.modules.tasks.exceptions import (
    TaskNotFoundError,
    TaskOriginatingAlertNotFoundError,
)
from src.modules.tasks.models.task import Task
from src.modules.tasks.repository.task_repository import TaskRepository
from src.modules.tasks.service.dtos import (
    TaskCreateDTO,
    TaskListFilters,
    TaskUpdateDTO,
)


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TaskRepository(session=session)
        self.alert_repo = AlertRepository(session=session)

    async def create(self, dto: TaskCreateDTO, user: User) -> Task:
        if dto.originating_alert_id is not None:
            alert = await self.alert_repo.get_by_id(dto.originating_alert_id)
            if alert is None:
                raise TaskOriginatingAlertNotFoundError(str(dto.originating_alert_id))

        task = Task(
            linked_entity_type=dto.linked_entity_type,
            linked_entity_id=dto.linked_entity_id,
            title=dto.title,
            description=dto.description,
            assigned_to=dto.assigned_to,
            due_datetime=dto.due_datetime,
            status="Open",
            originating_alert_id=dto.originating_alert_id,
            created_by=user.id,
            created_at=datetime.now(timezone.utc),
        )
        await self.repo.add(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def get(self, task_id: uuid.UUID) -> Task:
        task = await self.repo.get_by_id(task_id)
        if task is None:
            raise TaskNotFoundError(str(task_id))
        return task

    async def update(self, task_id: uuid.UUID, dto: TaskUpdateDTO) -> Task:
        task = await self.get(task_id)

        if dto.title is not None:
            task.title = dto.title
        if dto.description is not None:
            task.description = dto.description
        if dto.assigned_to is not None:
            task.assigned_to = dto.assigned_to
        if dto.due_datetime is not None:
            task.due_datetime = dto.due_datetime
        if dto.originating_alert_id is not None:
            alert = await self.alert_repo.get_by_id(dto.originating_alert_id)
            if alert is None:
                raise TaskOriginatingAlertNotFoundError(str(dto.originating_alert_id))
            task.originating_alert_id = dto.originating_alert_id
        if dto.status is not None:
            task.status = dto.status
            if dto.status == TASK_STATUS_DONE:
                task.completed_at = datetime.now(timezone.utc)
            else:
                task.completed_at = None

        await self.repo.update(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def list(self, filters: TaskListFilters) -> list[Task]:
        return await self.repo.list_filtered(
            status=filters.status,
            assigned_to=filters.assigned_to,
            entity_type=filters.entity_type,
            limit=min(filters.limit, 200),
            offset=filters.offset,
        )
