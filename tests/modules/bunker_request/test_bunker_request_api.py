import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.modules.auth.models.role import Role
from src.modules.auth.services.auth_service import AuthService
from src.modules.bunker_request.constants import (
    FUEL_TYPE_HFO,
    FUEL_TYPE_VLSFO,
    FUEL_TYPES,
    LEGAL_TRANSITIONS,
    STATUS_BLOCKED,
    STATUS_IN_PROGRESS,
    STATUS_RAISED,
    STATUS_STEMMED,
    STATUS_SUPPLIED,
)
from src.modules.bunker_request.exceptions import (
    BlockerNoteRequiredError,
    BunkerRequestTerminalError,
    IllegalTransitionError,
)
from src.modules.bunker_request.models.bunker_request import BunkerRequest
from src.modules.bunker_request.service.bunker_request_service import (
    BunkerRequestService,
)
from src.modules.bunker_request.service.dtos import (
    BunkerRequestCreateDTO,
    BunkerRequestUpdateDTO,
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
        f"bunker_{uuid.uuid4().hex[:8]}", "password", []
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


def test_fuel_types_has_eight_values():
    assert len(FUEL_TYPES) == 8


def test_legal_transitions_keys_cover_all_statuses():
    assert set(LEGAL_TRANSITIONS.keys()) == {
        STATUS_RAISED,
        STATUS_IN_PROGRESS,
        STATUS_STEMMED,
        STATUS_SUPPLIED,
        STATUS_BLOCKED,
    }


def test_supplied_is_terminal():
    assert LEGAL_TRANSITIONS[STATUS_SUPPLIED] == ()


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_sets_raised_status_raised_by_and_raised_at(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    dto = BunkerRequestCreateDTO(
        fuel_type=FUEL_TYPE_HFO,
        quantity_required_mt=450.0,
    )
    before = datetime.now(timezone.utc)
    br = await service.create(voyage.id, dto, user)
    after = datetime.now(timezone.utc)

    assert br.status == STATUS_RAISED
    assert br.raised_by == user.id
    assert before <= br.raised_at.replace(tzinfo=timezone.utc) <= after
    assert br.blocker_note is None
    assert br.fuel_type == FUEL_TYPE_HFO
    assert float(br.quantity_required_mt) == 450.0


@pytest.mark.asyncio
async def test_create_persists_optional_fields(session: AsyncSession):
    voyage, port_call = await _setup_voyage_and_port_call(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    eta = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)
    dto = BunkerRequestCreateDTO(
        fuel_type=FUEL_TYPE_VLSFO,
        quantity_required_mt=300.0,
        specification_grade="ISO 8217 RMG 380",
        max_sulphur_content=0.5,
        port_call_id=port_call.id,
        eta_supply=eta,
    )
    br = await service.create(voyage.id, dto, user)

    assert br.port_call_id == port_call.id
    assert br.specification_grade == "ISO 8217 RMG 380"
    assert float(br.max_sulphur_content) == 0.5
    assert br.eta_supply is not None


@pytest.mark.asyncio
async def test_create_unknown_voyage_raises_404(app: FastAPI, session: AsyncSession):
    client, _ = await _make_authenticated_client(app, session)
    async with client:
        response = await client.post(
            f"/api/v1/voyages/{uuid.uuid4()}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# FSM forward: Raised → In Progress → Stemmed → Supplied
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_forward_fsm(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )
    assert br.status == STATUS_RAISED

    br = await service.transition(br.id, STATUS_IN_PROGRESS, user)
    assert br.status == STATUS_IN_PROGRESS

    br = await service.transition(br.id, STATUS_STEMMED, user)
    assert br.status == STATUS_STEMMED

    br = await service.transition(br.id, STATUS_SUPPLIED, user)
    assert br.status == STATUS_SUPPLIED


# ---------------------------------------------------------------------------
# Blocked from each non-terminal status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "path_to_status",
    [
        [STATUS_RAISED],
        [STATUS_RAISED, STATUS_IN_PROGRESS],
        [STATUS_RAISED, STATUS_IN_PROGRESS, STATUS_STEMMED],
    ],
)
async def test_block_from_each_non_terminal_status(
    path_to_status: list[str], session: AsyncSession
):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )

    # Walk forward to desired starting state
    for target in path_to_status[1:]:
        br = await service.transition(br.id, target, user)

    starting_status = path_to_status[-1]
    assert br.status == starting_status

    # Now block
    br = await service.transition(
        br.id, STATUS_BLOCKED, user, blocker_note="Port congestion"
    )
    assert br.status == STATUS_BLOCKED
    assert br.blocker_note == "Port congestion"


# ---------------------------------------------------------------------------
# Unblock
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "unblock_target",
    [STATUS_RAISED, STATUS_IN_PROGRESS, STATUS_STEMMED],
)
async def test_unblock_to_any_allowed_target_clears_blocker_note(
    unblock_target: str, session: AsyncSession
):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )
    br = await service.transition(
        br.id, STATUS_BLOCKED, user, blocker_note="Supplier issue"
    )
    assert br.blocker_note == "Supplier issue"

    br = await service.transition(br.id, unblock_target, user)
    assert br.status == unblock_target
    assert br.blocker_note is None


