import uuid

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.modules.alerts.constants import (
    ALERT_TYPE_ETA_OVERDUE,
    SEVERITY_INFO,
    LINKED_ENTITY_TYPE_VOYAGE,
)
from src.modules.alerts.service.alert_service import AlertService
from src.modules.alerts.service.dtos import AlertCreateDTO
from src.modules.auth.models.role import Role
from src.modules.auth.services.auth_service import AuthService
from src.modules.tasks.constants import (
    TASK_STATUSES,
    LINKED_ENTITY_TYPES,
    TASK_STATUS_OPEN,
    TASK_STATUS_IN_PROGRESS,
    TASK_STATUS_BLOCKED,
    TASK_STATUS_DONE,
)
from src.modules.tasks.exceptions import (
    TaskNotFoundError,
    TaskOriginatingAlertNotFoundError,
)
from src.modules.tasks.service.task_service import TaskService
from src.modules.tasks.service.dtos import (
    TaskCreateDTO,
    TaskListFilters,
    TaskUpdateDTO,
)
from tests.modules.voyage_spine.conftest import VoyageFactory
from tests.modules.port_call.conftest import VesselFactory


# ---------------------------------------------------------------------------
# Constants sanity
# ---------------------------------------------------------------------------


def test_task_constants_sanity() -> None:
    assert len(TASK_STATUSES) == 4
    assert len(LINKED_ENTITY_TYPES) == 3
    assert TASK_STATUS_OPEN in TASK_STATUSES
    assert TASK_STATUS_IN_PROGRESS in TASK_STATUSES
    assert TASK_STATUS_BLOCKED in TASK_STATUSES
    assert TASK_STATUS_DONE in TASK_STATUSES
    assert "Voyage" in LINKED_ENTITY_TYPES
    assert "PortCall" in LINKED_ENTITY_TYPES
    assert "Vessel" in LINKED_ENTITY_TYPES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _setup_voyage(session: AsyncSession):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()
    return voyage


async def _make_authenticated_client(app: FastAPI, session: AsyncSession):
    auth_service = AuthService(session)
    for role_name in ["Admin", "Operations", "Viewer"]:
        stmt = select(Role).where(Role.name == role_name)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            session.add(Role(name=role_name))
    await session.commit()

    user = await auth_service.create_user(
        f"task_{uuid.uuid4().hex[:8]}", "password", []
    )
    session_record = await auth_service.create_session(user.id)

    async def override():
        yield session

    app.dependency_overrides[get_db_session] = override
    client = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        cookies={"session_id": session_record.session_id},
    )
    return client, user


# ---------------------------------------------------------------------------
# Service-level tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_task_service(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    dto = TaskCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        title="Check cargo manifest",
    )
    task = await service.create(dto, user)

    assert task.id is not None
    assert task.title == "Check cargo manifest"
    assert task.status == TASK_STATUS_OPEN
    assert task.created_by == user.id
    assert task.completed_at is None
    assert task.originating_alert_id is None


@pytest.mark.asyncio
async def test_task_status_transitions_open_to_in_progress(
    session: AsyncSession,
) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Task for transition",
        ),
        user,
    )

    updated = await service.update(
        task.id, TaskUpdateDTO(status=TASK_STATUS_IN_PROGRESS)
    )
    assert updated.status == TASK_STATUS_IN_PROGRESS
    assert updated.completed_at is None


@pytest.mark.asyncio
async def test_task_status_transitions_to_blocked(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Task blocked",
        ),
        user,
    )

    updated = await service.update(task.id, TaskUpdateDTO(status=TASK_STATUS_BLOCKED))
    assert updated.status == TASK_STATUS_BLOCKED
    assert updated.completed_at is None


@pytest.mark.asyncio
async def test_task_completed_at_set_on_done(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Done task",
        ),
        user,
    )
    assert task.completed_at is None

    done_task = await service.update(task.id, TaskUpdateDTO(status=TASK_STATUS_DONE))
    assert done_task.status == TASK_STATUS_DONE
    assert done_task.completed_at is not None


@pytest.mark.asyncio
async def test_task_completed_at_cleared_when_not_done(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Reverted task",
        ),
        user,
    )
    done_task = await service.update(task.id, TaskUpdateDTO(status=TASK_STATUS_DONE))
    assert done_task.completed_at is not None

    reopened = await service.update(
        done_task.id, TaskUpdateDTO(status=TASK_STATUS_OPEN)
    )
    assert reopened.status == TASK_STATUS_OPEN
    assert reopened.completed_at is None


@pytest.mark.asyncio
async def test_create_task_with_valid_originating_alert(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    alert_service = AlertService(session)
    alert = await alert_service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="ETA overdue",
            severity=SEVERITY_INFO,
        ),
        user,
    )

    task_service = TaskService(session)
    task = await task_service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Follow up on ETA alert",
            originating_alert_id=alert.id,
        ),
        user,
    )
    assert task.originating_alert_id == alert.id


@pytest.mark.asyncio
async def test_create_task_with_invalid_originating_alert_raises_422(
    session: AsyncSession,
) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    with pytest.raises(TaskOriginatingAlertNotFoundError):
        await service.create(
            TaskCreateDTO(
                linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
                linked_entity_id=voyage.id,
                title="Invalid alert FK",
                originating_alert_id=uuid.uuid4(),
            ),
            user,
        )


