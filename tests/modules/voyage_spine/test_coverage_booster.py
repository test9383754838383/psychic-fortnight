import pytest
import uuid
from datetime import datetime, timedelta, timezone, date
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.exceptions import (
    MissingMasterDataReferenceError,
    ItineraryLineNotFoundError,
    VoyageNotFoundError,
    InvalidPortFunctionError,
    ItineraryLineCapExceededError,
    VoyageSpineError,
)
from src.modules.voyage_spine.models.voyage import VoyageStatus
from tests.modules.master_data.conftest import (
    VesselFactory,
    PortFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_validate_missing_charterer(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-BOOST-01",
        "vessel_ref": vessel.id,
        "charterer_ref": uuid.uuid4(),
        "commencing_datetime": datetime.now(timezone.utc),
    }

    with pytest.raises(MissingMasterDataReferenceError) as exc_info:
        await service.create(data)
    assert "charterer_ref" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_update_voyage_previous_ref_not_found(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    with pytest.raises(MissingMasterDataReferenceError):
        await service.update(voyage.id, {"previous_voyage_ref": uuid.uuid4()})


@pytest.mark.asyncio
async def test_list_voyages_filtering_comprehensive(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    charterer = CounterpartyFactory.build(status="Active")
    role = CounterpartyRoleFactory.build(counterparty=charterer, role="Charterer")
    session.add_all([vessel, charterer, role])
    await session.commit()

    t_commence = datetime.now(timezone.utc)
    v1 = VoyageFactory.build(
        vessel_ref=vessel.id,
        status=VoyageStatus.SCHEDULED.value,
        charterer_ref=charterer.id,
        commencing_datetime=t_commence,
    )
    session.add(v1)
    await session.commit()

    service = VoyageService(session)

    # Filter with all parameters
    res = await service.list(
        vessel_ref=vessel.id,
        status="Scheduled",
        charterer_ref=charterer.id,
        commencing_start=t_commence - timedelta(days=1),
        commencing_end=t_commence + timedelta(days=1),
    )
    assert len(res) == 1


@pytest.mark.asyncio
async def test_voyage_service_unused_exceptions(session: AsyncSession):
    # Cover the domain exception direct instantiations
    e = ItineraryLineNotFoundError("abc")
    assert e.status_code == 404

    e2 = VoyageNotFoundError("abc")
    assert e2.status_code == 404


@pytest.mark.asyncio
async def test_update_terms_individually(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    updated = await service.update(
        voyage.id,
        {
            "terms": {
                "charterer_name": "MSC",
                "cp_type": "CVC",
                "cp_date": date.today(),
                "cp_document_ref": "REF-123",
            }
        },
    )
    assert updated.terms_charterer_name == "MSC"
    assert updated.terms_cp_type == "CVC"
    assert updated.terms_cp_date == date.today()
    assert updated.terms_cp_document_ref == "REF-123"


@pytest.mark.asyncio
async def test_expected_completing_datetime_manual_override_true_empty(
    session: AsyncSession,
):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    # Manual override true, no itinerary lines
    voyage = VoyageFactory.build(
        vessel_ref=vessel.id,
        expected_completing_manual_override=True,
        expected_completing_datetime=None,
    )
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    updated = await service.update(voyage.id, {"voyage_no": "VOY-MOD"})
    assert updated.expected_completing_datetime is None


@pytest.mark.asyncio
async def test_expected_completing_datetime_manual_override_false_empty(
    session: AsyncSession,
):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    # Manual override False, no itinerary lines
    voyage = VoyageFactory.build(
        vessel_ref=vessel.id,
        expected_completing_manual_override=False,
        expected_completing_datetime=datetime.now(timezone.utc),
    )
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    updated = await service.update(voyage.id, {"voyage_no": "VOY-MOD"})
    assert updated.expected_completing_datetime is None


@pytest.mark.asyncio
async def test_voyage_status_transition_cancelled(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    # Scheduled -> Cancelled
    voyage1 = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.SCHEDULED.value
    )
    session.add(voyage1)
    await session.commit()

    service = VoyageService(session)
    voyage1 = await service.transition_status(voyage1.id, VoyageStatus.CANCELLED.value)
    assert voyage1.status == VoyageStatus.CANCELLED.value
    assert voyage1.cancelled_at is not None

    # Commenced -> Cancelled
    voyage2 = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.COMMENCED.value
    )
    session.add(voyage2)
    await session.commit()

    voyage2 = await service.transition_status(voyage2.id, VoyageStatus.CANCELLED.value)
    assert voyage2.status == VoyageStatus.CANCELLED.value
    assert voyage2.cancelled_at is not None


@pytest.mark.asyncio
async def test_insert_itinerary_line_cap_exceeded(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Mock itinerary lines length to 50
    for i in range(50):
        await service.insert_itinerary_line(
            voyage.id,
            {
                "port_ref": port.id,
                "port_function": "Load",
                "planned_eta": datetime.now(timezone.utc),
                "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )

    with pytest.raises(ItineraryLineCapExceededError):
        await service.insert_itinerary_line(
            voyage.id,
            {
                "port_ref": port.id,
                "port_function": "Load",
                "planned_eta": datetime.now(timezone.utc),
                "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )


@pytest.mark.asyncio
async def test_insert_itinerary_line_missing_port_ref(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    with pytest.raises(VoyageSpineError) as exc_info:
        await service.insert_itinerary_line(
            voyage.id,
            {
                "port_function": "Load",
                "planned_eta": datetime.now(timezone.utc),
                "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_insert_itinerary_line_inactive_port(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Inactive")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    with pytest.raises(MissingMasterDataReferenceError):
        await service.insert_itinerary_line(
            voyage.id,
            {
                "port_ref": port.id,
                "port_function": "Load",
                "planned_eta": datetime.now(timezone.utc),
                "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )


@pytest.mark.asyncio
async def test_insert_itinerary_line_eta_etd_validation(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    # planned_etd < planned_eta
    with pytest.raises(VoyageSpineError) as exc_info:
        await service.insert_itinerary_line(
            voyage.id,
            {
                "port_ref": port.id,
                "port_function": "Load",
                "planned_eta": datetime.now(timezone.utc) + timedelta(hours=5),
                "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_update_itinerary_line_inactive_port(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    inactive_port = PortFactory.build(status="Inactive")
    session.add_all([vessel, port, inactive_port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    line = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )

    with pytest.raises(MissingMasterDataReferenceError):
        await service.update_itinerary_line(
            voyage.id,
            line.id,
            {
                "port_ref": inactive_port.id,
            },
        )


@pytest.mark.asyncio
async def test_update_itinerary_line_invalid_port_function(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    line = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )

    with pytest.raises(InvalidPortFunctionError):
        await service.update_itinerary_line(
            voyage.id,
            line.id,
            {
                "port_function": "InvalidFunction",
            },
        )


@pytest.mark.asyncio
async def test_update_itinerary_line_eta_etd_validation(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    line = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )

    with pytest.raises(VoyageSpineError):
        await service.update_itinerary_line(
            voyage.id,
            line.id,
            {
                "planned_eta": datetime.now(timezone.utc) + timedelta(days=2),
                "planned_etd": datetime.now(timezone.utc) + timedelta(days=1),
            },
        )


@pytest.mark.asyncio
async def test_update_itinerary_line_not_found(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    with pytest.raises(ItineraryLineNotFoundError):
        await service.update_itinerary_line(
            voyage.id, uuid.uuid4(), {"port_function": "Load"}
        )


@pytest.mark.asyncio
async def test_delete_itinerary_line_not_found(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    with pytest.raises(ItineraryLineNotFoundError):
        await service.delete_itinerary_line(voyage.id, uuid.uuid4())


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
async def test_update_itinerary_line_sequence_bounds(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    l0 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )
    await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )

    # Move l0 out of bounds low (< 0)
    await service.update_itinerary_line(voyage.id, l0.id, {"sequence_no": -5})
    await session.refresh(voyage)
    assert voyage.itinerary_lines[0].id == l0.id

    # Move l0 out of bounds high (>= len)
    await service.update_itinerary_line(voyage.id, l0.id, {"sequence_no": 100})
    await session.refresh(voyage)
    assert voyage.itinerary_lines[1].id == l0.id


@pytest.mark.asyncio
async def test_insert_itinerary_line_missing_port_ref_exist(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    with pytest.raises(MissingMasterDataReferenceError):
        await service.insert_itinerary_line(
            voyage.id,
            {
                "port_ref": uuid.uuid4(),
                "port_function": "Load",
                "planned_eta": datetime.now(timezone.utc),
                "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )


@pytest.mark.asyncio
async def test_update_voyage_validate_cross_module_refs(session: AsyncSession):
    vessel1 = VesselFactory.build(status="Active")
    vessel2 = VesselFactory.build(status="Active")
    charterer = CounterpartyFactory.build(status="Active")
    role = CounterpartyRoleFactory.build(counterparty=charterer, role="Charterer")
    session.add_all([vessel1, vessel2, charterer, role])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel1.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # 1. Happy path update vessel and charterer
    await service.update(
        voyage.id,
        {
            "vessel_ref": vessel2.id,
            "charterer_ref": charterer.id,
        },
    )

    # 2. Unhappy path update vessel
    with pytest.raises(MissingMasterDataReferenceError):
        await service.update(voyage.id, {"vessel_ref": uuid.uuid4()})

    # 3. Unhappy path update charterer
    with pytest.raises(MissingMasterDataReferenceError):
        await service.update(voyage.id, {"charterer_ref": uuid.uuid4()})
