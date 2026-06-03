"""M1 Hardening — FK ops_coordinator, field clearing, status param removal.

Behavior tested through the public API (PATCH /api/v1/voyages/{id}).
"""

import uuid
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.services.auth_service import AuthService
from tests.modules.master_data.conftest import VesselFactory


async def _create_voyage(
    client: AsyncClient, vessel_id: str, voyage_no: str, **kwargs
) -> dict:
    payload = {
        "voyage_no": voyage_no,
        "vessel_ref": vessel_id,
        "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        **kwargs,
    }
    res = await client.post("/api/v1/voyages", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


@pytest.mark.asyncio
async def test_ops_coordinator_must_be_real_user(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    fake_user_id = str(uuid.uuid4())
    res = await client.post(
        "/api/v1/voyages",
        json={
            "voyage_no": "HARD-001",
            "vessel_ref": str(vessel.id),
            "commencing_datetime": datetime.now(timezone.utc).isoformat(),
            "ops_coordinator_user_id": fake_user_id,
        },
    )
    assert res.status_code == 400
    assert "ops_coordinator_user_id" in res.json()["message"].lower() or "user" in res.json()["message"].lower()


@pytest.mark.asyncio
async def test_ops_coordinator_set_to_real_user(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    user = await auth_service.create_user("coord_user_1", "pass", ["Operations"])

    voyage = await _create_voyage(
        client,
        str(vessel.id),
        "HARD-002",
        ops_coordinator_user_id=str(user.id),
    )
    assert voyage["ops_coordinator_user_id"] == str(user.id)


@pytest.mark.asyncio
async def test_patch_can_clear_ops_coordinator(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    user = await auth_service.create_user("coord_user_2", "pass", ["Operations"])

    voyage = await _create_voyage(
        client,
        str(vessel.id),
        "HARD-003",
        ops_coordinator_user_id=str(user.id),
    )
    assert voyage["ops_coordinator_user_id"] == str(user.id)

    res = await client.patch(
        f"/api/v1/voyages/{voyage['id']}",
        json={"ops_coordinator_user_id": None},
    )
    assert res.status_code == 200
    assert res.json()["ops_coordinator_user_id"] is None


@pytest.mark.asyncio
async def test_patch_can_clear_trade_area(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = await _create_voyage(
        client, str(vessel.id), "HARD-004", trade_area="Mediterranean"
    )
    assert voyage["trade_area"] == "Mediterranean"

    res = await client.patch(
        f"/api/v1/voyages/{voyage['id']}",
        json={"trade_area": None},
    )
    assert res.status_code == 200
    assert res.json()["trade_area"] is None


@pytest.mark.asyncio
async def test_patch_can_clear_lob(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = await _create_voyage(
        client, str(vessel.id), "HARD-005", lob="Tankers"
    )
    assert voyage["lob"] == "Tankers"

    res = await client.patch(
        f"/api/v1/voyages/{voyage['id']}",
        json={"lob": None},
    )
    assert res.status_code == 200
    assert res.json()["lob"] is None


@pytest.mark.asyncio
async def test_patch_absent_field_not_cleared(
    client: AsyncClient, session: AsyncSession
) -> None:
    """PATCH without a field in the body must not clear it."""
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = await _create_voyage(
        client, str(vessel.id), "HARD-006", trade_area="Baltic", lob="Dry Bulk"
    )

    # Only update is_pool; trade_area and lob must be preserved
    res = await client.patch(
        f"/api/v1/voyages/{voyage['id']}",
        json={"is_pool": True},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_pool"] is True
    assert data["trade_area"] == "Baltic"
    assert data["lob"] == "Dry Bulk"
