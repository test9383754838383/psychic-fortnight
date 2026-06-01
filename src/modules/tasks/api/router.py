import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.tasks.models.task import Task
from src.modules.tasks.service.task_service import TaskService
from src.modules.tasks.service.dtos import (
    TaskCreateDTO,
    TaskListFilters,
    TaskUpdateDTO,
)

StatusLiteral = Literal["Open", "In Progress", "Blocked", "Done"]

EntityTypeLiteral = Literal["Voyage", "PortCall", "Vessel"]


class TaskCreateBody(BaseModel):
    linked_entity_type: EntityTypeLiteral
    linked_entity_id: uuid.UUID
    title: str
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    due_datetime: datetime | None = None
    originating_alert_id: uuid.UUID | None = None


class TaskUpdateBody(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    due_datetime: datetime | None = None
    status: StatusLiteral | None = None
    originating_alert_id: uuid.UUID | None = None


class TaskReadDTO(BaseModel):
    id: uuid.UUID
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    title: str
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    due_datetime: datetime | None = None
    status: str
    originating_alert_id: uuid.UUID | None = None
    created_by: uuid.UUID
    created_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, task: Task) -> "TaskReadDTO":
        return cls(
            id=task.id,
            linked_entity_type=task.linked_entity_type,
            linked_entity_id=task.linked_entity_id,
            title=task.title,
            description=task.description,
            assigned_to=task.assigned_to,
            due_datetime=task.due_datetime,
            status=task.status,
            originating_alert_id=task.originating_alert_id,
            created_by=task.created_by,
            created_at=task.created_at,
            completed_at=task.completed_at,
        )


tasks_router = APIRouter(prefix="/tasks")


@tasks_router.post(
    "",
    response_model=TaskReadDTO,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
async def create_task(
    data: TaskCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TaskReadDTO:
    service = TaskService(session)
    dto = TaskCreateDTO(
        linked_entity_type=data.linked_entity_type,
        linked_entity_id=data.linked_entity_id,
        title=data.title,
        description=data.description,
        assigned_to=data.assigned_to,
        due_datetime=data.due_datetime,
        originating_alert_id=data.originating_alert_id,
    )
    task = await service.create(dto, current_user)
    return TaskReadDTO.from_model(task)


@tasks_router.get(
    "",
    response_model=list[TaskReadDTO],
    tags=["tasks"],
)
async def list_tasks(
    status: StatusLiteral | None = None,
    assigned_to: uuid.UUID | None = None,
    entity_type: EntityTypeLiteral | None = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[TaskReadDTO]:
    del current_user
    service = TaskService(session)
    filters = TaskListFilters(
        status=status,
        assigned_to=assigned_to,
        entity_type=entity_type,
        limit=limit,
        offset=offset,
    )
    tasks = await service.list(filters)
    return [TaskReadDTO.from_model(t) for t in tasks]


@tasks_router.get(
    "/{task_id}",
    response_model=TaskReadDTO,
    tags=["tasks"],
)
async def get_task(
    task_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TaskReadDTO:
    del current_user
    service = TaskService(session)
    task = await service.get(task_id)
    return TaskReadDTO.from_model(task)


@tasks_router.patch(
    "/{task_id}",
    response_model=TaskReadDTO,
    tags=["tasks"],
)
async def update_task(
    task_id: uuid.UUID,
    data: TaskUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TaskReadDTO:
    del current_user
    service = TaskService(session)
    dto = TaskUpdateDTO(
        title=data.title,
        description=data.description,
        assigned_to=data.assigned_to,
        due_datetime=data.due_datetime,
        status=data.status,
        originating_alert_id=data.originating_alert_id,
    )
    task = await service.update(task_id, dto)
    return TaskReadDTO.from_model(task)
