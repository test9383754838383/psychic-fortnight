import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.services.voyage_service import VoyageService
from tests.modules.master_data.conftest import VesselFactory, PortFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_expected_completing_datetime_recomputes(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # 1. Initially None
    assert voyage.expected_completing_datetime is None

    # 2. Add line 1
    t1 = datetime.now(timezone.utc) + timedelta(days=2)
    line1 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": t1,
        },
    )
    await session.refresh(voyage)
    assert voyage.expected_completing_datetime == t1

    # 3. Add line 2 with later ETD
    t2 = datetime.now(timezone.utc) + timedelta(days=5)
    line2 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Discharge",
            "planned_eta": datetime.now(timezone.utc) + timedelta(days=4),
            "planned_etd": t2,
        },
    )
    await session.refresh(voyage)
    assert voyage.expected_completing_datetime == t2

    # 4. Update line 2 to earlier ETD (e.g. 1 day out)
    t3 = datetime.now(timezone.utc) + timedelta(days=1)
    await service.update_itinerary_line(
        voyage.id,
        line2.id,
        {
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": t3,
        },
    )
    await session.refresh(voyage)
    # Expected completing should now be t1 (since t1 = 2 days, which is now max(t1, t3))
    assert voyage.expected_completing_datetime == t1

    # 5. Delete line 1
    await service.delete_itinerary_line(voyage.id, line1.id)
    await session.refresh(voyage)
    # Expected completing should be t3
    assert voyage.expected_completing_datetime == t3


@pytest.mark.asyncio
async def test_expected_completing_datetime_manual_override(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id, expected_completing_manual_override=True
    )
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Set manual value
    manual_time = datetime.now(timezone.utc) + timedelta(days=10)
    await service.update(voyage.id, {"expected_completing_datetime": manual_time})
    await session.refresh(voyage)
    assert voyage.expected_completing_datetime == manual_time

    # Add itinerary line with different ETD
    t1 = datetime.now(timezone.utc) + timedelta(days=2)
    await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": t1,
        },
    )

    await session.refresh(voyage)
    # Expecting the manual complete time to hold (not get overridden by t1)
    assert voyage.expected_completing_datetime == manual_time
