import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.master_data.services.port_service import PortService
from src.modules.master_data.exceptions import (
    DuplicatePortUnlocodeError,
    InvalidPortCoordinatesError,
    InvalidPortStatusError,
    InvalidUnlocodeError,
    PortNotFoundError,
)
from tests.modules.master_data.conftest import PortFactory


@pytest.mark.asyncio
async def test_create_port_happy_path(session: AsyncSession):
    service = PortService(session)
    port_data = {
        "unlocode": "NLRTM",  # Rotterdam (NL prefix is valid)
        "name": "Rotterdam",
        "timezone": "Europe/Amsterdam",
        "latitude": 51.9244,
        "longitude": 4.4777,
    }

    port = await service.create(port_data)

    assert port.unlocode == "NLRTM"
    assert port.name == "Rotterdam"
    assert port.country == "Netherlands"  # derived at write time
    assert port.latitude == 51.9244
    assert port.id is not None


@pytest.mark.asyncio
async def test_create_port_invalid_unlocode_format(session: AsyncSession):
    service = PortService(session)
    port_data = {
        "unlocode": "NL1",  # Too short
        "name": "Bad Port",
        "timezone": "UTC",
        "latitude": 0.0,
        "longitude": 0.0,
    }

    with pytest.raises(InvalidUnlocodeError) as exc_info:
        await service.create(port_data)
    assert "format" in str(exc_info.value)


@pytest.mark.asyncio
async def test_create_port_out_of_prefix_unlocode(session: AsyncSession):
    service = PortService(session)
    port_data = {
        "unlocode": "XXRTM",  # XX prefix is not in static dict
        "name": "Unknown Country Port",
        "timezone": "UTC",
        "latitude": 0.0,
        "longitude": 0.0,
    }

    with pytest.raises(InvalidUnlocodeError) as exc_info:
        await service.create(port_data)
    assert "Country prefix" in str(exc_info.value)


@pytest.mark.asyncio
async def test_create_port_duplicate_unlocode(session: AsyncSession):
    port = PortFactory.build(unlocode="USNYC", country="United States of America")
    session.add(port)
    await session.commit()

    service = PortService(session)
    port_data = {
        "unlocode": "USNYC",
        "name": "New York",
        "timezone": "America/New_York",
        "latitude": 40.7128,
        "longitude": -74.0060,
    }

    with pytest.raises(DuplicatePortUnlocodeError):
        await service.create(port_data)


@pytest.mark.asyncio
async def test_create_port_invalid_latitude(session: AsyncSession):
    service = PortService(session)
    port_data = {
        "unlocode": "NLRTM",
        "name": "Rotterdam",
        "timezone": "Europe/Amsterdam",
        "latitude": 95.0,  # Invalid
        "longitude": 4.4777,
    }

    with pytest.raises(InvalidPortCoordinatesError):
        await service.create(port_data)


@pytest.mark.asyncio
async def test_create_port_invalid_longitude(session: AsyncSession):
    service = PortService(session)
    port_data = {
        "unlocode": "NLRTM",
        "name": "Rotterdam",
        "timezone": "Europe/Amsterdam",
        "latitude": 51.9244,
        "longitude": 185.0,  # Invalid
    }

    with pytest.raises(InvalidPortCoordinatesError):
        await service.create(port_data)


@pytest.mark.asyncio
async def test_get_port(session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM")
    session.add(port)
    await session.commit()

    service = PortService(session)
    retrieved = await service.get(port.id)

    assert retrieved.unlocode == "NLRTM"
    assert retrieved.id == port.id


@pytest.mark.asyncio
async def test_get_port_not_found(session: AsyncSession):
    service = PortService(session)
    with pytest.raises(PortNotFoundError):
        await service.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_list_ports_filtering(session: AsyncSession):
    p1 = PortFactory.build(unlocode="NLRTM", country="Netherlands", status="Active")
    p2 = PortFactory.build(
        unlocode="USNYC", country="United States of America", status="Inactive"
    )
    session.add_all([p1, p2])
    await session.commit()

    service = PortService(session)

    # Filter status
    active_ports = await service.list(status="Active")
    assert len(active_ports) == 1
    assert active_ports[0].unlocode == "NLRTM"

    # Filter country
    us_ports = await service.list(country="United States of America")
    assert len(us_ports) == 1
    assert us_ports[0].unlocode == "USNYC"

    # Filter status and country
    both = await service.list(status="Active", country="Netherlands")
    assert len(both) == 1


@pytest.mark.asyncio
async def test_update_port_happy_path(session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM", name="Old Name")
    session.add(port)
    await session.commit()

    service = PortService(session)
    updated = await service.update(port.id, {"name": "New Name", "unlocode": "USNYC"})

    assert updated.name == "New Name"
    assert updated.unlocode == "USNYC"
    assert updated.country == "United States of America"  # auto-updated derived country


@pytest.mark.asyncio
async def test_update_port_invalid_status(session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM")
    session.add(port)
    await session.commit()

    service = PortService(session)
    with pytest.raises(InvalidPortStatusError):
        await service.update(port.id, {"status": "UnknownStatus"})


@pytest.mark.asyncio
async def test_deactivate_port(session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM", status="Active")
    session.add(port)
    await session.commit()

    service = PortService(session)
    deactivated = await service.deactivate(port.id)

    assert deactivated.status == "Inactive"


@pytest.mark.asyncio
async def test_list_ports_no_filters(session: AsyncSession):
    p1 = PortFactory.build(unlocode="NLRTM")
    p2 = PortFactory.build(unlocode="USNYC")
    session.add_all([p1, p2])
    await session.commit()

    service = PortService(session)
    ports = await service.list()
    assert len(ports) >= 2


@pytest.mark.asyncio
async def test_create_port_missing_unlocode(session: AsyncSession):
    service = PortService(session)
    with pytest.raises(InvalidUnlocodeError):
        await service.create({"name": "Test"})


@pytest.mark.asyncio
async def test_update_port_only_one_coordinate(session: AsyncSession):
    port = PortFactory.build(unlocode="NLRTM", latitude=10.0, longitude=10.0)
    session.add(port)
    await session.commit()

    service = PortService(session)
    # Valid single update
    updated = await service.update(port.id, {"latitude": 20.0})
    assert updated.latitude == 20.0
    assert updated.longitude == 10.0

    # Invalid single update (causes invalid range check)
    with pytest.raises(InvalidPortCoordinatesError):
        await service.update(port.id, {"longitude": 200.0})
