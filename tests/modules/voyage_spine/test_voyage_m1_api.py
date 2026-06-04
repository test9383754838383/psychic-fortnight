"""M1 Voyage Core — API layer round-trip for the new Properties fields."""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.services.auth_service import AuthService
from tests.modules.master_data.conftest import VesselFactory


@pytest.mark.asyncio
async def test_api_create_voyage_with_m1_fields(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    coord = await auth_service.create_user("coord_m1_1", "pass", ["Operations"])

    payload = {
        "voyage_no": "VOY-API-M1-1",
        "vessel_ref": str(vessel.id),
        "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        "status": "Forecast",
        "ops_coordinator_user_id": str(coord.id),
        "trade_area": "Mediterranean",
        "lob": "Tankers",
        "is_pool": True,
        "is_ice_class": True,
        "is_clean": False,
        "is_coated": True,
    }

    res = await client.post("/api/v1/voyages", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "Forecast"
    assert data["ops_coordinator_user_id"] == str(coord.id)
    assert data["trade_area"] == "Mediterranean"
    assert data["lob"] == "Tankers"
    assert data["is_pool"] is True
    assert data["is_ice_class"] is True
    assert data["is_clean"] is False
    assert data["is_coated"] is True


@pytest.mark.asyncio
async def test_api_patch_voyage_m1_fields(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    coord = await auth_service.create_user("coord_m1_2", "pass", ["Operations"])

    create = await client.post(
        "/api/v1/voyages",
        json={
            "voyage_no": "VOY-API-M1-2",
            "vessel_ref": str(vessel.id),
            "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        },
    )
    voyage_id = create.json()["id"]

    res = await client.patch(
        f"/api/v1/voyages/{voyage_id}",
        json={
            "ops_coordinator_user_id": str(coord.id),
            "trade_area": "Baltic",
            "lob": "Dry Bulk",
            "is_pool": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ops_coordinator_user_id"] == str(coord.id)
    assert data["trade_area"] == "Baltic"
    assert data["lob"] == "Dry Bulk"
    assert data["is_pool"] is True


@pytest.mark.asyncio
async def test_api_list_filter_by_ops_coordinator(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    coord_a = await auth_service.create_user("coord_m1_a", "pass", ["Operations"])
    coord_b = await auth_service.create_user("coord_m1_b", "pass", ["Operations"])

    for vno, coord_id in [
        ("VOY-API-M1-A", str(coord_a.id)),
        ("VOY-API-M1-B", str(coord_b.id)),
    ]:
        res = await client.post(
            "/api/v1/voyages",
            json={
                "voyage_no": vno,
                "vessel_ref": str(vessel.id),
                "commencing_datetime": datetime.now(timezone.utc).isoformat(),
                "ops_coordinator_user_id": coord_id,
            },
        )
        assert res.status_code == 201, res.text

    res = await client.get(
        "/api/v1/voyages", params={"ops_coordinator_user_id": str(coord_a.id)}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["voyage_no"] == "VOY-API-M1-A"
