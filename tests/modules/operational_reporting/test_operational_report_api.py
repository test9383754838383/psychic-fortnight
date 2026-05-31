"""test_operational_report_api.py — end-to-end HTTP tests for all report endpoints."""

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.role import Role
from sqlalchemy import select

from src.modules.operational_reporting.models.operational_report import (
    OperationalReportStatus,
    OperationalReportType,
)
from tests.modules.operational_reporting.conftest import (
    PortCallFactory,
    PortFactory,
    VesselFactory,
    VoyageFactory,
)


# ------------------------------------------------------------------ #
# Helpers                                                              #
# ------------------------------------------------------------------ #


async def _make_ops_client(app: FastAPI, session: AsyncSession):
    """Create a client logged in as an Operations-role user."""
    auth_service = AuthService(session)
    for role_name in ["Admin", "Operations", "Viewer"]:
        stmt = select(Role).where(Role.name == role_name)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            session.add(Role(name=role_name))
    await session.commit()

    user = await auth_service.create_user(
        f"ops_{uuid.uuid4().hex[:8]}", "password", ["Operations"]
    )
    session_record = await auth_service.create_session(user.id)

    from src.dependencies import get_db_session
    from httpx import ASGITransport

    async def override():
        yield session

    app.dependency_overrides[get_db_session] = override
    client = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        cookies={"session_id": session_record.session_id},
    )
    return client, user


async def _make_setup(session: AsyncSession):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()
    return voyage, pc


# ------------------------------------------------------------------ #
# Tests                                                                #
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_create_noon_report_via_voyage_route(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/reports",
            json={
                "report_type": OperationalReportType.NOON.value,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["report_type"] == OperationalReportType.NOON.value
    assert data["status"] == OperationalReportStatus.PENDING.value
    assert data["voyage_id"] == str(voyage.id)
    assert data["port_call_id"] is None


@pytest.mark.asyncio
async def test_create_arrival_report_via_port_call_route(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        resp = await client.post(
            f"/api/v1/port-calls/{pc.id}/reports",
            json={"report_type": OperationalReportType.ARRIVAL.value},
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["port_call_id"] == str(pc.id)
    assert data["voyage_id"] is None


@pytest.mark.asyncio
async def test_list_voyage_reports_includes_port_call_reports(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        # Noon (voyage-level)
        await client.post(
            f"/api/v1/voyages/{voyage.id}/reports",
            json={"report_type": OperationalReportType.NOON.value},
        )
        # Arrival (port-call-level)
        await client.post(
            f"/api/v1/port-calls/{pc.id}/reports",
            json={"report_type": OperationalReportType.ARRIVAL.value},
        )
        resp = await client.get(f"/api/v1/voyages/{voyage.id}/reports")

    assert resp.status_code == 200
    reports = resp.json()
    types = {r["report_type"] for r in reports}
    assert OperationalReportType.NOON.value in types
    assert OperationalReportType.ARRIVAL.value in types


@pytest.mark.asyncio
async def test_get_report_200(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/reports",
            json={"report_type": OperationalReportType.NOON.value},
        )
        report_id = create_resp.json()["id"]
        get_resp = await client.get(f"/api/v1/reports/{report_id}")

    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == report_id


@pytest.mark.asyncio
async def test_get_report_404(client):
    resp = await client.get(f"/api/v1/reports/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_patch_pending_report(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/reports",
            json={"report_type": OperationalReportType.NOON.value},
        )
        report_id = create_resp.json()["id"]
        patch_resp = await client.patch(
            f"/api/v1/reports/{report_id}",
            json={"raw_content_ref": "ref://some-file"},
        )

    assert patch_resp.status_code == 200
    assert patch_resp.json()["raw_content_ref"] == "ref://some-file"


@pytest.mark.asyncio
async def test_transition_report_accepted(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/reports",
            json={"report_type": OperationalReportType.NOON.value},
        )
        report_id = create_resp.json()["id"]
        trans_resp = await client.post(
            f"/api/v1/reports/{report_id}/transition",
            json={"status": OperationalReportStatus.ACCEPTED.value},
        )

    assert trans_resp.status_code == 200
    assert trans_resp.json()["status"] == OperationalReportStatus.ACCEPTED.value


@pytest.mark.asyncio
async def test_transition_illegal_returns_409(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/reports",
            json={"report_type": OperationalReportType.NOON.value},
        )
        report_id = create_resp.json()["id"]
        # Accept it first
        await client.post(
            f"/api/v1/reports/{report_id}/transition",
            json={"status": OperationalReportStatus.ACCEPTED.value},
        )
        # Try to transition from terminal state
        resp = await client.post(
            f"/api/v1/reports/{report_id}/transition",
            json={"status": OperationalReportStatus.PENDING.value},
        )

    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_anchor_xor_violation_returns_422(app, session):
    voyage, pc = await _make_setup(session)
    client, _ = await _make_ops_client(app, session)

    # The route sets voyage_id automatically, but Noon on port-call route = type mismatch
    async with client:
        resp = await client.post(
            f"/api/v1/port-calls/{pc.id}/reports",
            json={"report_type": OperationalReportType.NOON.value},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mutation_without_role_returns_403(client, session):
    """The default client has no Operations/Admin role — mutation must be 403."""
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/reports",
        json={"report_type": OperationalReportType.NOON.value},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_read_endpoint_accessible_to_all_authenticated(client, session):
    """GET /reports/{id} requires only authentication, not a specific role."""
    resp = await client.get(f"/api/v1/reports/{uuid.uuid4()}")
    # 404 because report doesn't exist — but NOT 401/403
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_returns_401(unauthenticated_client):
    resp = await unauthenticated_client.get(f"/api/v1/reports/{uuid.uuid4()}")
    assert resp.status_code == 401
