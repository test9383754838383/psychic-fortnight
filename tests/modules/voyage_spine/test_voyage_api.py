import pytest
import uuid
from datetime import datetime, timedelta, timezone, date
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.models.voyage import VoyageStatus
from tests.modules.master_data.conftest import (
    VesselFactory,
    PortFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_api_create_voyage_happy_path(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    payload = {
        "voyage_no": "VOY-API-101",
        "vessel_ref": str(vessel.id),
        "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        "terms": {
            "charterer_name": "Cargill",
            "cp_type": "VC",
        },
    }

    res = await client.post("/api/v1/voyages", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["voyage_no"] == "VOY-API-101"
    assert data["status"] == "Scheduled"
    assert data["terms"]["charterer_name"] == "Cargill"
    assert data["terms"]["cp_type"] == "VC"


@pytest.mark.asyncio
async def test_api_create_voyage_invalid_cp_type(
    client: AsyncClient, session: AsyncSession
):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    payload = {
        "voyage_no": "VOY-API-102",
        "vessel_ref": str(vessel.id),
        "commencing_datetime": datetime.now(timezone.utc).isoformat(),
        "terms": {
            "charterer_name": "Cargill",
            "cp_type": "INVALID",
        },
    }

    res = await client.post("/api/v1/voyages", json=payload)
    assert res.status_code == 422
    assert res.json()["code"] == "INVALID_CP_TYPE"


@pytest.mark.asyncio
async def test_api_list_voyages(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id, voyage_no="LIST-VOY")
    session.add(voyage)
    await session.commit()

    res = await client.get("/api/v1/voyages")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any(v["voyage_no"] == "LIST-VOY" for v in data)


@pytest.mark.asyncio
async def test_api_get_voyage_not_found(client: AsyncClient):
    res = await client.get(f"/api/v1/voyages/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["code"] == "VOYAGE_NOT_FOUND"


@pytest.mark.asyncio
async def test_api_transition_status(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.SCHEDULED.value
    )
    session.add(voyage)
    await session.commit()

    # Scheduled -> Commenced
    res = await client.post(
        f"/api/v1/voyages/{voyage.id}/transition", json={"to": "Commenced"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Commenced"


@pytest.mark.asyncio
async def test_api_itinerary_crud(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    # 1. Post itinerary line
    line_payload = {
        "port_ref": str(port.id),
        "port_function": "Load",
        "planned_eta": datetime.now(timezone.utc).isoformat(),
        "planned_etd": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    }
    res = await client.post(f"/api/v1/voyages/{voyage.id}/itinerary", json=line_payload)
    assert res.status_code == 201
    line_id = res.json()["id"]

    # 2. Get itinerary lines
    res = await client.get(f"/api/v1/voyages/{voyage.id}/itinerary")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 3. Patch itinerary line
    res = await client.patch(
        f"/api/v1/voyages/{voyage.id}/itinerary/{line_id}",
        json={"port_function": "Discharge"},
    )
    assert res.status_code == 200
    assert res.json()["port_function"] == "Discharge"

    # 4. Delete itinerary line
    res = await client.delete(f"/api/v1/voyages/{voyage.id}/itinerary/{line_id}")
    assert res.status_code == 204


@pytest.mark.asyncio
async def test_api_list_voyages_pagination(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    # Create 60 voyages
    for i in range(60):
        voyage = VoyageFactory.build(
            voyage_no=f"VOY-API-PAG-{i:03d}",
            vessel_ref=vessel.id,
            commencing_datetime=datetime.now(timezone.utc),
        )
        session.add(voyage)
    await session.commit()

    # Default limit is 50
    res = await client.get("/api/v1/voyages")
    assert res.status_code == 200
    assert len(res.json()) == 50

    # Custom limit 10
    res = await client.get("/api/v1/voyages", params={"limit": 10})
    assert res.status_code == 200
    assert len(res.json()) == 10

    # Max limit clamped to 500 (passing 1000 retrieves all 60)
    res = await client.get("/api/v1/voyages", params={"limit": 1000})
    assert res.status_code == 200
    assert len(res.json()) == 60

    # Offset 55
    res = await client.get("/api/v1/voyages", params={"limit": 10, "offset": 55})
    assert res.status_code == 200
    assert len(res.json()) == 5


@pytest.mark.asyncio
async def test_api_list_voyages_filtering(client: AsyncClient, session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.SCHEDULED.value
    )
    session.add(voyage)
    await session.commit()

    # Query with filters
    res = await client.get(
        "/api/v1/voyages",
        params={
            "vessel_ref": str(vessel.id),
            "status": "Scheduled",
            "commencing_start": (
                datetime.now(timezone.utc) - timedelta(days=1)
            ).isoformat(),
            "commencing_end": (
                datetime.now(timezone.utc) + timedelta(days=1)
            ).isoformat(),
        },
    )
    assert res.status_code == 200
    assert len(res.json()) >= 1


@pytest.mark.asyncio
async def test_api_update_voyage_comprehensive(
    client: AsyncClient, session: AsyncSession
):
    vessel1 = VesselFactory.build(status="Active")
    vessel2 = VesselFactory.build(status="Active")
    session.add_all([vessel1, vessel2])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel1.id)
    session.add(voyage)
    await session.commit()

    payload = {
        "voyage_no": "VOY-PATCHED",
        "vessel_ref": str(vessel2.id),
        "commencing_datetime": (
            datetime.now(timezone.utc) + timedelta(days=1)
        ).isoformat(),
        "expected_completing_manual_override": True,
        "expected_completing_datetime": (
            datetime.now(timezone.utc) + timedelta(days=5)
        ).isoformat(),
        "terms": {"charterer_name": "New Charterer"},
    }

    res = await client.patch(f"/api/v1/voyages/{voyage.id}", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["voyage_no"] == "VOY-PATCHED"
    assert data["vessel_ref"] == str(vessel2.id)
    assert data["expected_completing_manual_override"] is True
    assert data["terms"]["charterer_name"] == "New Charterer"


@pytest.mark.asyncio
async def test_api_update_voyage_all_fields_comprehensive(
    client: AsyncClient, session: AsyncSession
):
    vessel1 = VesselFactory.build(status="Active")
    vessel2 = VesselFactory.build(status="Active")
    charterer = CounterpartyFactory.build(status="Active")
    role = CounterpartyRoleFactory.build(counterparty=charterer, role="Charterer")
    port = PortFactory.build(status="Active")
    session.add_all([vessel1, vessel2, charterer, role, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel1.id)
    session.add(voyage)
    await session.commit()

    # Post an itinerary line
    line_payload = {
        "port_ref": str(port.id),
        "port_function": "Load",
        "planned_eta": datetime.now(timezone.utc).isoformat(),
        "planned_etd": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    }
    res_line = await client.post(
        f"/api/v1/voyages/{voyage.id}/itinerary", json=line_payload
    )
    assert res_line.status_code == 201
    line_id = res_line.json()["id"]

    # 1. Update all optional fields of Voyage
    payload = {
        "voyage_no": "VOY-ALL-FIELDS",
        "vessel_ref": str(vessel2.id),
        "commencing_datetime": (
            datetime.now(timezone.utc) + timedelta(days=1)
        ).isoformat(),
        "charterer_ref": str(charterer.id),
        "previous_voyage_ref": None,
        "voyage_instructions": "New Instructions",
        "ops_notes": "New Ops Notes",
        "expected_completing_manual_override": True,
        "expected_completing_datetime": (
            datetime.now(timezone.utc) + timedelta(days=5)
        ).isoformat(),
        "terms": {
            "charterer_name": "CMA CGM",
            "cp_type": "TC",
            "cp_date": date.today().isoformat(),
            "cp_document_ref": "CP-DOC-777",
        },
    }

    res = await client.patch(f"/api/v1/voyages/{voyage.id}", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["voyage_no"] == "VOY-ALL-FIELDS"
    assert data["vessel_ref"] == str(vessel2.id)
    assert data["charterer_ref"] == str(charterer.id)
    assert data["voyage_instructions"] == "New Instructions"
    assert data["ops_notes"] == "New Ops Notes"
    assert data["terms"]["charterer_name"] == "CMA CGM"

    # 2. Update all optional fields of ItineraryLine
    line_payload_update = {
        "port_ref": str(port.id),
        "port_function": "Discharge",
        "planned_eta": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "planned_etd": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "sequence_no": 0,
    }
    res_line_up = await client.patch(
        f"/api/v1/voyages/{voyage.id}/itinerary/{line_id}", json=line_payload_update
    )
    assert res_line_up.status_code == 200
    assert res_line_up.json()["port_function"] == "Discharge"
    assert res_line_up.json()["sequence_no"] == 0
