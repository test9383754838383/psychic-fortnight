import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.modules.auth.models.role import Role
from src.modules.auth.services.auth_service import AuthService
from src.modules.delay_tracking.constants import (
    DELAY_TYPES,
    FAULT_ATTRIBUTIONS,
    DELAY_TYPE_WEATHER,
    DELAY_TYPE_MECHANICAL,
    FAULT_ATTRIBUTION_WEATHER,
    FAULT_ATTRIBUTION_VESSEL,
)
from src.modules.delay_tracking.exceptions import (
    DelayAnchorConflictError,
)
from src.modules.delay_tracking.service.delay_service import DelayService
from src.modules.delay_tracking.service.dtos import (
    DelayCreateDTO,
    DelayUpdateDTO,
)
from tests.modules.port_call.conftest import PortCallFactory, PortFactory, VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _setup_voyage(session: AsyncSession):
    """Create and persist a vessel + voyage, return voyage."""
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()
    return voyage


async def _setup_voyage_and_port_call(session: AsyncSession):
    """Create vessel, voyage, port + port_call."""
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.flush()
    port_call = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(port_call)
    await session.commit()
    return voyage, port_call


async def _make_authenticated_client(app: FastAPI, session: AsyncSession):
    auth_service = AuthService(session)
    for role_name in ["Admin", "Operations", "Viewer"]:
        stmt = select(Role).where(Role.name == role_name)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            session.add(Role(name=role_name))
    await session.commit()

    user = await auth_service.create_user(
        f"delay_{uuid.uuid4().hex[:8]}", "password", []
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
# Constants sanity
# ---------------------------------------------------------------------------


def test_constants_sanity():
    assert len(DELAY_TYPES) == 12
    assert len(FAULT_ATTRIBUTIONS) == 5
    assert "Weather" in DELAY_TYPES
    assert "Force Majeure" in FAULT_ATTRIBUTIONS


# ---------------------------------------------------------------------------
# Create & Service Logic
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_voyage_level_delay(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        description="Heavy wind and high waves",
    )
    delay = await service.create(voyage.id, dto, user)

    assert delay.voyage_id == voyage.id
    assert delay.port_call_id is None
    assert delay.leg_ref is None
    assert delay.delay_type == DELAY_TYPE_WEATHER
    assert delay.fault_attribution == FAULT_ATTRIBUTION_WEATHER
    assert delay.start_datetime == datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
    assert delay.description == "Heavy wind and high waves"
    assert delay.recorded_by == user.id
    assert delay.approved_by is None


@pytest.mark.asyncio
async def test_create_port_call_level_delay(session: AsyncSession):
    voyage, port_call = await _setup_voyage_and_port_call(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_MECHANICAL,
        fault_attribution=FAULT_ATTRIBUTION_VESSEL,
        start_datetime=datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc),
        end_datetime=datetime(2026, 6, 1, 15, 30, tzinfo=timezone.utc),
        claimed_duration=3.5,
        port_call_id=port_call.id,
        description="Engine maintenance on arrival",
    )
    delay = await service.create(voyage.id, dto, user)

    assert delay.voyage_id == voyage.id
    assert delay.port_call_id == port_call.id
    assert delay.leg_ref is None
    assert delay.delay_type == DELAY_TYPE_MECHANICAL
    assert delay.fault_attribution == FAULT_ATTRIBUTION_VESSEL
    assert float(delay.claimed_duration) == 3.5
    assert delay.end_datetime == datetime(2026, 6, 1, 15, 30, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_create_leg_level_delay(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 8, 0, tzinfo=timezone.utc),
        leg_ref="CNSGH-USLAX-01",
        description="Storm transit",
    )
    delay = await service.create(voyage.id, dto, user)

    assert delay.voyage_id == voyage.id
    assert delay.port_call_id is None
    assert delay.leg_ref == "CNSGH-USLAX-01"


