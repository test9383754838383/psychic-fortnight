"""Tests for has_exception field on GET /api/v1/voyages/{id}/workspace."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.modules.alerts.constants import (
    ALERT_TYPE_ETA_OVERDUE,
    SEVERITY_INFO,
    SEVERITY_WARNING,
    LINKED_ENTITY_TYPE_VOYAGE,
)
from src.modules.alerts.service.alert_service import AlertService
from src.modules.alerts.service.dtos import AlertCreateDTO, AlertResolveDTO
from src.modules.auth.models.role import Role
from src.modules.auth.services.auth_service import AuthService
from src.modules.tasks.service.task_service import TaskService
from src.modules.tasks.service.dtos import TaskCreateDTO, TaskUpdateDTO
from src.modules.tasks.constants import TASK_STATUS_DONE
from tests.modules.voyage_spine.conftest import VoyageFactory
from tests.modules.port_call.conftest import VesselFactory


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

    user = await auth_service.create_user(f"ws_{uuid.uuid4().hex[:8]}", "password", [])
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


@pytest.mark.asyncio
async def test_workspace_has_exception_true_when_unresolved_warning(
    app: FastAPI, session: AsyncSession
) -> None:
    """has_exception=True when voyage has an unresolved Warning alert."""
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    alert_service = AlertService(session)
    await alert_service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="ETA overdue",
            severity=SEVERITY_WARNING,
        ),
        user,
    )

    async with client:
        response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    assert response.json()["has_exception"] is True


@pytest.mark.asyncio
async def test_workspace_has_exception_false_when_all_resolved(
    app: FastAPI, session: AsyncSession
) -> None:
    """has_exception=False when all alerts are resolved."""
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    alert_service = AlertService(session)
    alert = await alert_service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Warning resolved",
            severity=SEVERITY_WARNING,
        ),
        user,
    )
    await alert_service.resolve(
        alert.id, AlertResolveDTO(resolution_note="Resolved ok."), user
    )

    async with client:
        response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    assert response.json()["has_exception"] is False


@pytest.mark.asyncio
async def test_workspace_has_exception_true_when_overdue_open_task(
    app: FastAPI, session: AsyncSession
) -> None:
    """has_exception=True when voyage has a non-Done task with due_datetime < now."""
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    task_service = TaskService(session)
    overdue_due = datetime.now(timezone.utc) - timedelta(hours=1)
    await task_service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Overdue task",
            due_datetime=overdue_due,
        ),
        user,
    )

    async with client:
        response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    assert response.json()["has_exception"] is True


@pytest.mark.asyncio
async def test_workspace_has_exception_false_when_task_is_done(
    app: FastAPI, session: AsyncSession
) -> None:
    """has_exception=False when overdue task is Done."""
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    task_service = TaskService(session)
    overdue_due = datetime.now(timezone.utc) - timedelta(hours=1)
    task = await task_service.create(
        TaskCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            title="Done overdue task",
            due_datetime=overdue_due,
        ),
        user,
    )
    await task_service.update(task.id, TaskUpdateDTO(status=TASK_STATUS_DONE))

    async with client:
        response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    assert response.json()["has_exception"] is False


@pytest.mark.asyncio
async def test_workspace_has_exception_false_no_alerts_or_tasks(
    app: FastAPI, session: AsyncSession
) -> None:
    """has_exception=False when voyage has no alerts or tasks."""
    client, _ = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    async with client:
        response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    assert response.json()["has_exception"] is False


@pytest.mark.asyncio
async def test_workspace_has_exception_false_info_alert_unresolved(
    app: FastAPI, session: AsyncSession
) -> None:
    """has_exception=False when only Info alert exists (not Warning/Critical)."""
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    alert_service = AlertService(session)
    await alert_service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Info only",
            severity=SEVERITY_INFO,
        ),
        user,
    )

    async with client:
        response = await client.get(f"/api/v1/voyages/{voyage.id}/workspace")
    assert response.status_code == 200
    # Info alerts do NOT trigger has_exception
    assert response.json()["has_exception"] is False