# ---------------------------------------------------------------------------
# blocker_note mandatory on Blocked
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_transition_to_blocked_without_note_raises_422(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )

    with pytest.raises(BlockerNoteRequiredError):
        await service.transition(br.id, STATUS_BLOCKED, user, blocker_note=None)


@pytest.mark.asyncio
async def test_transition_blocked_no_note_http_422(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, user = await _make_authenticated_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        assert create_resp.status_code == 201
        br_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/v1/bunker-requests/{br_id}/transition",
            json={"status": STATUS_BLOCKED},
        )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Terminal immutability
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_transition_from_supplied_raises_409(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )
    br = await service.transition(br.id, STATUS_IN_PROGRESS, user)
    br = await service.transition(br.id, STATUS_STEMMED, user)
    br = await service.transition(br.id, STATUS_SUPPLIED, user)

    with pytest.raises(IllegalTransitionError):
        await service.transition(br.id, STATUS_IN_PROGRESS, user)


@pytest.mark.asyncio
async def test_update_supplied_raises_409(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )
    br = await service.transition(br.id, STATUS_IN_PROGRESS, user)
    br = await service.transition(br.id, STATUS_STEMMED, user)
    br = await service.transition(br.id, STATUS_SUPPLIED, user)

    with pytest.raises(BunkerRequestTerminalError):
        await service.update(
            br.id,
            BunkerRequestUpdateDTO(quantity_required_mt=999.0),
            user,
        )