@pytest.mark.asyncio
async def test_create_both_anchors_set_fails(app: FastAPI, session: AsyncSession):
    client, _ = await _make_authenticated_client(app, session)
    voyage, port_call = await _setup_voyage_and_port_call(session)

    async with client:
        response = await client.post(
            f"/api/v1/voyages/{voyage.id}/delays",
            json={
                "delay_type": DELAY_TYPE_WEATHER,
                "fault_attribution": FAULT_ATTRIBUTION_WEATHER,
                "start_datetime": "2026-06-01T10:00:00Z",
                "description": "Anchor conflict test",
                "port_call_id": str(port_call.id),
                "leg_ref": "CNSGH-USLAX-01",
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_nonexistent_voyage_fails(app: FastAPI, session: AsyncSession):
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.post(
            f"/api/v1/voyages/{uuid.uuid4()}/delays",
            json={
                "delay_type": DELAY_TYPE_WEATHER,
                "fault_attribution": FAULT_ATTRIBUTION_WEATHER,
                "start_datetime": "2026-06-01T10:00:00Z",
                "description": "Non-existent voyage test",
            },
        )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Get & List Endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_and_list_delays(app: FastAPI, session: AsyncSession):
    client, user = await _make_authenticated_client(app, session)
    voyage, port_call = await _setup_voyage_and_port_call(session)

    service = DelayService(session)
    dto1 = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        end_datetime=datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc),
        description="Weather delay",
    )
    dto2 = DelayCreateDTO(
        delay_type=DELAY_TYPE_MECHANICAL,
        fault_attribution=FAULT_ATTRIBUTION_VESSEL,
        start_datetime=datetime(2026, 6, 1, 14, 0, tzinfo=timezone.utc),
        port_call_id=port_call.id,
        description="Mechanical delay",
    )
    d1 = await service.create(voyage.id, dto1, user)
    d2 = await service.create(voyage.id, dto2, user)

    async with client:
        # Get one
        response = await client.get(f"/api/v1/delays/{d1.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(d1.id)
        assert data["delay_type"] == DELAY_TYPE_WEATHER
        assert data["actual_duration"] == 2.0  # Derived 2 hours

        # Get non-existent
        response_404 = await client.get(f"/api/v1/delays/{uuid.uuid4()}")
        assert response_404.status_code == 404

        # List for voyage
        response_list = await client.get(f"/api/v1/voyages/{voyage.id}/delays")
        assert response_list.status_code == 200
        list_data = response_list.json()
        assert len(list_data) == 2
        # Verify order by start_datetime
        assert list_data[0]["id"] == str(d1.id)
        assert list_data[1]["id"] == str(d2.id)
        assert list_data[1]["actual_duration"] is None  # open delay


# ---------------------------------------------------------------------------
# Update & Approval Lock Logic
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_open_delay_succeeds(app: FastAPI, session: AsyncSession):
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        description="Storm",
    )
    delay = await service.create(voyage.id, dto, user)

    async with client:
        response = await client.patch(
            f"/api/v1/delays/{delay.id}",
            json={
                "delay_type": DELAY_TYPE_MECHANICAL,
                "claimed_duration": 4.25,
                "description": "Storm and boiler breakdown",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["delay_type"] == DELAY_TYPE_MECHANICAL
        assert data["claimed_duration"] == 4.25
        assert data["description"] == "Storm and boiler breakdown"


@pytest.mark.asyncio
async def test_approve_locks_record(app: FastAPI, session: AsyncSession):
    client, user = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        description="Storm",
    )
    delay = await service.create(voyage.id, dto, user)

    async with client:
        # Before approval, approved_by is null
        response = await client.get(f"/api/v1/delays/{delay.id}")
        assert response.json()["approved_by"] is None

        # Approve
        response_approve = await client.post(f"/api/v1/delays/{delay.id}/approve")
        assert response_approve.status_code == 200
        data_app = response_approve.json()
        assert data_app["approved_by"] == str(user.id)

        # After approval, edit attempts should fail with 409
        response_edit = await client.patch(
            f"/api/v1/delays/{delay.id}",
            json={"description": "Try to edit approved record"},
        )
        assert response_edit.status_code == 409


@pytest.mark.asyncio
async def test_service_create_anchor_conflict_raises_error(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        description="Conflict",
        port_call_id=uuid.uuid4(),
        leg_ref="CNSGH-USLAX-01",
    )
    with pytest.raises(DelayAnchorConflictError):
        await service.create(voyage.id, dto, user)


@pytest.mark.asyncio
async def test_service_update_all_fields(session: AsyncSession):
    voyage, port_call = await _setup_voyage_and_port_call(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        description="Storm",
    )
    delay = await service.create(voyage.id, dto, user)

    # Update all fields in service directly to cover all DTO check branches
    update_dto = DelayUpdateDTO(
        delay_type=DELAY_TYPE_MECHANICAL,
        fault_attribution=FAULT_ATTRIBUTION_VESSEL,
        start_datetime=datetime(2026, 6, 1, 11, 0, tzinfo=timezone.utc),
        end_datetime=datetime(2026, 6, 1, 13, 0, tzinfo=timezone.utc),
        claimed_duration=2.0,
        description="Updated storm and boiler",
        port_call_id=port_call.id,
    )
    updated = await service.update(delay.id, update_dto, user)
    assert updated.delay_type == DELAY_TYPE_MECHANICAL
    assert updated.fault_attribution == FAULT_ATTRIBUTION_VESSEL
    assert updated.start_datetime == datetime(2026, 6, 1, 11, 0, tzinfo=timezone.utc)
    assert updated.end_datetime == datetime(2026, 6, 1, 13, 0, tzinfo=timezone.utc)
    assert float(updated.claimed_duration) == 2.0
    assert updated.description == "Updated storm and boiler"
    assert updated.port_call_id == port_call.id
    assert updated.leg_ref is None

    # Now test that updating leg_ref on an existing delay with port_call_id raises DelayAnchorConflictError.
    update_conflict_dto = DelayUpdateDTO(leg_ref="CNSGH-USLAX-02")
    with pytest.raises(DelayAnchorConflictError):
        await service.update(delay.id, update_conflict_dto, user)

    # Now let's clear port_call_id and set leg_ref in database directly to test the leg_ref branch update
    # In SQLite we can just mock/set delay.port_call_id to None and then save, or just create a new delay with leg_ref and update its leg_ref.
    dto_leg = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        leg_ref="CNSGH-01",
        description="Storm passage",
    )
    delay_leg = await service.create(voyage.id, dto_leg, user)
    update_leg_dto = DelayUpdateDTO(leg_ref="CNSGH-02")
    updated_leg = await service.update(delay_leg.id, update_leg_dto, user)
    assert updated_leg.leg_ref == "CNSGH-02"


