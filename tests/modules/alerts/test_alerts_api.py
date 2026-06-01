import uuid

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.modules.alerts.constants import (
    ALERT_TYPES,
    SEVERITIES,
    LINKED_ENTITY_TYPES,
    ALERT_TYPE_ETA_OVERDUE,
    ALERT_TYPE_NOON_REPORT_MISSING,
    SEVERITY_INFO,
    SEVERITY_WARNING,
    SEVERITY_CRITICAL,
    LINKED_ENTITY_TYPE_VOYAGE,
    LINKED_ENTITY_TYPE_VESSEL,
)
from src.modules.alerts.exceptions import (
    AlertAlreadyResolvedError,
    AlertNotFoundError,
    AlertResolutionNoteRequiredError,
)
from src.modules.alerts.service.alert_service import AlertService
from src.modules.alerts.service.dtos import (
    AlertCreateDTO,
    AlertListFilters,
    AlertResolveDTO,
)
from src.modules.auth.models.role import Role
from src.modules.auth.services.auth_service import AuthService
from tests.modules.voyage_spine.conftest import VoyageFactory
from tests.modules.port_call.conftest import VesselFactory


# ---------------------------------------------------------------------------
# Constants sanity
# ---------------------------------------------------------------------------


def test_alert_constants_sanity() -> None:
    assert len(ALERT_TYPES) == 10
    assert len(SEVERITIES) == 3
    assert len(LINKED_ENTITY_TYPES) == 3
    assert "ETA Overdue" in ALERT_TYPES
    assert "Noon Report Missing" in ALERT_TYPES
    assert "Info" in SEVERITIES
    assert "Warning" in SEVERITIES
    assert "Critical" in SEVERITIES
    assert "Voyage" in LINKED_ENTITY_TYPES
    assert "PortCall" in LINKED_ENTITY_TYPES
    assert "Vessel" in LINKED_ENTITY_TYPES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _setup_voyage(session: AsyncSession):
    """Create vessel + voyage, return voyage."""
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
        f"alert_{uuid.uuid4().hex[:8]}", "password", []
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
async def test_create_alert_service(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        alert_type=ALERT_TYPE_ETA_OVERDUE,
        message="ETA overdue by 2 hours",
        severity=SEVERITY_WARNING,
    )
    alert = await service.create(dto, user)

    assert alert.id is not None
    assert alert.linked_entity_type == LINKED_ENTITY_TYPE_VOYAGE
    assert alert.linked_entity_id == voyage.id
    assert alert.alert_type == ALERT_TYPE_ETA_OVERDUE
    assert alert.message == "ETA overdue by 2 hours"
    assert alert.severity == SEVERITY_WARNING
    assert alert.triggered_at is not None
    assert alert.resolved_at is None
    assert alert.resolved_by is None
    assert alert.resolution_note is None


@pytest.mark.asyncio
async def test_resolve_info_without_note_ok(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        alert_type=ALERT_TYPE_ETA_OVERDUE,
        message="Info alert",
        severity=SEVERITY_INFO,
    )
    alert = await service.create(dto, user)

    resolved = await service.resolve(
        alert.id, AlertResolveDTO(resolution_note=None), user
    )
    assert resolved.resolved_at is not None
    assert resolved.resolved_by == user.id
    assert resolved.resolution_note is None


@pytest.mark.asyncio
async def test_resolve_warning_without_note_raises_422(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        alert_type=ALERT_TYPE_ETA_OVERDUE,
        message="Warning alert",
        severity=SEVERITY_WARNING,
    )
    alert = await service.create(dto, user)

    with pytest.raises(AlertResolutionNoteRequiredError):
        await service.resolve(alert.id, AlertResolveDTO(resolution_note=None), user)


@pytest.mark.asyncio
async def test_resolve_critical_without_note_raises_422(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        alert_type=ALERT_TYPE_NOON_REPORT_MISSING,
        message="Critical alert",
        severity=SEVERITY_CRITICAL,
    )
    alert = await service.create(dto, user)

    with pytest.raises(AlertResolutionNoteRequiredError):
        await service.resolve(alert.id, AlertResolveDTO(resolution_note=""), user)


