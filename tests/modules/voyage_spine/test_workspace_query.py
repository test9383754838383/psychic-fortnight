import pytest
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_spine.services.workspace_query import WorkspaceQueryService
from src.modules.voyage_spine.exceptions import VoyageNotFoundError
from tests.modules.master_data.conftest import (
    VesselFactory,
    PortFactory,
    CounterpartyFactory,
)
from tests.modules.voyage_spine.conftest import (
    VoyageFactory,
    ItineraryLineFactory,
)


@pytest.mark.asyncio
async def test_get_workspace_full_assembly(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    port1 = PortFactory.build(unlocode="PORT1")
    port2 = PortFactory.build(unlocode="PORT2")
    session.add_all([vessel, port1, port2])
    await session.commit()

    voyage = VoyageFactory.build(
        vessel_ref=vessel.id,
        voyage_no="VOY-123",
        terms_charterer_name="Manual Charterer",
        voyage_instructions="Instruction text",
        ops_notes="Notes text",
    )
    session.add(voyage)
    await session.flush()

    l1 = ItineraryLineFactory.build(
        voyage_id=voyage.id,
        port_ref=port1.id,
        sequence_no=1,  # Reversed order to test sorting
        planned_eta=datetime(2026, 6, 5, tzinfo=timezone.utc),
        planned_etd=datetime(2026, 6, 6, tzinfo=timezone.utc),
    )
    l0 = ItineraryLineFactory.build(
        voyage_id=voyage.id,
        port_ref=port2.id,
        sequence_no=0,
        planned_eta=datetime(2026, 6, 1, tzinfo=timezone.utc),
        planned_etd=datetime(2026, 6, 2, tzinfo=timezone.utc),
    )
    session.add_all([l0, l1])
    await session.commit()

    service = WorkspaceQueryService(session)
    resp = await service.get_workspace(voyage.id)

    assert resp.voyage_id == voyage.id
    assert resp.voyage_no == "VOY-123"
    assert resp.vessel.id == vessel.id
    assert resp.charterer == "Manual Charterer"
    assert resp.voyage_instructions == "Instruction text"

    # Itinerary should be ordered by sequence_no
    assert len(resp.itinerary) == 2
    assert resp.itinerary[0].sequence_no == 0
    assert resp.itinerary[0].port_code == "PORT2"
    assert resp.itinerary[1].sequence_no == 1
    assert resp.itinerary[1].port_code == "PORT1"


@pytest.mark.asyncio
async def test_get_workspace_charterer_fallback(session: AsyncSession):
    vessel = VesselFactory.build(status="Active")
    charterer = CounterpartyFactory.build(status="Active", name="Master Charterer")
    session.add_all([vessel, charterer])
    await session.commit()

    # Case 1: Manual override takes precedence
    voy1 = VoyageFactory.build(
        vessel_ref=vessel.id,
        charterer_ref=charterer.id,
        terms_charterer_name="Override Name",
    )
    # Case 2: Fallback to master data
    voy2 = VoyageFactory.build(
        vessel_ref=vessel.id, charterer_ref=charterer.id, terms_charterer_name=None
    )
    # Case 3: No charterer at all
    voy3 = VoyageFactory.build(
        vessel_ref=vessel.id, charterer_ref=None, terms_charterer_name=None
    )
    session.add_all([voy1, voy2, voy3])
    await session.commit()

    service = WorkspaceQueryService(session)

    resp1 = await service.get_workspace(voy1.id)
    assert resp1.charterer == "Override Name"

    resp2 = await service.get_workspace(voy2.id)
    assert resp2.charterer == "Master Charterer"

    resp3 = await service.get_workspace(voy3.id)
    assert resp3.charterer is None


@pytest.mark.asyncio
async def test_get_workspace_not_found(session: AsyncSession):
    service = WorkspaceQueryService(session)
    with pytest.raises(VoyageNotFoundError):
        await service.get_workspace(uuid.uuid4())
