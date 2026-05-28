import pytest
from datetime import date, datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import event

from src.modules.voyage_spine.services.schedule_query import ScheduleQueryService
from src.modules.voyage_spine.models.voyage import VoyageStatus
from src.modules.voyage_spine.exceptions import ScheduleWindowTooLargeError
from tests.modules.master_data.conftest import (
    VesselFactory,
    PortFactory,
)
from tests.modules.voyage_spine.conftest import (
    VoyageFactory,
    ItineraryLineFactory,
)


@pytest.mark.asyncio
async def test_get_schedule_overlap_cases(session: AsyncSession):
    # Setup: 1 Vessel, several Voyages with different overlap patterns
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    # Window: Day 10 to Day 20
    date_from = date(2026, 6, 10)
    date_to = date(2026, 6, 20)

    # 1. Entirely inside: Day 12 to Day 18
    v1 = VoyageFactory.build(
        vessel_ref=vessel.id,
        commencing_datetime=datetime(2026, 6, 12, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 18, tzinfo=timezone.utc),
        voyage_no="V1-INSIDE",
    )
    # 2. Spanning: Day 5 to Day 25
    v2 = VoyageFactory.build(
        vessel_ref=vessel.id,
        commencing_datetime=datetime(2026, 6, 5, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 25, tzinfo=timezone.utc),
        voyage_no="V2-SPAN",
    )
    # 3. Touching Start: Day 5 to Day 10
    v3 = VoyageFactory.build(
        vessel_ref=vessel.id,
        commencing_datetime=datetime(2026, 6, 5, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(
            2026, 6, 10, 12, 0, 0, tzinfo=timezone.utc
        ),
        voyage_no="V3-START",
    )
    # 4. Touching End: Day 20 to Day 25
    v4 = VoyageFactory.build(
        vessel_ref=vessel.id,
        commencing_datetime=datetime(2026, 6, 20, 12, 0, 0, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 25, tzinfo=timezone.utc),
        voyage_no="V4-END",
    )
    # 5. Outside Before: Day 1 to Day 5
    v5 = VoyageFactory.build(
        vessel_ref=vessel.id,
        commencing_datetime=datetime(2026, 6, 1, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 5, tzinfo=timezone.utc),
        voyage_no="V5-OUT-BEFORE",
    )
    # 6. Outside After: Day 25 to Day 30
    v6 = VoyageFactory.build(
        vessel_ref=vessel.id,
        commencing_datetime=datetime(2026, 6, 25, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 30, tzinfo=timezone.utc),
        voyage_no="V6-OUT-AFTER",
    )

    session.add_all([v1, v2, v3, v4, v5, v6])
    await session.commit()

    service = ScheduleQueryService(session)
    response = await service.get_schedule(date_from, date_to)

    assert len(response.vessels) == 1
    vessel_item = response.vessels[0]
    assert vessel_item.vessel_id == vessel.id

    voyage_nos = [v.voyage_no for v in vessel_item.voyages]
    assert "V1-INSIDE" in voyage_nos
    assert "V2-SPAN" in voyage_nos
    assert "V3-START" in voyage_nos
    assert "V4-END" in voyage_nos
    assert "V5-OUT-BEFORE" not in voyage_nos
    assert "V6-OUT-AFTER" not in voyage_nos


@pytest.mark.asyncio
async def test_get_schedule_filters(session: AsyncSession):
    v1 = VesselFactory.build(status="Active", name="A Vessel")
    v2 = VesselFactory.build(status="Active", name="B Vessel")
    session.add_all([v1, v2])
    await session.commit()

    date_from = date(2026, 6, 1)
    date_to = date(2026, 6, 30)

    voy1 = VoyageFactory.build(
        vessel_ref=v1.id,
        status=VoyageStatus.SCHEDULED.value,
        voyage_no="VOY-A-SCHED",
        commencing_datetime=datetime(2026, 6, 2, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 6, tzinfo=timezone.utc),
    )
    voy2 = VoyageFactory.build(
        vessel_ref=v1.id,
        status=VoyageStatus.COMMENCED.value,
        voyage_no="VOY-A-COMM",
        commencing_datetime=datetime(2026, 6, 2, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 6, tzinfo=timezone.utc),
    )
    voy3 = VoyageFactory.build(
        vessel_ref=v2.id,
        status=VoyageStatus.SCHEDULED.value,
        voyage_no="VOY-B-SCHED",
        commencing_datetime=datetime(2026, 6, 2, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 6, tzinfo=timezone.utc),
    )

    session.add_all([voy1, voy2, voy3])
    await session.commit()

    service = ScheduleQueryService(session)

    # Filter by vessel
    resp = await service.get_schedule(date_from, date_to, vessel_ids=[v1.id])
    assert len(resp.vessels) == 1
    assert resp.vessels[0].vessel_id == v1.id

    # Filter by status
    resp = await service.get_schedule(
        date_from, date_to, status=[VoyageStatus.COMMENCED.value]
    )
    assert len(resp.vessels) == 2
    v1_item = next(v for v in resp.vessels if v.vessel_id == v1.id)
    assert len(v1_item.voyages) == 1
    assert v1_item.voyages[0].voyage_no == "VOY-A-COMM"

    v2_item = next(v for v in resp.vessels if v.vessel_id == v2.id)
    assert len(v2_item.voyages) == 0

    # Filter by search
    resp = await service.get_schedule(date_from, date_to, search="VOY-B")
    v2_item = next(v for v in resp.vessels if v.vessel_id == v2.id)
    assert len(v2_item.voyages) == 1
    assert v2_item.voyages[0].voyage_no == "VOY-B-SCHED"


@pytest.mark.asyncio
async def test_get_schedule_active_vessels_only(session: AsyncSession):
    v_active = VesselFactory.build(status="Active", name="Active Vsl")
    v_inactive = VesselFactory.build(status="Inactive", name="Inactive Vsl")
    session.add_all([v_active, v_inactive])
    await session.commit()

    date_from = date(2026, 6, 1)
    date_to = date(2026, 6, 30)

    voy = VoyageFactory.build(
        vessel_ref=v_inactive.id,
        commencing_datetime=datetime(2026, 6, 2, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 6, tzinfo=timezone.utc),
    )
    session.add(voy)
    await session.commit()

    service = ScheduleQueryService(session)
    resp = await service.get_schedule(date_from, date_to)

    # Only active vessel should be in the response
    assert len(resp.vessels) == 1
    assert resp.vessels[0].vessel_id == v_active.id


@pytest.mark.asyncio
async def test_get_schedule_current_next_port_derivation(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port1 = PortFactory.build(unlocode="ABCDE")
    port2 = PortFactory.build(unlocode="FGHIJ")
    session.add_all([vessel, port1, port2])
    await session.commit()

    now = datetime.now(timezone.utc)
    date_from = now.date() - timedelta(days=10)
    date_to = now.date() + timedelta(days=10)

    # 1. Scheduled -> first port
    voy_sched = VoyageFactory.build(
        vessel_ref=vessel.id,
        status=VoyageStatus.SCHEDULED.value,
        commencing_datetime=now + timedelta(days=1),
        expected_completing_datetime=now + timedelta(days=5),
    )
    session.add(voy_sched)
    await session.flush()

    l1 = ItineraryLineFactory.build(
        voyage_id=voy_sched.id,
        port_ref=port1.id,
        sequence_no=0,
        planned_eta=now + timedelta(days=1),
        planned_etd=now + timedelta(days=2),
    )
    l2 = ItineraryLineFactory.build(
        voyage_id=voy_sched.id,
        port_ref=port2.id,
        sequence_no=1,
        planned_eta=now + timedelta(days=3),
        planned_etd=now + timedelta(days=4),
    )
    session.add_all([l1, l2])

    # 2. Commenced -> next un-passed port (ETD >= now)
    voy_comm = VoyageFactory.build(
        vessel_ref=vessel.id,
        status=VoyageStatus.COMMENCED.value,
        commencing_datetime=now - timedelta(days=5),
        expected_completing_datetime=now + timedelta(days=5),
    )
    session.add(voy_comm)
    await session.flush()

    # Port 1: passed (ETD in past)
    l3 = ItineraryLineFactory.build(
        voyage_id=voy_comm.id,
        port_ref=port1.id,
        sequence_no=0,
        planned_eta=now - timedelta(days=4),
        planned_etd=now - timedelta(days=3),
    )
    # Port 2: not passed (ETD in future)
    l4 = ItineraryLineFactory.build(
        voyage_id=voy_comm.id,
        port_ref=port2.id,
        sequence_no=1,
        planned_eta=now + timedelta(days=1),
        planned_etd=now + timedelta(days=2),
    )
    session.add_all([l3, l4])
    await session.commit()

    service = ScheduleQueryService(session)
    resp = await service.get_schedule(date_from, date_to)

    vessel_item = resp.vessels[0]

    vsched = next(v for v in vessel_item.voyages if v.voyage_id == voy_sched.id)
    assert vsched.current_next_port_code == "ABCDE"

    vcomm = next(v for v in vessel_item.voyages if v.voyage_id == voy_comm.id)
    assert vcomm.current_next_port_code == "FGHIJ"


@pytest.mark.asyncio
async def test_get_schedule_current_next_port_completed_and_past(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port = PortFactory.build(unlocode="PASTP")
    session.add_all([vessel, port])
    await session.commit()

    now = datetime.now(timezone.utc)
    date_from = now.date() - timedelta(days=10)
    date_to = now.date() + timedelta(days=10)

    # 1. Completed status
    voy_comp = VoyageFactory.build(
        vessel_ref=vessel.id,
        status="Completed",
        commencing_datetime=now - timedelta(days=5),
        expected_completing_datetime=now - timedelta(days=1),
    )
    session.add(voy_comp)
    await session.flush()
    l1 = ItineraryLineFactory.build(
        voyage_id=voy_comp.id, port_ref=port.id, sequence_no=0
    )
    session.add(l1)

    # 2. Commenced but all ports in past
    voy_past = VoyageFactory.build(
        vessel_ref=vessel.id,
        status=VoyageStatus.COMMENCED.value,
        commencing_datetime=now - timedelta(days=10),
        expected_completing_datetime=now + timedelta(days=5),
    )
    session.add(voy_past)
    await session.flush()
    l2 = ItineraryLineFactory.build(
        voyage_id=voy_past.id,
        port_ref=port.id,
        sequence_no=0,
        planned_eta=now - timedelta(days=9),
        planned_etd=now - timedelta(days=8),
    )
    session.add(l2)
    await session.commit()

    service = ScheduleQueryService(session)
    resp = await service.get_schedule(date_from, date_to)

    vessel_item = resp.vessels[0]
    vcomp = next(v for v in vessel_item.voyages if v.voyage_id == voy_comp.id)
    assert vcomp.current_next_port_code == "PASTP"

    vpast = next(v for v in vessel_item.voyages if v.voyage_id == voy_past.id)
    assert vpast.current_next_port_code == "PASTP"


@pytest.mark.asyncio
async def test_get_schedule_window_too_large(session: AsyncSession):
    service = ScheduleQueryService(session)
    date_from = date.today()
    date_to = date_from + timedelta(days=367)

    with pytest.raises(ScheduleWindowTooLargeError):
        await service.get_schedule(date_from, date_to)


@pytest.mark.asyncio
async def test_get_schedule_empty_result(session: AsyncSession):
    date_from = date(2026, 6, 1)
    date_to = date(2026, 6, 30)
    service = ScheduleQueryService(session)
    resp = await service.get_schedule(date_from, date_to)
    assert len(resp.vessels) == 0


@pytest.mark.asyncio
async def test_get_schedule_current_next_port_no_itinerary(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    session.add(vessel)
    await session.commit()

    date_from = date(2026, 6, 1)
    date_to = date(2026, 6, 30)

    voy = VoyageFactory.build(
        vessel_ref=vessel.id,
        status=VoyageStatus.SCHEDULED.value,
        commencing_datetime=datetime(2026, 6, 10, tzinfo=timezone.utc),
        expected_completing_datetime=datetime(2026, 6, 20, tzinfo=timezone.utc),
    )
    session.add(voy)
    await session.commit()

    service = ScheduleQueryService(session)
    resp = await service.get_schedule(date_from, date_to)

    assert resp.vessels[0].voyages[0].current_next_port_code is None


@pytest.mark.asyncio
async def test_get_schedule_no_n_plus_one(session: AsyncSession):
    # Create several vessels and voyages with itinerary lines
    vessels = [VesselFactory.build(status="Active") for _ in range(3)]
    port = PortFactory.build(status="Active")
    session.add_all(vessels + [port])
    await session.commit()

    for v in vessels:
        for i in range(2):
            voy = VoyageFactory.build(
                vessel_ref=v.id,
                commencing_datetime=datetime(2026, 6, 1, tzinfo=timezone.utc),
                expected_completing_datetime=datetime(2026, 6, 10, tzinfo=timezone.utc),
            )
            session.add(voy)
            await session.flush()
            for seq in range(2):
                line = ItineraryLineFactory.build(
                    voyage_id=voy.id, port_ref=port.id, sequence_no=seq
                )
                session.add(line)

    await session.commit()

    query_count = 0

    def before_execute(conn, clauseelement, multiparams, params, execution_options):
        nonlocal query_count
        query_count += 1

    # Need to listen on the underlying synchronous engine
    sync_engine = session.bind.sync_engine
    event.listen(sync_engine, "before_execute", before_execute)

    try:
        service = ScheduleQueryService(session)
        await service.get_schedule(date(2026, 6, 1), date(2026, 6, 30))
    finally:
        event.remove(sync_engine, "before_execute", before_execute)

    # Expected queries:
    # 1. Vessel list
    # 2. Voyage list
    # 3. Itinerary lines (selectinload)
    # 4. Port list (master_data)
    # 5. Counterparty list (master_data)
    # Total should be bounded and small, definitely not N+1 per voyage.
    # N = 3 vessels * 2 voyages = 6 voyages. If N+1, we'd see 6 extra queries.
    assert query_count <= 10