@pytest.mark.asyncio
async def test_update_supplied_http_409(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, user = await _make_authenticated_client(app, session)

    async with client:
        resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        br_id = resp.json()["id"]
        await client.post(
            f"/api/v1/bunker-requests/{br_id}/transition",
            json={"status": STATUS_IN_PROGRESS},
        )
        await client.post(
            f"/api/v1/bunker-requests/{br_id}/transition",
            json={"status": STATUS_STEMMED},
        )
        await client.post(
            f"/api/v1/bunker-requests/{br_id}/transition",
            json={"status": STATUS_SUPPLIED},
        )
        patch_resp = await client.patch(
            f"/api/v1/bunker-requests/{br_id}",
            json={"quantity_required_mt": 999.0},
        )
    assert patch_resp.status_code == 409


# ---------------------------------------------------------------------------
# Illegal transitions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_illegal_transition_raises_409(session: AsyncSession):
    voyage = await _setup_voyage(session)
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    service = BunkerRequestService(session)
    br = await service.create(
        voyage.id,
        BunkerRequestCreateDTO(fuel_type=FUEL_TYPE_HFO, quantity_required_mt=100.0),
        user,
    )
    # Raised → Supplied is illegal (must go through In Progress → Stemmed)
    with pytest.raises(IllegalTransitionError):
        await service.transition(br.id, STATUS_SUPPLIED, user)


@pytest.mark.asyncio
async def test_illegal_transition_http_409(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        br_id = create_resp.json()["id"]
        resp = await client.post(
            f"/api/v1/bunker-requests/{br_id}/transition",
            json={"status": STATUS_SUPPLIED},
        )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Cross-module FK: voyage_id must exist
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bunker_request_voyage_fk_enforced(session: AsyncSession):
    """Inserting a BunkerRequest with a non-existent voyage_id must fail."""
    user = await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )
    await session.commit()

    br = BunkerRequest(
        voyage_id=uuid.uuid4(),  # does not exist
        fuel_type=FUEL_TYPE_HFO,
        quantity_required_mt=100.0,
        status=STATUS_RAISED,
        raised_by=user.id,
        raised_at=datetime.now(timezone.utc),
    )
    session.add(br)
    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()


# ---------------------------------------------------------------------------
# Auth required
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_requires_authentication(
    unauthenticated_client: AsyncClient, session: AsyncSession
):
    voyage = await _setup_voyage(session)
    response = await unauthenticated_client.post(
        f"/api/v1/voyages/{voyage.id}/bunker-requests",
        json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_requires_authentication(
    unauthenticated_client: AsyncClient, session: AsyncSession
):
    voyage = await _setup_voyage(session)
    response = await unauthenticated_client.get(
        f"/api/v1/voyages/{voyage.id}/bunker-requests"
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_one_requires_authentication(unauthenticated_client: AsyncClient):
    response = await unauthenticated_client.get(
        f"/api/v1/bunker-requests/{uuid.uuid4()}"
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_transition_requires_authentication(unauthenticated_client: AsyncClient):
    response = await unauthenticated_client.post(
        f"/api/v1/bunker-requests/{uuid.uuid4()}/transition",
        json={"status": STATUS_IN_PROGRESS},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# API happy paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_api_returns_201_with_correct_fields(
    app: FastAPI, session: AsyncSession
):
    voyage = await _setup_voyage(session)
    client, user = await _make_authenticated_client(app, session)

    async with client:
        resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 450.0},
        )

    assert resp.status_code == 201
    payload = resp.json()
    assert payload["fuel_type"] == FUEL_TYPE_HFO
    assert payload["status"] == STATUS_RAISED
    assert payload["raised_by"] == str(user.id)
    assert payload["voyage_id"] == str(voyage.id)
    assert payload["blocker_note"] is None


@pytest.mark.asyncio
async def test_list_api_returns_bunker_requests_for_voyage(
    app: FastAPI, session: AsyncSession
):
    voyage = await _setup_voyage(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_VLSFO, "quantity_required_mt": 200.0},
        )
        resp = await client.get(f"/api/v1/voyages/{voyage.id}/bunker-requests")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_one_api_returns_correct_record(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        br_id = create_resp.json()["id"]
        resp = await client.get(f"/api/v1/bunker-requests/{br_id}")

    assert resp.status_code == 200
    assert resp.json()["id"] == br_id


@pytest.mark.asyncio
async def test_get_one_missing_returns_404(app: FastAPI, session: AsyncSession):
    client, _ = await _make_authenticated_client(app, session)
    async with client:
        resp = await client.get(f"/api/v1/bunker-requests/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_transition_api_forward_fsm(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        br_id = create_resp.json()["id"]

        for target in [STATUS_IN_PROGRESS, STATUS_STEMMED, STATUS_SUPPLIED]:
            resp = await client.post(
                f"/api/v1/bunker-requests/{br_id}/transition",
                json={"status": target},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == target


@pytest.mark.asyncio
async def test_update_api_patches_allowed_fields(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        create_resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": FUEL_TYPE_HFO, "quantity_required_mt": 100.0},
        )
        br_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/bunker-requests/{br_id}",
            json={
                "quantity_required_mt": 999.9,
                "specification_grade": "ISO 8217 RMG 380",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["quantity_required_mt"] == 999.9
    assert resp.json()["specification_grade"] == "ISO 8217 RMG 380"


@pytest.mark.asyncio
async def test_unknown_fuel_type_returns_422(app: FastAPI, session: AsyncSession):
    voyage = await _setup_voyage(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        resp = await client.post(
            f"/api/v1/voyages/{voyage.id}/bunker-requests",
            json={"fuel_type": "DIESEL", "quantity_required_mt": 100.0},
        )
    assert resp.status_code == 422
