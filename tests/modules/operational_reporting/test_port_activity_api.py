"""test_port_activity_api.py — end-to-end HTTP tests for port activity events and logs endpoints."""

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.role import Role
from sqlalchemy import select

from tests.modules.operational_reporting.conftest import (
    PortCallFactory,
    PortFactory,
    VesselFactory,
    VoyageFactory,
)


# ------------------------------------------------------------------ #
# Helpers                                                            #
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
# Tests                                                              #
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_create_and_list_port_activity_event(app, session):
    voyage, pc = await _make_setup(session)
    client, user = await _make_ops_client(app, session)

    event_timestamp = datetime.now(timezone.utc).isoformat()

    async with client:
        # Create event
        resp = await client.post(
            f"/api/v1/port-calls/{pc.id}/events",
            json={
                "event_type": "Commenced Loading",
                "event_timestamp": event_timestamp,
                "notes": "Testing create port activity",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["event_type"] == "Commenced Loading"
        assert data["notes"] == "Testing create port activity"
        assert data["port_call_id"] == str(pc.id)
        assert data["recorded_by_user_id"] == str(user.id)

        # List events
        list_resp = await client.get(f"/api/v1/port-calls/{pc.id}/events")
        assert list_resp.status_code == 200
        events = list_resp.json()
        assert len(events) == 1
        assert events[0]["id"] == data["id"]


@pytest.mark.asyncio
async def test_create_and_list_activity_log(app, session):
    voyage, pc = await _make_setup(session)
    client, user = await _make_ops_client(app, session)

    async with client:
        # Create activity log entry
        resp = await client.post(
            f"/api/v1/port-calls/{pc.id}/activity-log",
            json={
                "narrative": "Vessel has arrived at the berth.",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["narrative"] == "Vessel has arrived at the berth."
        assert data["port_call_id"] == str(pc.id)
        assert data["logged_by_user_id"] == str(user.id)

        # List activity log entries
        list_resp = await client.get(f"/api/v1/port-calls/{pc.id}/activity-log")
        assert list_resp.status_code == 200
        entries = list_resp.json()
        assert len(entries) == 1
        assert entries[0]["id"] == data["id"]


@pytest.mark.asyncio
async def test_create_event_without_role_returns_403(client, session):
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

    resp = await client.post(
        f"/api/v1/port-calls/{pc.id}/events",
        json={
            "event_type": "Commenced Loading",
            "event_timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_log_without_role_returns_403(client, session):
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

    resp = await client.post(
        f"/api/v1/port-calls/{pc.id}/activity-log",
        json={
            "narrative": "Vessel has arrived at the berth.",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_returns_401(unauthenticated_client):
    random_id = uuid.uuid4()
    resp = await unauthenticated_client.get(f"/api/v1/port-calls/{random_id}/events")
    assert resp.status_code == 401

    resp = await unauthenticated_client.get(
        f"/api/v1/port-calls/{random_id}/activity-log"
    )
    assert resp.status_code == 401
