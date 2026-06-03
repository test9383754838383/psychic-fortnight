"""M2 Itinerary — speed_kts / distance_nm / eca_nm fields + computed port_days / sea_days."""

import math
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.modules.master_data.conftest import VesselFactory, PortFactory
from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.api.voyages import ItineraryLineResponseDTO


# ── helpers ──────────────────────────────────────────────────────────────────

def _eta() -> datetime:
    return datetime.now(timezone.utc)


def _etd(days: float = 1.0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


async def _create_voyage(client: AsyncClient, vessel_id: str) -> str:
    res = await client.post(
        "/api/v1/voyages",
        json={
            "voyage_no": f"M2-{vessel_id[:8]}",
            "vessel_ref": vessel_id,
            "commencing_datetime": _eta().isoformat(),
        },
    )
    assert res.status_code == 201
    return res.json()["id"]


# ── service tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_insert_itinerary_line_with_m2_fields(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    svc = VoyageService(session)
    voyage = await svc.create(
        {
            "voyage_no": "M2-SVC-001",
            "vessel_ref": vessel.id,
            "commencing_datetime": _eta(),
        }
    )

    line = await svc.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": _eta(),
            "planned_etd": _etd(2),
            "speed_kts": Decimal("14.5"),
            "distance_nm": Decimal("1200.00"),
            "eca_nm": Decimal("300.00"),
        },
    )

    assert line.speed_kts == Decimal("14.5")
    assert line.distance_nm == Decimal("1200.00")
    assert line.eca_nm == Decimal("300.00")


@pytest.mark.asyncio
async def test_itinerary_line_ballast_function(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    svc = VoyageService(session)
    voyage = await svc.create(
        {
            "voyage_no": "M2-SVC-002",
            "vessel_ref": vessel.id,
            "commencing_datetime": _eta(),
        }
    )

    line = await svc.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Ballast",
            "planned_eta": _eta(),
            "planned_etd": _etd(1),
        },
    )

    assert line.port_function == "Ballast"


@pytest.mark.asyncio
async def test_port_days_computed(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    svc = VoyageService(session)
    voyage = await svc.create(
        {
            "voyage_no": "M2-SVC-003",
            "vessel_ref": vessel.id,
            "commencing_datetime": _eta(),
        }
    )

    eta = datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc)
    etd = datetime(2026, 6, 3, 0, 0, tzinfo=timezone.utc)  # 2 days exactly

    line = await svc.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": eta,
            "planned_etd": etd,
        },
    )

    dto = ItineraryLineResponseDTO.model_validate(line)
    assert dto.port_days == pytest.approx(2.0, abs=1e-6)


@pytest.mark.asyncio
async def test_sea_days_computed(session: AsyncSession) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    svc = VoyageService(session)
    voyage = await svc.create(
        {
            "voyage_no": "M2-SVC-004",
            "vessel_ref": vessel.id,
            "commencing_datetime": _eta(),
        }
    )

    line = await svc.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": _eta(),
            "planned_etd": _etd(1),
            "speed_kts": Decimal("12.0"),
            "distance_nm": Decimal("1200.0"),  # 1200nm / 12kts / 24h = 4.167 days
        },
    )

    dto = ItineraryLineResponseDTO.model_validate(line)
    assert dto.sea_days is not None
    assert dto.sea_days == pytest.approx(1200.0 / (12.0 * 24), rel=1e-4)


# ── API tests ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_api_insert_itinerary_line_m2_fields(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    voyage_id = await _create_voyage(client, str(vessel.id))

    res = await client.post(
        f"/api/v1/voyages/{voyage_id}/itinerary",
        json={
            "port_ref": str(port.id),
            "port_function": "Load",
            "planned_eta": "2026-06-01T00:00:00Z",
            "planned_etd": "2026-06-03T00:00:00Z",
            "speed_kts": 14.0,
            "distance_nm": 1344.0,
            "eca_nm": 200.0,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert float(data["speed_kts"]) == pytest.approx(14.0)
    assert float(data["distance_nm"]) == pytest.approx(1344.0)
    assert float(data["eca_nm"]) == pytest.approx(200.0)
    assert data["port_days"] == pytest.approx(2.0, abs=1e-6)
    # sea_days: 1344 / (14 * 24) = 4.0
    assert data["sea_days"] == pytest.approx(4.0, abs=1e-4)


@pytest.mark.asyncio
async def test_api_patch_itinerary_line_m2_fields(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    voyage_id = await _create_voyage(client, str(vessel.id))

    create_res = await client.post(
        f"/api/v1/voyages/{voyage_id}/itinerary",
        json={
            "port_ref": str(port.id),
            "port_function": "Load",
            "planned_eta": "2026-06-01T00:00:00Z",
            "planned_etd": "2026-06-03T00:00:00Z",
        },
    )
    assert create_res.status_code == 201
    line_id = create_res.json()["id"]
    assert create_res.json()["sea_days"] is None

    patch_res = await client.patch(
        f"/api/v1/voyages/{voyage_id}/itinerary/{line_id}",
        json={"speed_kts": 12.0, "distance_nm": 576.0},
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert float(data["speed_kts"]) == pytest.approx(12.0)
    # sea_days recalculated: 576 / (12 * 24) = 2.0
    assert data["sea_days"] == pytest.approx(2.0, abs=1e-4)


@pytest.mark.asyncio
async def test_api_voyage_itinerary_lines_embedded(
    client: AsyncClient, session: AsyncSession
) -> None:
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add(vessel)
    session.add(port)
    await session.commit()

    voyage_id = await _create_voyage(client, str(vessel.id))

    await client.post(
        f"/api/v1/voyages/{voyage_id}/itinerary",
        json={
            "port_ref": str(port.id),
            "port_function": "Ballast",
            "planned_eta": "2026-06-01T00:00:00Z",
            "planned_etd": "2026-06-03T12:00:00Z",
            "speed_kts": 10.0,
            "distance_nm": 480.0,
        },
    )

    res = await client.get(f"/api/v1/voyages/{voyage_id}")
    assert res.status_code == 200
    lines = res.json()["itinerary_lines"]
    assert len(lines) == 1
    line = lines[0]
    assert "port_days" in line
    assert "sea_days" in line
    assert line["port_days"] == pytest.approx(2.5, abs=1e-4)
    # 480nm / (10kts * 24h) = 2.0 sea days
    assert line["sea_days"] == pytest.approx(2.0, abs=1e-4)
