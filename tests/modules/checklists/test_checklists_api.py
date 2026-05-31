import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.modules.auth.models.role import Role
from src.modules.checklists.exceptions import InvalidChecklistTypeError
from src.modules.auth.services.auth_service import AuthService
from src.modules.checklists.constants import (
    CHECKLIST_STATUS_OPEN,
    CHECKLIST_TYPE_PRE_ARRIVAL,
    CHECKLIST_TYPE_PRE_DEPARTURE,
    DEFAULT_ITEMS,
    ITEM_STATUS_PENDING,
    ITEM_STATUS_SIGNED_OFF,
)
from src.modules.checklists.models import Checklist, ChecklistItem
from src.modules.checklists.service.checklist_service import ChecklistService
from tests.modules.port_call.conftest import (
    PortCallFactory,
    PortFactory,
    VesselFactory,
    VoyageFactory,
)


async def _make_setup(session: AsyncSession):
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
    return port_call


async def _make_authenticated_client(app: FastAPI, session: AsyncSession):
    auth_service = AuthService(session)

    for role_name in ["Admin", "Operations", "Viewer"]:
        stmt = select(Role).where(Role.name == role_name)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            session.add(Role(name=role_name))
    await session.commit()

    user = await auth_service.create_user(
        f"checklists_{uuid.uuid4().hex[:8]}", "password", []
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


@pytest.mark.asyncio
async def test_create_pre_arrival_checklist_seeds_default_items_in_order(app, session):
    port_call = await _make_setup(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.post(
            f"/api/v1/port-calls/{port_call.id}/checklists",
            json={"checklist_type": CHECKLIST_TYPE_PRE_ARRIVAL},
        )

    assert response.status_code == 201
    payload = response.json()
    assert payload["port_call_id"] == str(port_call.id)
    assert payload["checklist_type"] == CHECKLIST_TYPE_PRE_ARRIVAL
    assert payload["status"] == CHECKLIST_STATUS_OPEN
    assert [item["sequence_no"] for item in payload["items"]] == [1, 2, 3, 4, 5]
    assert [item["item_name"] for item in payload["items"]] == DEFAULT_ITEMS[
        CHECKLIST_TYPE_PRE_ARRIVAL
    ]
    assert all(item["status"] == ITEM_STATUS_PENDING for item in payload["items"])
    assert all(item["signed_off_at"] is None for item in payload["items"])
    assert all(item["signed_off_by"] is None for item in payload["items"])


@pytest.mark.asyncio
async def test_create_pre_departure_checklist_seeds_expected_defaults(app, session):
    port_call = await _make_setup(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.post(
            f"/api/v1/port-calls/{port_call.id}/checklists",
            json={"checklist_type": CHECKLIST_TYPE_PRE_DEPARTURE},
        )

    assert response.status_code == 201
    payload = response.json()
    assert [item["item_name"] for item in payload["items"]] == DEFAULT_ITEMS[
        CHECKLIST_TYPE_PRE_DEPARTURE
    ]


@pytest.mark.asyncio
async def test_sign_off_sets_actor_and_time_and_keeps_checklist_open_until_last_item(
    app, session
):
    port_call = await _make_setup(session)
    client, user = await _make_authenticated_client(app, session)

    async with client:
        create_response = await client.post(
            f"/api/v1/port-calls/{port_call.id}/checklists",
            json={"checklist_type": CHECKLIST_TYPE_PRE_ARRIVAL},
        )
        item_id = create_response.json()["items"][0]["id"]

        sign_response = await client.post(
            f"/api/v1/checklist-items/{item_id}/sign-off",
        )
        checklist_id = create_response.json()["id"]
        checklist_response = await client.get(f"/api/v1/checklists/{checklist_id}")

    assert sign_response.status_code == 200
    item_payload = sign_response.json()
    assert item_payload["status"] == ITEM_STATUS_SIGNED_OFF
    assert item_payload["signed_off_by"] == str(user.id)
    assert item_payload["signed_off_at"] is not None

    checklist_payload = checklist_response.json()
    assert checklist_payload["status"] == CHECKLIST_STATUS_OPEN
    assert any(
        item["status"] == ITEM_STATUS_PENDING for item in checklist_payload["items"]
    )


@pytest.mark.asyncio
async def test_last_sign_off_auto_completes_checklist(app, session):
    port_call = await _make_setup(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        create_response = await client.post(
            f"/api/v1/port-calls/{port_call.id}/checklists",
            json={"checklist_type": CHECKLIST_TYPE_PRE_ARRIVAL},
        )
        checklist = create_response.json()

        for item in checklist["items"]:
            response = await client.post(
                f"/api/v1/checklist-items/{item['id']}/sign-off"
            )
            assert response.status_code == 200

        checklist_response = await client.get(f"/api/v1/checklists/{checklist['id']}")

    assert checklist_response.status_code == 200
    assert checklist_response.json()["status"] == "Completed"


@pytest.mark.asyncio
async def test_resign_is_idempotent_and_preserves_original_actor_and_timestamp(
    app, session
):
    port_call = await _make_setup(session)
    client, user = await _make_authenticated_client(app, session)

    async with client:
        create_response = await client.post(
            f"/api/v1/port-calls/{port_call.id}/checklists",
            json={"checklist_type": CHECKLIST_TYPE_PRE_ARRIVAL},
        )
        item_id = create_response.json()["items"][0]["id"]

        first_response = await client.post(
            f"/api/v1/checklist-items/{item_id}/sign-off"
        )
        second_response = await client.post(
            f"/api/v1/checklist-items/{item_id}/sign-off"
        )

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert second_response.json()["status"] == ITEM_STATUS_SIGNED_OFF
    assert second_response.json()["signed_off_by"] == str(user.id)
    assert (
        second_response.json()["signed_off_at"]
        == first_response.json()["signed_off_at"]
    )


@pytest.mark.asyncio
async def test_get_checklist_returns_items_ordered_by_sequence_number(app, session):
    port_call = await _make_setup(session)
    checklist = Checklist(
        port_call_id=port_call.id,
        checklist_type=CHECKLIST_TYPE_PRE_ARRIVAL,
        status=CHECKLIST_STATUS_OPEN,
    )
    session.add(checklist)
    await session.flush()

    item_three = ChecklistItem(
        checklist_id=checklist.id,
        sequence_no=3,
        item_name="Third",
        status=ITEM_STATUS_PENDING,
    )
    item_one = ChecklistItem(
        checklist_id=checklist.id,
        sequence_no=1,
        item_name="First",
        status=ITEM_STATUS_PENDING,
    )
    item_two = ChecklistItem(
        checklist_id=checklist.id,
        sequence_no=2,
        item_name="Second",
        status=ITEM_STATUS_PENDING,
    )
    session.add_all([item_three, item_one, item_two])
    await session.commit()

    client, _ = await _make_authenticated_client(app, session)
    async with client:
        response = await client.get(f"/api/v1/checklists/{checklist.id}")

    assert response.status_code == 200
    assert [item["sequence_no"] for item in response.json()["items"]] == [1, 2, 3]


@pytest.mark.asyncio
async def test_list_checklists_for_port_call_orders_by_created_at(app, session):
    port_call = await _make_setup(session)
    first = Checklist(
        port_call_id=port_call.id,
        checklist_type=CHECKLIST_TYPE_PRE_ARRIVAL,
        status=CHECKLIST_STATUS_OPEN,
        created_at=datetime.now(timezone.utc),
    )
    second = Checklist(
        port_call_id=port_call.id,
        checklist_type=CHECKLIST_TYPE_PRE_DEPARTURE,
        status=CHECKLIST_STATUS_OPEN,
        created_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    session.add_all([first, second])
    await session.commit()

    client, _ = await _make_authenticated_client(app, session)
    async with client:
        response = await client.get(f"/api/v1/port-calls/{port_call.id}/checklists")

    assert response.status_code == 200
    assert [entry["id"] for entry in response.json()] == [str(first.id), str(second.id)]


@pytest.mark.asyncio
async def test_create_checklist_unknown_type_returns_422(app, session):
    port_call = await _make_setup(session)
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.post(
            f"/api/v1/port-calls/{port_call.id}/checklists",
            json={"checklist_type": "Invalid"},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_missing_checklist_returns_404(app, session):
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.get(f"/api/v1/checklists/{uuid.uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_checklist_missing_port_call_returns_404(app, session):
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.post(
            f"/api/v1/port-calls/{uuid.uuid4()}/checklists",
            json={"checklist_type": CHECKLIST_TYPE_PRE_ARRIVAL},
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_service_create_rejects_unknown_checklist_type(session):
    port_call = await _make_setup(session)
    user = await AuthService(session).create_user(
        f"service_{uuid.uuid4().hex[:8]}", "password", []
    )
    await session.commit()

    with pytest.raises(InvalidChecklistTypeError):
        await ChecklistService(session).create(port_call.id, "Invalid", user)


@pytest.mark.asyncio
async def test_sign_off_missing_item_returns_404(app, session):
    client, _ = await _make_authenticated_client(app, session)

    async with client:
        response = await client.post(f"/api/v1/checklist-items/{uuid.uuid4()}/sign-off")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_checklist_item_signed_off_by_has_real_user_foreign_key(session):
    port_call = await _make_setup(session)
    checklist = Checklist(
        port_call_id=port_call.id,
        checklist_type=CHECKLIST_TYPE_PRE_ARRIVAL,
        status=CHECKLIST_STATUS_OPEN,
    )
    session.add(checklist)
    await session.flush()

    item = ChecklistItem(
        checklist_id=checklist.id,
        sequence_no=1,
        item_name="FK test",
        status=ITEM_STATUS_SIGNED_OFF,
        signed_off_at=datetime.now(timezone.utc) + timedelta(minutes=1),
        signed_off_by=uuid.uuid4(),
    )
    session.add(item)

    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()


@pytest.mark.asyncio
async def test_create_checklist_requires_authentication(
    unauthenticated_client, session
):
    port_call = await _make_setup(session)

    response = await unauthenticated_client.post(
        f"/api/v1/port-calls/{port_call.id}/checklists",
        json={"checklist_type": CHECKLIST_TYPE_PRE_ARRIVAL},
    )

    assert response.status_code == 401
