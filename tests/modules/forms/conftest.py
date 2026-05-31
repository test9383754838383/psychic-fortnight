import pytest
from httpx import ASGITransport, AsyncClient
from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.role import Role
from sqlalchemy import select
from tests.modules.master_data.conftest import VesselFactory, PortFactory
from tests.modules.voyage_spine.conftest import VoyageFactory
from tests.modules.port_call.conftest import PortCallFactory


@pytest.fixture(autouse=True)
def set_factories_session_forms(session):
    VesselFactory._meta.sqlalchemy_session = session
    PortFactory._meta.sqlalchemy_session = session
    VoyageFactory._meta.sqlalchemy_session = session
    PortCallFactory._meta.sqlalchemy_session = session
    yield
    VesselFactory._meta.sqlalchemy_session = None
    PortFactory._meta.sqlalchemy_session = None
    VoyageFactory._meta.sqlalchemy_session = None
    PortCallFactory._meta.sqlalchemy_session = None


@pytest.fixture
async def voyage(session):
    vessel = VesselFactory()
    session.add(vessel)
    await session.flush()
    v = VoyageFactory(vessel_ref=vessel.id)
    session.add(v)
    await session.commit()
    return v


@pytest.fixture
async def ops_client(app, session):
    # Ensure role exists
    stmt = select(Role).where(Role.name == "Operations")
    result = await session.execute(stmt)
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name="Operations")
        session.add(role)
        await session.commit()

    auth_service = AuthService(session)
    user = await auth_service.create_user("opsuser_forms", "password", ["Operations"])
    session_record = await auth_service.create_session(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        cookies={"session_id": session_record.session_id},
    ) as client:
        yield client
