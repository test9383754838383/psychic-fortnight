import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.modules.voyage_spine.services.voyage_service import VoyageService
from src.modules.voyage_spine.models.itinerary_line import ItineraryLine
from tests.modules.master_data.conftest import VesselFactory, PortFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


@pytest.mark.asyncio
async def test_itinerary_ordering_insertions(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port1 = PortFactory.build(status="Active")
    port2 = PortFactory.build(status="Active")
    port3 = PortFactory.build(status="Active")
    session.add_all([vessel, port1, port2, port3])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # 1. Insert first line
    line1 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port1.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(days=1),
            "sequence_no": None,
        },
    )
    assert line1.sequence_no == 0

    # 2. Insert second line at end
    line2 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port2.id,
            "port_function": "Discharge",
            "planned_eta": datetime.now(timezone.utc) + timedelta(days=2),
            "planned_etd": datetime.now(timezone.utc) + timedelta(days=3),
            "sequence_no": None,
        },
    )
    assert line2.sequence_no == 1

    # 3. Insert mid (at sequence_no = 1)
    line3 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port3.id,
            "port_function": "Bunker",
            "planned_eta": datetime.now(timezone.utc) + timedelta(days=1, hours=12),
            "planned_etd": datetime.now(timezone.utc) + timedelta(days=1, hours=18),
            "sequence_no": 1,
        },
    )
    assert line3.sequence_no == 1

    # Refresh voyage and check ordering list renumbered
    await session.refresh(voyage)
    assert len(voyage.itinerary_lines) == 3
    assert voyage.itinerary_lines[0].id == line1.id
    assert voyage.itinerary_lines[0].sequence_no == 0
    assert voyage.itinerary_lines[1].id == line3.id
    assert voyage.itinerary_lines[1].sequence_no == 1
    assert voyage.itinerary_lines[2].id == line2.id
    assert voyage.itinerary_lines[2].sequence_no == 2


@pytest.mark.asyncio
async def test_itinerary_ordering_reorder(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Insert three lines
    l0 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )
    l1 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )
    l2 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )

    # Move l0 to sequence_no = 2
    await service.update_itinerary_line(voyage.id, l0.id, {"sequence_no": 2})

    await session.refresh(voyage)
    # New order: l1 (0), l2 (1), l0 (2)
    assert voyage.itinerary_lines[0].id == l1.id
    assert voyage.itinerary_lines[0].sequence_no == 0
    assert voyage.itinerary_lines[1].id == l2.id
    assert voyage.itinerary_lines[1].sequence_no == 1
    assert voyage.itinerary_lines[2].id == l0.id
    assert voyage.itinerary_lines[2].sequence_no == 2


@pytest.mark.asyncio
async def test_itinerary_ordering_delete_renumber(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(status="Active")
    session.add_all([vessel, port])
    await session.commit()

    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()

    service = VoyageService(session)

    # Insert three lines
    l0 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )
    l1 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )
    l2 = await service.insert_itinerary_line(
        voyage.id,
        {
            "port_ref": port.id,
            "port_function": "Load",
            "planned_eta": datetime.now(timezone.utc),
            "planned_etd": datetime.now(timezone.utc) + timedelta(hours=1),
        },
    )

    # Delete the middle line
    await service.delete_itinerary_line(voyage.id, l1.id)

    await session.refresh(voyage)
    # Remaining: l0 (0), l2 (1)
    assert len(voyage.itinerary_lines) == 2
    assert voyage.itinerary_lines[0].id == l0.id
    assert voyage.itinerary_lines[0].sequence_no == 0
    assert voyage.itinerary_lines[1].id == l2.id
    assert voyage.itinerary_lines[1].sequence_no == 1


@pytest.mark.asyncio
async def test_itinerary_cascade_delete(session: AsyncSession):
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

    # Delete voyage
    await session.delete(voyage)
    await session.commit()

    # Verify line is deleted automatically (cascade delete)
    res = await session.execute(
        select(ItineraryLine).where(ItineraryLine.id == line.id)
    )
    assert res.scalar_one_or_none() is None
