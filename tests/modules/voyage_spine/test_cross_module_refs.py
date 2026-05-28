import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.exceptions import MissingMasterDataReferenceError
from tests.modules.master_data.conftest import (
    VesselFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)


@pytest.mark.asyncio
async def test_voyage_validation_missing_vessel(session: AsyncSession):
    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-ERR-01",
        "vessel_ref": uuid.uuid4(),
        "commencing_datetime": datetime.now(timezone.utc),
    }

    with pytest.raises(MissingMasterDataReferenceError) as exc_info:
        await service.create(data)
    assert "vessel_ref" in str(exc_info.value.message)
    assert "does not exist" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_voyage_validation_inactive_vessel(session: AsyncSession):
    vessel = VesselFactory.build(status="Inactive")
    session.add(vessel)
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-ERR-02",
        "vessel_ref": vessel.id,
        "commencing_datetime": datetime.now(timezone.utc),
    }

    with pytest.raises(MissingMasterDataReferenceError) as exc_info:
        await service.create(data)
    assert "vessel_ref" in str(exc_info.value.message)
    assert "is Inactive" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_voyage_validation_inactive_charterer(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    charterer = CounterpartyFactory.build(status="Inactive")
    session.add_all([vessel, charterer])
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-ERR-03",
        "vessel_ref": vessel.id,
        "charterer_ref": charterer.id,
        "commencing_datetime": datetime.now(timezone.utc),
    }

    with pytest.raises(MissingMasterDataReferenceError) as exc_info:
        await service.create(data)
    assert "charterer_ref" in str(exc_info.value.message)
    assert "is Inactive" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_voyage_validation_charterer_missing_role(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    # Counterparty has Owner role, not Charterer
    charterer = CounterpartyFactory.build(status="Active")
    role = CounterpartyRoleFactory.build(counterparty=charterer, role="Owner")
    session.add_all([vessel, charterer, role])
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-ERR-04",
        "vessel_ref": vessel.id,
        "charterer_ref": charterer.id,
        "commencing_datetime": datetime.now(timezone.utc),
    }

    with pytest.raises(MissingMasterDataReferenceError) as exc_info:
        await service.create(data)
    assert "charterer_ref" in str(exc_info.value.message)
    assert "does not have the Charterer role" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_voyage_validation_charterer_with_role_happy(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    charterer = CounterpartyFactory.build(status="Active")
    role = CounterpartyRoleFactory.build(counterparty=charterer, role="Charterer")
    session.add_all([vessel, charterer, role])
    await session.commit()

    service = VoyageService(session)
    data = {
        "voyage_no": "VOY-OK-01",
        "vessel_ref": vessel.id,
        "charterer_ref": charterer.id,
        "commencing_datetime": datetime.now(timezone.utc),
    }

    voyage = await service.create(data)
    assert voyage.id is not None
