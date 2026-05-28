import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.exceptions import (
    DuplicateVoyageNumberError,
    IllegalVoyageStatusTransitionError,
    MissingMasterDataReferenceError,
)
from src.modules.voyage_spine.models.voyage import VoyageStatus
from tests.modules.master_data.conftest import VesselFactory
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
