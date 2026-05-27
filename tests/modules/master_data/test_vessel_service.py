import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.master_data.services.vessel_service import VesselService
from src.modules.master_data.exceptions import (
    DuplicateVesselCodeError,
    InvalidIMOError,
    VesselNotFoundError,
    InvalidVesselTypeError,
    InvalidVesselStatusError,
)
from tests.modules.master_data.conftest import VesselFactory

@pytest.mark.asyncio
async def test_create_vessel_invalid_type(session: AsyncSession):
    service = VesselService(session)
    vessel_data = {
        "code": "BAD-TYPE",
        "name": "Bad Type",
        "imo": "1234567",
        "vessel_type": "Spaceship",
        "flag": "LR"
    }
    with pytest.raises(InvalidVesselTypeError):
        await service.create(vessel_data)

@pytest.mark.asyncio
async def test_create_vessel_invalid_status(session: AsyncSession):
    service = VesselService(session)
    vessel_data = {
        "code": "BAD-STAT",
        "name": "Bad Status",
        "imo": "1234567",
        "vessel_type": "Tanker",
        "flag": "LR",
        "status": "Unknown"
    }
    with pytest.raises(InvalidVesselStatusError):
        await service.create(vessel_data)

@pytest.mark.asyncio
async def test_create_vessel_happy_path(session: AsyncSession):
    service = VesselService(session)
    vessel_data = {
        "code": "VESS-001",
        "name": "Ocean Voyager",
        "imo": "1234567",
        "vessel_type": "Tanker",
        "flag": "LR"
    }
    
    vessel = await service.create(vessel_data)
    
    assert vessel.code == "VESS-001"
    assert vessel.name == "Ocean Voyager"
    assert vessel.imo == "1234567"
    assert vessel.id is not None

@pytest.mark.asyncio
async def test_create_vessel_duplicate_code(session: AsyncSession):
    vessel = VesselFactory.build(code="DUP-001")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    vessel_data = {
        "code": "DUP-001",
        "name": "New Vessel",
        "imo": "7654321",
        "vessel_type": "Bulker",
        "flag": "PA"
    }
    
    with pytest.raises(DuplicateVesselCodeError):
        await service.create(vessel_data)

@pytest.mark.asyncio
async def test_create_vessel_invalid_imo(session: AsyncSession):
    service = VesselService(session)
    vessel_data = {
        "code": "VESS-002",
        "name": "Bad IMO",
        "imo": "123",
        "vessel_type": "Tanker",
        "flag": "LR"
    }
    
    with pytest.raises(InvalidIMOError):
        await service.create(vessel_data)

@pytest.mark.asyncio
async def test_get_vessel(session: AsyncSession):
    vessel = VesselFactory.build(code="GET-001")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    retrieved = await service.get(vessel.id)
    
    assert retrieved.code == "GET-001"
    assert retrieved.id == vessel.id

@pytest.mark.asyncio
async def test_get_vessel_not_found(session: AsyncSession):
    service = VesselService(session)
    with pytest.raises(VesselNotFoundError):
        await service.get(uuid.uuid4())

@pytest.mark.asyncio
async def test_list_vessels_filtering(session: AsyncSession):
    v1 = VesselFactory.build(code="TANK-1", vessel_type="Tanker", flag="LR")
    v2 = VesselFactory.build(code="BULK-1", vessel_type="Bulker", flag="PA")
    session.add_all([v1, v2])
    await session.commit()
    
    service = VesselService(session)
    
    tankers = await service.list(vessel_type="Tanker")
    assert len(tankers) == 1
    assert tankers[0].code == "TANK-1"
    
    panama_vessels = await service.list(flag="PA")
    assert len(panama_vessels) == 1
    assert panama_vessels[0].code == "BULK-1"
    
    none_found = await service.list(status="Inactive")
    assert len(none_found) == 0

@pytest.mark.asyncio
async def test_list_vessels(session: AsyncSession):
    v1 = VesselFactory.build(code="LIST-001", vessel_type="Tanker")
    v2 = VesselFactory.build(code="LIST-002", vessel_type="Bulker")
    session.add_all([v1, v2])
    await session.commit()
    
    service = VesselService(session)
    vessels = await service.list()
    
    assert len(vessels) >= 2
    assert any(v.code == "LIST-001" for v in vessels)
    assert any(v.code == "LIST-002" for v in vessels)

@pytest.mark.asyncio
async def test_update_vessel(session: AsyncSession):
    vessel = VesselFactory.build(code="UPD-001", name="Old Name")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    updated = await service.update(vessel.id, {"name": "New Name"})
    
    assert updated.name == "New Name"
    assert updated.code == "UPD-001"

@pytest.mark.asyncio
async def test_deactivate_vessel(session: AsyncSession):
    vessel = VesselFactory.build(code="DEA-001", status="Active")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    deactivated = await service.deactivate(vessel.id)
    
    assert deactivated.status == "Inactive"

@pytest.mark.asyncio
async def test_update_vessel_duplicate_code(session: AsyncSession):
    v1 = VesselFactory.build(code="V1")
    v2 = VesselFactory.build(code="V2")
    session.add_all([v1, v2])
    await session.commit()
    
    service = VesselService(session)
    with pytest.raises(DuplicateVesselCodeError):
        await service.update(v1.id, {"code": "V2"})

@pytest.mark.asyncio
async def test_update_vessel_invalid_imo(session: AsyncSession):
    vessel = VesselFactory.build(code="V3", imo="1234567")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    with pytest.raises(InvalidIMOError):
        await service.update(vessel.id, {"imo": "invalid"})

@pytest.mark.asyncio
async def test_update_vessel_invalid_type(session: AsyncSession):
    vessel = VesselFactory.build(code="V4")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    with pytest.raises(InvalidVesselTypeError):
        await service.update(vessel.id, {"vessel_type": "Invalid"})

@pytest.mark.asyncio
async def test_update_vessel_invalid_status(session: AsyncSession):
    vessel = VesselFactory.build(code="V5")
    session.add(vessel)
    await session.commit()
    
    service = VesselService(session)
    with pytest.raises(InvalidVesselStatusError):
        await service.update(vessel.id, {"status": "Invalid"})
