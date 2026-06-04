"""M1 Voyage Core — production-elevation fields.

RED→GREEN for the Voyage Manager Properties panel data:
Forecast status, Ops Coordinator, Trade Area, LOB, and voyage flags
(Pool / Ice / Clean / Coated). Behavior tested through VoyageService only.
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.services.auth_service import AuthService
from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.models.voyage import VoyageStatus
from tests.modules.master_data.conftest import VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_forecast_status_exists() -> None:
    assert VoyageStatus.FORECAST.value == "Forecast"


@pytest.mark.asyncio
async def test_create_voyage_with_m1_fields_persists(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    coord = await auth_service.create_user("coord_svc_1", "pass", ["Operations"])

    service = VoyageService(session)
    voyage = await service.create(
        {
            "voyage_no": "VOY-M1-001",
            "vessel_ref": vessel.id,
            "commencing_datetime": datetime.now(timezone.utc),
            "status": VoyageStatus.FORECAST.value,
            "ops_coordinator_user_id": coord.id,
            "trade_area": "Mediterranean",
            "lob": "Tankers",
            "is_pool": True,
            "is_ice_class": True,
            "is_clean": False,
            "is_coated": True,
        }
    )

    assert voyage.status == VoyageStatus.FORECAST.value
    assert voyage.ops_coordinator_user_id == coord.id
    assert voyage.trade_area == "Mediterranean"
    assert voyage.lob == "Tankers"
    assert voyage.is_pool is True
    assert voyage.is_ice_class is True
    assert voyage.is_clean is False
    assert voyage.is_coated is True


@pytest.mark.asyncio
async def test_create_voyage_defaults_scheduled_and_flags_false(
    session: AsyncSession,
) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    service = VoyageService(session)
    voyage = await service.create(
        {
            "voyage_no": "VOY-M1-002",
            "vessel_ref": vessel.id,
            "commencing_datetime": datetime.now(timezone.utc),
        }
    )

    assert voyage.status == VoyageStatus.SCHEDULED.value
    assert voyage.ops_coordinator_user_id is None
    assert voyage.trade_area is None
    assert voyage.lob is None
    assert voyage.is_pool is False
    assert voyage.is_ice_class is False
    assert voyage.is_clean is False
    assert voyage.is_coated is False


@pytest.mark.asyncio
async def test_update_voyage_m1_fields(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    coord = await auth_service.create_user("coord_svc_2", "pass", ["Operations"])

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    updated = await service.update(
        voyage.id,
        {
            "ops_coordinator_user_id": coord.id,
            "trade_area": "Baltic",
            "lob": "Dry Bulk",
            "is_pool": True,
            "is_coated": True,
        },
    )

    assert updated.ops_coordinator_user_id == coord.id
    assert updated.trade_area == "Baltic"
    assert updated.lob == "Dry Bulk"
    assert updated.is_pool is True
    assert updated.is_coated is True


@pytest.mark.asyncio
async def test_forecast_transitions_to_scheduled(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.FORECAST.value
    )
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    moved = await service.transition_status(
        voyage.id, VoyageStatus.SCHEDULED.value
    )
    assert moved.status == VoyageStatus.SCHEDULED.value


@pytest.mark.asyncio
async def test_list_filter_by_ops_coordinator(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    auth_service = AuthService(session)
    coord_a = await auth_service.create_user("coord_list_a", "pass", ["Operations"])
    coord_b = await auth_service.create_user("coord_list_b", "pass", ["Operations"])

    service = VoyageService(session)
    await service.create(
        {
            "voyage_no": "VOY-M1-OPS-A",
            "vessel_ref": vessel.id,
            "commencing_datetime": datetime.now(timezone.utc),
            "ops_coordinator_user_id": coord_a.id,
        }
    )
    await service.create(
        {
            "voyage_no": "VOY-M1-OPS-B",
            "vessel_ref": vessel.id,
            "commencing_datetime": datetime.now(timezone.utc),
            "ops_coordinator_user_id": coord_b.id,
        }
    )

    res = await service.list(ops_coordinator_user_id=coord_a.id)
    assert len(res) == 1
    assert res[0].voyage_no == "VOY-M1-OPS-A"
