import pytest
import uuid
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.exceptions import (
    DuplicateVoyageNumberError,
    IllegalVoyageStatusTransitionError,
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
async def test_create_voyage_happy_path(session: AsyncSession):
    # Setup dependencies
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-1001",
        "vessel_ref": vessel.id,
        "commencing_datetime": datetime.now(timezone.utc),
        "terms": {
            "charterer_name": "Maersk",
            "cp_type": "CVC",
        },
    }

    voyage = await service.create(data)
    assert voyage.id is not None
    assert voyage.voyage_no == "VOY-1001"
    assert voyage.vessel_ref == vessel.id
    assert voyage.terms_charterer_name == "Maersk"
    assert voyage.terms_cp_type == "CVC"
    assert voyage.status == VoyageStatus.SCHEDULED.value


@pytest.mark.asyncio
async def test_create_voyage_duplicate_number(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(voyage_no="DUP-001", vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "DUP-001",
        "vessel_ref": vessel.id,
        "commencing_datetime": datetime.now(timezone.utc),
    }

    with pytest.raises(DuplicateVoyageNumberError):
        await service.create(data)


@pytest.mark.asyncio
async def test_create_voyage_missing_previous_ref(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-002",
        "vessel_ref": vessel.id,
        "commencing_datetime": datetime.now(timezone.utc),
        "previous_voyage_ref": uuid.uuid4(),
    }

    with pytest.raises(MissingMasterDataReferenceError) as exc_info:
        await service.create(data)
    assert "previous_voyage_ref" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_update_voyage_comprehensive(session: AsyncSession):
    vessel1 = VesselFactory.build(status="Active")
    vessel2 = VesselFactory.build(status="Active")
    session.add_all([vessel1, vessel2])
    await session.commit()

    voyage = VoyageFactory.build(voyage_no="UPD-001", vessel_ref=vessel1.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)
    updated = await service.update(
        voyage.id,
        {
            "voyage_no": "UPD-002",
            "vessel_ref": vessel2.id,
            "terms": {
                "charterer_name": "MSC",
                "cp_type": "TC",
            },
        },
    )

    assert updated.voyage_no == "UPD-002"
    assert updated.vessel_ref == vessel2.id
    assert updated.terms_charterer_name == "MSC"
    assert updated.terms_cp_type == "TC"


@pytest.mark.asyncio
async def test_voyage_status_transitions(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.SCHEDULED.value
    )
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Scheduled -> Commenced
    voyage = await service.transition_status(voyage.id, VoyageStatus.COMMENCED.value)
    assert voyage.status == VoyageStatus.COMMENCED.value
    assert voyage.commenced_at is not None

    # Commenced -> Completed
    voyage = await service.transition_status(voyage.id, VoyageStatus.COMPLETED.value)
    assert voyage.status == VoyageStatus.COMPLETED.value
    assert voyage.completed_at is not None

    # Completed -> Closed
    voyage = await service.transition_status(voyage.id, VoyageStatus.CLOSED.value)
    assert voyage.status == VoyageStatus.CLOSED.value
    assert voyage.closed_at is not None


@pytest.mark.asyncio
async def test_voyage_status_illegal_transition(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, status=VoyageStatus.SCHEDULED.value
    )
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Scheduled -> Completed is illegal
    with pytest.raises(IllegalVoyageStatusTransitionError):
        await service.transition_status(voyage.id, VoyageStatus.COMPLETED.value)


@pytest.mark.asyncio
async def test_voyage_service_list_pagination(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    # Create 60 voyages
    for i in range(60):
        voyage = VoyageFactory.build(
            voyage_no=f"VOY-PAG-{i:03d}",
            vessel_ref=vessel.id,
            commencing_datetime=datetime.now(timezone.utc),
        )
        session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Test default limit (50)
    res_default = await service.list()
    assert len(res_default) == 50

    # Test custom limit (10)
    res_custom = await service.list(limit=10)
    assert len(res_custom) == 10

    # Test max limit (500)
    res_max = await service.list(limit=1000)
    assert len(res_max) == 60

    # Test offset
    res_offset = await service.list(limit=10, offset=55)
    assert len(res_offset) == 5


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
async def test_voyage_service_exceptions_behavioral(session: AsyncSession):
    service = VoyageService(session)
    non_existent_id = uuid.uuid4()

    # 1. VoyageNotFoundError behavioral trigger
    with pytest.raises(VoyageNotFoundError) as exc_info1:
        await service.get(non_existent_id)
    assert exc_info1.value.status_code == 404
    assert str(non_existent_id) in exc_info1.value.message

    # 2. ItineraryLineNotFoundError behavioral trigger
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    with pytest.raises(ItineraryLineNotFoundError) as exc_info2:
        await service.update_itinerary_line(
            voyage.id, non_existent_id, {"port_function": "Load"}
        )
    assert exc_info2.value.status_code == 404
    assert str(non_existent_id) in exc_info2.value.message


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
