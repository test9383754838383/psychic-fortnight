import pytest
from datetime import timezone
from argon2 import PasswordHasher
import factory
from factory.alchemy import SQLAlchemyModelFactory
import src.modules.auth.services.auth_service
from src.modules.auth.models.user import User
from src.modules.auth.models.role import Role
from src.modules.auth.models.session import Session


@pytest.fixture(scope="session", autouse=True)
def fast_argon2():
    """Override Argon2 parameters for faster tests."""
    fast_ph = PasswordHasher(time_cost=1, memory_cost=256, parallelism=1)
    src.modules.auth.services.auth_service.ph = fast_ph
    yield fast_ph


class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    username = factory.Sequence(lambda n: f"user{n}")
    hashed_password = "hashed_password"
    is_active = True


class RoleFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Role
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    name = factory.Sequence(lambda n: f"role{n}")


class SessionFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Session
        sqlalchemy_session_persistence = None

    session_id = factory.Sequence(lambda n: f"{n:064x}")
    user_id = factory.Faker("uuid4", cast_to=None)
    created_at = factory.Faker("date_time", tzinfo=timezone.utc)
    last_seen_at = factory.Faker("date_time", tzinfo=timezone.utc)
    expires_at = factory.Faker("date_time", tzinfo=timezone.utc)


@pytest.fixture
def user_factory():
    return UserFactory


@pytest.fixture
def role_factory():
    return RoleFactory


@pytest.fixture
def session_factory():
    return SessionFactory
