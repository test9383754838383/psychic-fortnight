import json
import pytest
from fastapi import status

from src.modules.forms.api.router import get_forms_structured_client
from src.modules.forms.constants import FormStatus
from tests.modules.forms.test_parser import (
    SequenceFakeStructuredClient,
    _NOON_VALID_PAYLOAD,
)


@pytest.mark.asyncio
async def test_api_parse_noon(app, ops_client, voyage):
    fake_client = SequenceFakeStructuredClient([json.dumps(_NOON_VALID_PAYLOAD)])
    app.dependency_overrides[get_forms_structured_client] = lambda: fake_client
    try:
        resp = await ops_client.post(
            "/api/v1/forms/parse",
            json={
                "raw_text": "Noon Report...",
                "form_type": "Noon",
                "voyage_id": str(voyage.id),
            },
        )
    finally:
        app.dependency_overrides.pop(get_forms_structured_client, None)

    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["form_type"] == "Noon"
    assert data["status"] == FormStatus.RECEIVED.value
    assert data["parse_failed"] is False
    assert data["raw_fields"]["vessel_name"] == "MV TEST"
    assert len(data["parse_attempts"]) == 1
    assert data["parse_attempts"][0]["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_api_parse_failure_returns_reviewable_form(app, ops_client, voyage):
    raw_text = "Unreadable pasted email"
    fake_client = SequenceFakeStructuredClient(
        [Exception("LLM timeout"), Exception("LLM timeout")]
    )
    app.dependency_overrides[get_forms_structured_client] = lambda: fake_client
    try:
        resp = await ops_client.post(
            "/api/v1/forms/parse",
            json={
                "raw_text": raw_text,
                "form_type": "Noon",
                "voyage_id": str(voyage.id),
            },
        )
    finally:
        app.dependency_overrides.pop(get_forms_structured_client, None)

    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["status"] == FormStatus.RECEIVED.value
    assert data["parse_failed"] is True
    assert data["raw_source_ref"] == raw_text
    assert data["parse_attempts"][0]["status"] == "MANUAL_REVIEW"


@pytest.mark.asyncio
async def test_api_manual_create(ops_client, voyage):
    resp = await ops_client.post(
        "/api/v1/forms",
        json={
            "form_type": "Bunkering",
            "voyage_id": str(voyage.id),
            "raw_fields": {"fuel": 500},
            "notes": "API test",
        },
    )

    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["notes"] == "API test"
    assert data["raw_fields"] == {"fuel": 500}


@pytest.mark.asyncio
async def test_api_list_and_get(ops_client, voyage):
    first = await ops_client.post(
        "/api/v1/forms",
        json={"form_type": "Noon", "voyage_id": str(voyage.id), "raw_fields": {"v": 1}},
    )
    second = await ops_client.post(
        "/api/v1/forms",
        json={
            "form_type": "Arrival",
            "voyage_id": str(voyage.id),
            "raw_fields": {"v": 2},
        },
    )

    resp = await ops_client.get("/api/v1/forms")
    assert resp.status_code == status.HTTP_200_OK
    rows = resp.json()
    assert [rows[0]["id"], rows[1]["id"]] == [
        second.json()["id"],
        first.json()["id"],
    ]

    form_id = resp.json()[0]["id"]

    # Get
    resp = await ops_client.get(f"/api/v1/forms/{form_id}")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["id"] == form_id


@pytest.mark.asyncio
async def test_api_transition_workflow(ops_client, voyage):
    # 1. Create
    resp = await ops_client.post(
        "/api/v1/forms",
        json={"form_type": "Noon", "voyage_id": str(voyage.id), "raw_fields": {"v": 1}},
    )
    form_id = resp.json()["id"]

    # 2. Transition to Under Review
    resp = await ops_client.post(
        f"/api/v1/forms/{form_id}/transition", json={"status": "Under Review"}
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["status"] == "Under Review"

    # 3. Accept (Ops user)
    resp = await ops_client.post(
        f"/api/v1/forms/{form_id}/transition", json={"status": "Accepted"}
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["status"] == "Accepted"

    # 4. Try to update accepted form (Conflict)
    resp = await ops_client.patch(
        f"/api/v1/forms/{form_id}", json={"notes": "Late note"}
    )
    assert resp.status_code == status.HTTP_409_CONFLICT


@pytest.mark.asyncio
async def test_api_role_gate(unauthenticated_client):
    # Unauthenticated fails
    resp = await unauthenticated_client.get("/api/v1/forms")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
