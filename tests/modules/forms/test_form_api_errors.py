import pytest
import uuid
from fastapi import status


@pytest.mark.asyncio
async def test_api_parse_invalid_anchor(client):
    # Both IDs provided
    resp = await client.post(
        "/api/v1/forms/parse",
        json={
            "raw_text": "...",
            "form_type": "Noon",
            "voyage_id": str(uuid.uuid4()),
            "port_call_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Neither ID provided
    resp = await client.post(
        "/api/v1/forms/parse", json={"raw_text": "...", "form_type": "Noon"}
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_api_unknown_form_type_returns_422(client):
    resp = await client.post(
        "/api/v1/forms/parse",
        json={
            "raw_text": "...",
            "form_type": "Weather",
            "voyage_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    resp = await client.post(
        "/api/v1/forms",
        json={
            "form_type": "Weather",
            "raw_fields": {},
            "voyage_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_api_create_manual_invalid_anchor(client):
    resp = await client.post(
        "/api/v1/forms",
        json={
            "form_type": "Noon",
            "raw_fields": {},
            "voyage_id": str(uuid.uuid4()),
            "port_call_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_api_get_not_found(client):
    resp = await client.get(f"/api/v1/forms/{uuid.uuid4()}")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_api_update_errors(client, ops_client, voyage):
    # 1. Create
    resp = await ops_client.post(
        "/api/v1/forms",
        json={"form_type": "Noon", "voyage_id": str(voyage.id), "raw_fields": {"v": 1}},
    )
    form_id = resp.json()["id"]

    # Not found
    resp = await client.patch(f"/api/v1/forms/{uuid.uuid4()}", json={"notes": "..."})
    assert resp.status_code == status.HTTP_404_NOT_FOUND

    # Invalid anchor update (both)
    resp = await client.patch(
        f"/api/v1/forms/{form_id}",
        json={"voyage_id": str(uuid.uuid4()), "port_call_id": str(uuid.uuid4())},
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_api_transition_errors(client, ops_client, voyage):
    # 1. Create
    resp = await ops_client.post(
        "/api/v1/forms",
        json={"form_type": "Noon", "voyage_id": str(voyage.id), "raw_fields": {"v": 1}},
    )
    form_id = resp.json()["id"]

    # Invalid status
    resp = await ops_client.post(
        f"/api/v1/forms/{form_id}/transition", json={"status": "Garbage"}
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Not found
    resp = await ops_client.post(
        f"/api/v1/forms/{uuid.uuid4()}/transition", json={"status": "Accepted"}
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND

    # Illegal transition
    resp = await ops_client.post(
        f"/api/v1/forms/{form_id}/transition", json={"status": "Queried"}
    )
    assert resp.status_code == status.HTTP_409_CONFLICT


@pytest.mark.asyncio
async def test_api_list_filters(ops_client, voyage):
    # Create one
    await ops_client.post(
        "/api/v1/forms",
        json={"form_type": "Noon", "voyage_id": str(voyage.id), "raw_fields": {"v": 1}},
    )

    # Filter by type
    resp = await ops_client.get("/api/v1/forms?form_type=Noon")
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()) >= 1

    # Filter by voyage
    resp = await ops_client.get(f"/api/v1/forms?voyage_id={voyage.id}")
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()) >= 1

    # Filter by status
    resp = await ops_client.get("/api/v1/forms?status=Received")
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()) >= 1

    # Filter by port_call (none match)
    resp = await ops_client.get(f"/api/v1/forms?port_call_id={uuid.uuid4()}")
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()) == 0