@pytest.mark.asyncio
async def test_get_task_not_found(session: AsyncSession) -> None:
    service = TaskService(session)
    with pytest.raises(TaskNotFoundError):
        await service.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_list_tasks_filtered_by_status(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task1 = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Open task",
        ),
        user,
    )
    task2 = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Done task",
        ),
        user,
    )
    await service.update(task2.id, TaskUpdateDTO(status=TASK_STATUS_DONE))

    open_tasks = await service.list(TaskListFilters(status=TASK_STATUS_OPEN))
    done_tasks = await service.list(TaskListFilters(status=TASK_STATUS_DONE))

    open_ids = {t.id for t in open_tasks}
    done_ids = {t.id for t in done_tasks}
    assert task1.id in open_ids
    assert task2.id in done_ids
    assert task2.id not in open_ids


@pytest.mark.asyncio
async def test_list_tasks_filtered_by_assigned_to(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user1 = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    user2 = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task1 = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Task for user1",
            assigned_to=user1.id,
        ),
        user1,
    )
    task2 = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Task for user2",
            assigned_to=user2.id,
        ),
        user2,
    )

    user1_tasks = await service.list(TaskListFilters(assigned_to=user1.id))
    user1_ids = {t.id for t in user1_tasks}
    assert task1.id in user1_ids
    assert task2.id not in user1_ids


# ---------------------------------------------------------------------------
# HTTP API tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_api_create_task(app: FastAPI, session: AsyncSession) -> None:
    client, _ = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    async with client:
        response = await client.post(
            "/api/v1/tasks",
            json={
                "linked_entity_type": "Voyage",
                "linked_entity_id": str(voyage.id),
                "title": "Check BL",
            },
        )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Check BL"
    assert data["status"] == "Open"
    assert data["completed_at"] is None


@pytest.mark.asyncio
async def test_api_task_invalid_status_422(app: FastAPI, session: AsyncSession) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Test task",
        ),
        user,
    )

    async with client:
        response = await client.patch(
            f"/api/v1/tasks/{task.id}",
            json={"status": "InvalidStatus"},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_task_transition_to_done_sets_completed_at(
    app: FastAPI, session: AsyncSession
) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Complete me",
        ),
        user,
    )

    async with client:
        response = await client.patch(
            f"/api/v1/tasks/{task.id}",
            json={"status": "Done"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Done"
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_api_task_originating_alert_fk_validated(
    app: FastAPI, session: AsyncSession
) -> None:
    client, _ = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    async with client:
        response = await client.post(
            "/api/v1/tasks",
            json={
                "linked_entity_type": "Voyage",
                "linked_entity_id": str(voyage.id),
                "title": "Bad alert ref",
                "originating_alert_id": str(uuid.uuid4()),
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_get_task_not_found(app: FastAPI, session: AsyncSession) -> None:
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.get(f"/api/v1/tasks/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_api_list_tasks_filtered(app: FastAPI, session: AsyncSession) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = TaskService(session)
    await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Open task",
        ),
        user,
    )
    t2 = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Blocked task",
        ),
        user,
    )
    await service.update(t2.id, TaskUpdateDTO(status=TASK_STATUS_BLOCKED))

    async with client:
        response = await client.get("/api/v1/tasks", params={"status": "Blocked"})
    assert response.status_code == 200
    data = response.json()
    assert all(t["status"] == "Blocked" for t in data)


@pytest.mark.asyncio
async def test_api_unauthenticated_task_endpoints(
    unauthenticated_client: AsyncClient,
) -> None:
    r1 = await unauthenticated_client.post(
        "/api/v1/tasks",
        json={
            "linked_entity_type": "Voyage",
            "linked_entity_id": str(uuid.uuid4()),
            "title": "No auth",
        },
    )
    assert r1.status_code == 401

    r2 = await unauthenticated_client.get("/api/v1/tasks")
    assert r2.status_code == 401

    r3 = await unauthenticated_client.get(f"/api/v1/tasks/{uuid.uuid4()}")
    assert r3.status_code == 401

    r4 = await unauthenticated_client.patch(
        f"/api/v1/tasks/{uuid.uuid4()}", json={"status": "Done"}
    )
    assert r4.status_code == 401


@pytest.mark.asyncio
async def test_service_update_all_fields(session: AsyncSession) -> None:
    """Covers update branches for title, description, assigned_to, due_datetime."""
    from datetime import datetime, timezone

    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    user2 = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    task = await service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Original title",
        ),
        user,
    )

    due = datetime(2026, 12, 31, 0, 0, tzinfo=timezone.utc)
    updated = await service.update(
        task.id,
        TaskUpdateDTO(
            title="Updated title",
            description="Updated description",
            assigned_to=user2.id,
            due_datetime=due,
        ),
    )
    assert updated.title == "Updated title"
    assert updated.description == "Updated description"
    assert updated.assigned_to == user2.id
    assert updated.due_datetime == due


@pytest.mark.asyncio
async def test_list_tasks_filtered_by_entity_type(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = TaskService(session)
    t_voyage = await service.create(
        TaskCreateDTO(
            linked_entity_type="Voyage",
            linked_entity_id=voyage.id,
            title="Voyage task",
        ),
        user,
    )
    t_vessel = await service.create(
        TaskCreateDTO(
            linked_entity_type="Vessel",
            linked_entity_id=voyage.id,
            title="Vessel task",
        ),
        user,
    )

    voyage_tasks = await service.list(TaskListFilters(entity_type="Voyage"))
    voyage_ids = {t.id for t in voyage_tasks}
    assert t_voyage.id in voyage_ids
    assert t_vessel.id not in voyage_ids
