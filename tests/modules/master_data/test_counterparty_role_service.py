import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.master_data.services.counterparty_service import CounterpartyService
from src.modules.master_data.models.counterparty_role import CounterpartyRole
from src.modules.master_data.exceptions import (
    AgentFieldsNotAllowedError,
    CounterpartyRoleNotFoundError,
    DuplicateCounterpartyRoleError,
    InvalidAgentFieldsError,
)
from tests.modules.master_data.conftest import (
    CounterpartyFactory,
    CounterpartyRoleFactory,
)


@pytest.mark.asyncio
async def test_attach_role_non_agent(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    updated = await service.attach_role(cp.id, "Owner")

    assert len(updated.roles) == 1
    assert updated.roles[0].role == "Owner"
    assert updated.roles[0].ports_serviced is None
    assert updated.roles[0].nomination_contact_email is None


@pytest.mark.asyncio
async def test_attach_role_non_agent_rejects_fields(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    agent_fields = {
        "ports_serviced": ["NLRTM"],
        "nomination_contact_email": "owner@company.com",
    }

    with pytest.raises(AgentFieldsNotAllowedError):
        await service.attach_role(cp.id, "Owner", agent_fields=agent_fields)


@pytest.mark.asyncio
async def test_attach_role_agent_happy_path(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    agent_fields = {
        "ports_serviced": ["NLRTM", "USNYC"],
        "nomination_contact_email": "agent@agency.com",
    }

    updated = await service.attach_role(cp.id, "Agent", agent_fields=agent_fields)

    assert len(updated.roles) == 1
    role = updated.roles[0]
    assert role.role == "Agent"
    assert role.ports_serviced == ["NLRTM", "USNYC"]
    assert role.nomination_contact_email == "agent@agency.com"


@pytest.mark.asyncio
async def test_attach_role_agent_missing_fields(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)

    # Missing fields completely
    with pytest.raises(InvalidAgentFieldsError):
        await service.attach_role(cp.id, "Agent", agent_fields=None)

    # Empty list of ports
    with pytest.raises(InvalidAgentFieldsError) as exc_info:
        await service.attach_role(
            cp.id,
            "Agent",
            agent_fields={
                "ports_serviced": [],
                "nomination_contact_email": "agent@agency.com",
            },
        )
    assert "ports_serviced" in str(exc_info.value)


@pytest.mark.asyncio
async def test_attach_role_agent_invalid_port_format(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    # Port too short
    agent_fields = {
        "ports_serviced": ["NL"],
        "nomination_contact_email": "agent@agency.com",
    }

    with pytest.raises(InvalidAgentFieldsError):
        await service.attach_role(cp.id, "Agent", agent_fields=agent_fields)


@pytest.mark.asyncio
async def test_attach_role_agent_invalid_port_prefix(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    # Port with unregistered country prefix
    agent_fields = {
        "ports_serviced": ["XXRTM"],
        "nomination_contact_email": "agent@agency.com",
    }

    with pytest.raises(InvalidAgentFieldsError) as exc_info:
        await service.attach_role(cp.id, "Agent", agent_fields=agent_fields)
    assert "Country prefix" in str(exc_info.value)


@pytest.mark.asyncio
async def test_attach_role_agent_invalid_email(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    agent_fields = {
        "ports_serviced": ["NLRTM"],
        "nomination_contact_email": "bademail",
    }

    with pytest.raises(InvalidAgentFieldsError) as exc_info:
        await service.attach_role(cp.id, "Agent", agent_fields=agent_fields)
    assert "email" in str(exc_info.value)


@pytest.mark.asyncio
async def test_attach_role_duplicate(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    # Pre-attach Owner role
    role = CounterpartyRoleFactory.build(counterparty=cp, role="Owner")
    session.add(role)
    await session.commit()

    service = CounterpartyService(session)
    with pytest.raises(DuplicateCounterpartyRoleError):
        await service.attach_role(cp.id, "Owner")


@pytest.mark.asyncio
async def test_detach_role(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    role = CounterpartyRoleFactory.build(counterparty=cp, role="Owner")
    session.add(role)
    await session.commit()

    service = CounterpartyService(session)
    updated = await service.detach_role(cp.id, "Owner")

    assert len(updated.roles) == 0


@pytest.mark.asyncio
async def test_detach_role_not_found(session: AsyncSession):
    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    service = CounterpartyService(session)
    with pytest.raises(CounterpartyRoleNotFoundError):
        await service.detach_role(cp.id, "Owner")


@pytest.mark.asyncio
async def test_cascade_delete_roles_db(session: AsyncSession):
    from sqlalchemy import delete
    from src.modules.master_data.models.counterparty import Counterparty

    cp = CounterpartyFactory.build()
    session.add(cp)
    await session.commit()

    role = CounterpartyRoleFactory.build(counterparty=cp, role="Owner")
    session.add(role)
    await session.commit()

    # Verify role exists in the DB
    stmt = select(CounterpartyRole).where(CounterpartyRole.counterparty_id == cp.id)
    result = await session.execute(stmt)
    assert len(result.scalars().all()) == 1

    # Expunge all objects to decouple the ORM unit-of-work and relationship cascades
    session.expunge_all()

    # Execute a direct database delete query on the parent table
    await session.execute(delete(Counterparty).where(Counterparty.id == cp.id))
    await session.commit()

    # Verify role is automatically cascade-deleted at the DB engine level
    stmt = select(CounterpartyRole).where(CounterpartyRole.counterparty_id == cp.id)
    result = await session.execute(stmt)
    assert len(result.scalars().all()) == 0
