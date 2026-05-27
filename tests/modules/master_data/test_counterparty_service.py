import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.master_data.services.counterparty_service import CounterpartyService
from src.modules.master_data.exceptions import (
    DuplicateCounterpartyCodeError,
    CounterpartyNotFoundError,
    InvalidCounterpartyStatusError,
    InvalidCounterpartyContactsError,
    InvalidCounterpartyRoleError,
)
from tests.modules.master_data.conftest import CounterpartyFactory


@pytest.mark.asyncio
async def test_create_counterparty_happy_path(session: AsyncSession):
    service = CounterpartyService(session)
    cp_data = {
        "code": "CP001",
        "name": "General Supplier Corp",
        "contacts": [
            {
                "name": "Alice Smith",
                "email": "alice@supplier.com",
                "phone": "+1234567890",
                "role_hint": "Sales Lead",
            }
        ],
    }

    cp = await service.create(cp_data)

    assert cp.code == "CP001"
    assert cp.name == "General Supplier Corp"
    assert len(cp.contacts) == 1
    assert cp.contacts[0]["name"] == "Alice Smith"
    assert cp.contacts[0]["email"] == "alice@supplier.com"
    assert cp.id is not None


@pytest.mark.asyncio
async def test_create_counterparty_invalid_contacts_format(session: AsyncSession):
    service = CounterpartyService(session)
    cp_data = {
        "code": "CP001",
        "name": "Bad Contacts",
        "contacts": [
            {
                "name": "",  # Invalid: must be min_length=1
                "email": "alice@supplier.com",
                "phone": "+1234567890",
            }
        ],
    }

    with pytest.raises(InvalidCounterpartyContactsError):
        await service.create(cp_data)


@pytest.mark.asyncio
async def test_create_counterparty_duplicate_code(session: AsyncSession):
    cp = CounterpartyFactory.build(code="DUP-CP")
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    cp_data = {
        "code": "DUP-CP",
        "name": "Another CP",
        "contacts": [],
    }

    with pytest.raises(DuplicateCounterpartyCodeError):
        await service.create(cp_data)


@pytest.mark.asyncio
async def test_get_counterparty(session: AsyncSession):
    cp = CounterpartyFactory.build(code="GET-CP")
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    retrieved = await service.get(cp.id)

    assert retrieved.code == "GET-CP"
    assert retrieved.id == cp.id


@pytest.mark.asyncio
async def test_get_counterparty_not_found(session: AsyncSession):
    service = CounterpartyService(session)
    with pytest.raises(CounterpartyNotFoundError):
        await service.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_list_counterparties_filtering_status(session: AsyncSession):
    c1 = CounterpartyFactory.build(code="C1", status="Active")
    c2 = CounterpartyFactory.build(code="C2", status="Inactive")
    session.add_all([c1, c2])
    await session.commit()

    service = CounterpartyService(session)
    active = await service.list(status="Active")
    assert len(active) == 1
    assert active[0].code == "C1"


@pytest.mark.asyncio
async def test_update_counterparty_happy_path(session: AsyncSession):
    cp = CounterpartyFactory.build(code="CP-OLD", name="Old CP Name")
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    updated = await service.update(
        cp.id,
        {
            "name": "New CP Name",
            "contacts": [
                {
                    "name": "Bob",
                    "email": "bob@new.com",
                    "phone": "000000",
                }
            ],
        },
    )

    assert updated.name == "New CP Name"
    assert len(updated.contacts) == 1
    assert updated.contacts[0]["name"] == "Bob"


@pytest.mark.asyncio
async def test_update_counterparty_invalid_status(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    with pytest.raises(InvalidCounterpartyStatusError):
        await service.update(cp.id, {"status": "BadStatus"})


@pytest.mark.asyncio
async def test_deactivate_counterparty(session: AsyncSession):
    cp = CounterpartyFactory.build(status="Active")
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    deactivated = await service.deactivate(cp.id)

    assert deactivated.status == "Inactive"


@pytest.mark.asyncio
async def test_list_counterparties_no_filters(session: AsyncSession):
    c1 = CounterpartyFactory.build(code="C1")
    c2 = CounterpartyFactory.build(code="C2")
    session.add_all([c1, c2])
    await session.commit()

    service = CounterpartyService(session)
    counterparties = await service.list()
    assert len(counterparties) >= 2


@pytest.mark.asyncio
async def test_create_counterparty_invalid_status(session: AsyncSession):
    service = CounterpartyService(session)
    with pytest.raises(InvalidCounterpartyStatusError):
        await service.create({"code": "C1", "name": "Name", "status": "BadStatus"})


@pytest.mark.asyncio
async def test_update_counterparty_duplicate_code(session: AsyncSession):
    c1 = CounterpartyFactory.build(code="C1")
    c2 = CounterpartyFactory.build(code="C2")
    session.add_all([c1, c2])
    await session.commit()

    service = CounterpartyService(session)
    with pytest.raises(DuplicateCounterpartyCodeError):
        await service.update(c1.id, {"code": "C2"})


@pytest.mark.asyncio
async def test_attach_role_invalid_role_enum(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    with pytest.raises(InvalidCounterpartyRoleError) as exc_info:
        await service.attach_role(cp.id, "InvalidRoleName")
    assert "Invalid role" in str(exc_info.value)