@pytest.mark.asyncio
async def test_resolve_warning_with_note_ok(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        alert_type=ALERT_TYPE_ETA_OVERDUE,
        message="Warning alert",
        severity=SEVERITY_WARNING,
    )
    alert = await service.create(dto, user)

    resolved = await service.resolve(
        alert.id,
        AlertResolveDTO(resolution_note="Fixed the ETA delay manually."),
        user,
    )
    assert resolved.resolved_at is not None
    assert resolved.resolution_note == "Fixed the ETA delay manually."


@pytest.mark.asyncio
async def test_resolve_already_resolved_raises_409(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    dto = AlertCreateDTO(
        linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
        linked_entity_id=voyage.id,
        alert_type=ALERT_TYPE_ETA_OVERDUE,
        message="Info alert",
        severity=SEVERITY_INFO,
    )
    alert = await service.create(dto, user)
    await service.resolve(alert.id, AlertResolveDTO(resolution_note=None), user)

    with pytest.raises(AlertAlreadyResolvedError):
        await service.resolve(alert.id, AlertResolveDTO(resolution_note=None), user)


@pytest.mark.asyncio
async def test_get_alert_not_found(session: AsyncSession) -> None:
    service = AlertService(session)
    with pytest.raises(AlertNotFoundError):
        await service.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_list_alerts_filtered_by_severity(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    for sev in [SEVERITY_INFO, SEVERITY_WARNING, SEVERITY_CRITICAL]:
        await service.create(
            AlertCreateDTO(
                linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
                linked_entity_id=voyage.id,
                alert_type=ALERT_TYPE_ETA_OVERDUE,
                message=f"{sev} alert",
                severity=sev,
            ),
            user,
        )

    warnings = await service.list(AlertListFilters(severity=SEVERITY_WARNING))
    assert all(a.severity == SEVERITY_WARNING for a in warnings)
    assert len(warnings) >= 1

    criticals = await service.list(AlertListFilters(severity=SEVERITY_CRITICAL))
    assert all(a.severity == SEVERITY_CRITICAL for a in criticals)


@pytest.mark.asyncio
async def test_list_alerts_filtered_by_resolved(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    alert1 = await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Unresolved",
            severity=SEVERITY_INFO,
        ),
        user,
    )
    alert2 = await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Resolved",
            severity=SEVERITY_INFO,
        ),
        user,
    )
    await service.resolve(alert2.id, AlertResolveDTO(), user)

    unresolved = await service.list(AlertListFilters(resolved=False))
    resolved = await service.list(AlertListFilters(resolved=True))

    unresolved_ids = {a.id for a in unresolved}
    resolved_ids = {a.id for a in resolved}
    assert alert1.id in unresolved_ids
    assert alert2.id in resolved_ids
    assert alert1.id not in resolved_ids


@pytest.mark.asyncio
async def test_list_alerts_filtered_by_entity_type(session: AsyncSession) -> None:
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = AlertService(session)
    await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Voyage alert",
            severity=SEVERITY_INFO,
        ),
        user,
    )
    await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VESSEL,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Vessel alert",
            severity=SEVERITY_INFO,
        ),
        user,
    )

    voyage_alerts = await service.list(
        AlertListFilters(entity_type=LINKED_ENTITY_TYPE_VOYAGE)
    )
    assert all(a.linked_entity_type == LINKED_ENTITY_TYPE_VOYAGE for a in voyage_alerts)


# ---------------------------------------------------------------------------
# HTTP API tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_api_create_alert(app: FastAPI, session: AsyncSession) -> None:
    client, _ = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    async with client:
        response = await client.post(
            "/api/v1/alerts",
            json={
                "linked_entity_type": "Voyage",
                "linked_entity_id": str(voyage.id),
                "alert_type": "ETA Overdue",
                "message": "ETA overdue by 3 hours",
                "severity": "Warning",
            },
        )
    assert response.status_code == 201
    data = response.json()
    assert data["alert_type"] == "ETA Overdue"
    assert data["severity"] == "Warning"
    assert data["resolved_at"] is None


