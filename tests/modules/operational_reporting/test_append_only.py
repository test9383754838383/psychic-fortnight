"""test_append_only.py — verify no update/delete method or endpoint exists."""

import pytest

from src.modules.operational_reporting.exceptions import AppendOnlyViolationError
from src.modules.operational_reporting.services.port_activity_service import (
    PortActivityService,
)


def test_port_activity_service_has_no_update_method():
    """update/delete methods must not exist on PortActivityService."""
    assert not hasattr(PortActivityService, "update")
    assert not hasattr(PortActivityService, "delete")
    assert not hasattr(PortActivityService, "update_event")
    assert not hasattr(PortActivityService, "delete_event")
    assert not hasattr(PortActivityService, "update_log_entry")
    assert not hasattr(PortActivityService, "delete_log_entry")


def test_update_not_allowed_raises():
    """The static guard method raises AppendOnlyViolationError."""
    with pytest.raises(AppendOnlyViolationError):
        PortActivityService.update_not_allowed()


@pytest.mark.asyncio
async def test_api_put_event_returns_405(client, session):
    """PUT on events endpoint returns 405."""
    import uuid

    resp = await client.put(
        f"/api/v1/port-calls/{uuid.uuid4()}/events/{uuid.uuid4()}",
        json={},
    )
    assert resp.status_code in (404, 405)


@pytest.mark.asyncio
async def test_api_patch_event_returns_405(client, session):
    """PATCH on events endpoint returns 405."""
    import uuid

    resp = await client.patch(
        f"/api/v1/port-calls/{uuid.uuid4()}/events/{uuid.uuid4()}",
        json={},
    )
    assert resp.status_code in (404, 405)


@pytest.mark.asyncio
async def test_api_delete_event_returns_405(client, session):
    """DELETE on events endpoint returns 405."""
    import uuid

    resp = await client.delete(
        f"/api/v1/port-calls/{uuid.uuid4()}/events/{uuid.uuid4()}",
    )
    assert resp.status_code in (404, 405)


@pytest.mark.asyncio
async def test_api_patch_log_returns_405(client, session):
    """PATCH on activity-log endpoint returns 405."""
    import uuid

    resp = await client.patch(
        f"/api/v1/port-calls/{uuid.uuid4()}/activity-log/{uuid.uuid4()}",
        json={},
    )
    assert resp.status_code in (404, 405)


@pytest.mark.asyncio
async def test_api_delete_log_returns_405(client, session):
    """DELETE on activity-log endpoint returns 405."""
    import uuid

    resp = await client.delete(
        f"/api/v1/port-calls/{uuid.uuid4()}/activity-log/{uuid.uuid4()}",
    )
    assert resp.status_code in (404, 405)