@pytest.mark.asyncio
async def test_update_body_anchor_conflict(app: FastAPI, session: AsyncSession):
    client, _ = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = DelayService(session)
    dto = DelayCreateDTO(
        delay_type=DELAY_TYPE_WEATHER,
        fault_attribution=FAULT_ATTRIBUTION_WEATHER,
        start_datetime=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc),
        description="Storm",
    )
    delay = await service.create(voyage.id, dto, user)

    async with client:
        # Patch with both port_call_id and leg_ref set at HTTP level -> Pydantic validator should raise 422
        response = await client.patch(
            f"/api/v1/delays/{delay.id}",
            json={
                "port_call_id": str(uuid.uuid4()),
                "leg_ref": "CNSGH-02",
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_create_delay_succeeds(app: FastAPI, session: AsyncSession):
    client, _ = await _make_authenticated_client(app, session)
    voyage = await _setup_voyage(session)

    async with client:
        response = await client.post(
            f"/api/v1/voyages/{voyage.id}/delays",
            json={
                "delay_type": DELAY_TYPE_WEATHER,
                "fault_attribution": FAULT_ATTRIBUTION_WEATHER,
                "start_datetime": "2026-06-01T10:00:00Z",
                "end_datetime": "2026-06-01T12:30:00Z",
                "claimed_duration": 2.5,
                "description": "Storm transit",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["delay_type"] == DELAY_TYPE_WEATHER
        assert data["actual_duration"] == 2.5


# ---------------------------------------------------------------------------
# Auth protection
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unauthenticated_requests_fail(unauthenticated_client: AsyncClient):
    r1 = await unauthenticated_client.post(
        f"/api/v1/voyages/{uuid.uuid4()}/delays",
        json={
            "delay_type": "Other",
            "fault_attribution": "Vessel",
            "start_datetime": "2026-06-01T10:00:00Z",
            "description": "No auth",
        },
    )
    assert r1.status_code == 401

    r2 = await unauthenticated_client.get(f"/api/v1/voyages/{uuid.uuid4()}/delays")
    assert r2.status_code == 401

    r3 = await unauthenticated_client.get(f"/api/v1/delays/{uuid.uuid4()}")
    assert r3.status_code == 401

    r4 = await unauthenticated_client.patch(
        f"/api/v1/delays/{uuid.uuid4()}",
        json={"description": "No auth edit"},
    )
    assert r4.status_code == 401

    r5 = await unauthenticated_client.post(f"/api/v1/delays/{uuid.uuid4()}/approve")
    assert r5.status_code == 401