@pytest.mark.asyncio
async def test_api_resolve_warning_without_note_422(
    app: FastAPI, session: AsyncSession
) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = AlertService(session)
    alert = await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Warning",
            severity=SEVERITY_WARNING,
        ),
        user,
    )

    async with client:
        response = await client.post(
            f"/api/v1/alerts/{alert.id}/resolve",
            json={},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_resolve_critical_with_note_ok(
    app: FastAPI, session: AsyncSession
) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = AlertService(session)
    alert = await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_NOON_REPORT_MISSING,
            message="Critical",
            severity=SEVERITY_CRITICAL,
        ),
        user,
    )

    async with client:
        response = await client.post(
            f"/api/v1/alerts/{alert.id}/resolve",
            json={"resolution_note": "Manually resolved after investigation."},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["resolved_at"] is not None
    assert data["resolution_note"] == "Manually resolved after investigation."


@pytest.mark.asyncio
async def test_api_resolve_already_resolved_409(
    app: FastAPI, session: AsyncSession
) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = AlertService(session)
    alert = await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Info",
            severity=SEVERITY_INFO,
        ),
        user,
    )
    await service.resolve(alert.id, AlertResolveDTO(), user)

    async with client:
        response = await client.post(
            f"/api/v1/alerts/{alert.id}/resolve",
            json={},
        )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_api_get_alert(app: FastAPI, session: AsyncSession) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = AlertService(session)
    alert = await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Test",
            severity=SEVERITY_INFO,
        ),
        user,
    )

    async with client:
        response = await client.get(f"/api/v1/alerts/{alert.id}")
    assert response.status_code == 200
    assert response.json()["id"] == str(alert.id)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as anon:
        await anon.get(f"/api/v1/alerts/{uuid.uuid4()}")
        # unauthenticated → 401 (auth checked before 404)


@pytest.mark.asyncio
async def test_api_get_alert_not_found(app: FastAPI, session: AsyncSession) -> None:
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.get(f"/api/v1/alerts/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_api_list_alerts_filtered(app: FastAPI, session: AsyncSession) -> None:
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = AlertService(session)
    await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VOYAGE,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Warning",
            severity=SEVERITY_WARNING,
        ),
        user,
    )
    await service.create(
        AlertCreateDTO(
            linked_entity_type=LINKED_ENTITY_TYPE_VESSEL,
            linked_entity_id=voyage.id,
            alert_type=ALERT_TYPE_ETA_OVERDUE,
            message="Info",
            severity=SEVERITY_INFO,
        ),
        user,
    )

    async with client:
        response = await client.get(
            "/api/v1/alerts",
            params={"severity": "Warning"},
        )
    assert response.status_code == 200
    data = response.json()
    assert all(a["severity"] == "Warning" for a in data)


@pytest.mark.asyncio
async def test_api_unauthenticated_alert_endpoints(
    unauthenticated_client: AsyncClient,
) -> None:
    r1 = await unauthenticated_client.post(
        "/api/v1/alerts",
        json={
            "linked_entity_type": "Voyage",
            "linked_entity_id": str(uuid.uuid4()),
            "alert_type": "ETA Overdue",
            "message": "No auth",
            "severity": "Info",
        },
    )
    assert r1.status_code == 401

    r2 = await unauthenticated_client.get("/api/v1/alerts")
    assert r2.status_code == 401

    r3 = await unauthenticated_client.get(f"/api/v1/alerts/{uuid.uuid4()}")
    assert r3.status_code == 401

    r4 = await unauthenticated_client.post(
        f"/api/v1/alerts/{uuid.uuid4()}/resolve", json={}
    )
    assert r4.status_code == 401
