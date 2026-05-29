import pytest
from datetime import datetime, timezone, timedelta
from src.modules.port_call.models.port_call import PortCallStatus
from src.modules.port_call.services.port_call_service import PortCallService
from src.modules.port_call.exceptions import (
    TimestampCoherenceError,
    CorrectionReasonRequiredError,
)
from tests.modules.port_call.conftest import (
    PortCallFactory,
    VoyageFactory,
    PortFactory,
    VesselFactory,
)


@pytest.mark.asyncio
async def test_timestamp_monotonicity(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    now = datetime.now(timezone.utc)
    pc = PortCallFactory.build(
        voyage_id=voyage.id,
        port_id=port.id,
        ata=now,
        atb=now - timedelta(hours=1),  # Invalid: atb before ata
        anchored_datetime=None,
        cargo_ops_started_datetime=None,
        cargo_ops_completed_datetime=None,
        atd=None,
    )
    session.add(pc)
    await session.commit()

    service = PortCallService(session)
    with pytest.raises(TimestampCoherenceError, match="ata .* cannot be after atb"):
        await service.update(pc.id, {}, set())


@pytest.mark.asyncio
async def test_nor_coherence(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()

    service = PortCallService(session)

    # Accepted without tendered
    with pytest.raises(
        TimestampCoherenceError, match="NOR Accepted requires NOR Tendered"
    ):
        await service.update(
            pc.id, {"nor_accepted_datetime": datetime.now(timezone.utc)}, set()
        )

    # Accepted before tendered
    now = datetime.now(timezone.utc)
    with pytest.raises(
        TimestampCoherenceError, match="NOR Accepted cannot be before NOR Tendered"
    ):
        await service.update(
            pc.id,
            {
                "nor_tendered_datetime": now,
                "nor_accepted_datetime": now - timedelta(minutes=1),
            },
            set(),
        )


@pytest.mark.asyncio
async def test_clearance_coherence(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(
        voyage_id=voyage.id, port_id=port.id, free_pratique_granted_datetime=None
    )
    assert pc.free_pratique_granted_datetime is None
    session.add(pc)
    await session.commit()
    await session.refresh(pc)
    assert pc.free_pratique_granted_datetime is None

    service = PortCallService(session)

    # Datetime without bool
    with pytest.raises(
        TimestampCoherenceError,
        match="Free Pratique datetime cannot be set when granted is False",
    ):
        await service.update(
            pc.id, {"free_pratique_granted_datetime": datetime.now(timezone.utc)}, set()
        )

    # Refresh to clear the dirty state from the failed update
    await session.refresh(pc)

    # Bool without datetime (allowed)
    await service.update(pc.id, {"free_pratique_granted": True}, set())
    await session.refresh(pc)
    assert pc.free_pratique_granted is True
    assert pc.free_pratique_granted_datetime is None


@pytest.mark.asyncio
async def test_correction_reason_required(session):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    port = PortFactory.build()
    session.add_all([voyage, port])
    await session.commit()

    pc = PortCallFactory.build(
        voyage_id=voyage.id, port_id=port.id, status=PortCallStatus.BERTHED.value
    )
    session.add(pc)
    await session.commit()

    service = PortCallService(session)

    # Backward change without reason
    with pytest.raises(CorrectionReasonRequiredError):
        await service.update(pc.id, {"status": PortCallStatus.PLANNED.value}, {"Admin"})

    # Backward change with reason
    await service.update(
        pc.id,
        {"status": PortCallStatus.PLANNED.value, "correction_reason": "Mistake"},
        {"Admin"},
    )
    await session.refresh(pc)
    assert pc.status == PortCallStatus.PLANNED.value
