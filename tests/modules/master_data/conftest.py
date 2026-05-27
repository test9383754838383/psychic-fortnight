import factory
from factory.alchemy import SQLAlchemyModelFactory
from src.modules.master_data.models.vessel import Vessel
from src.modules.master_data.models.port import Port
from src.modules.master_data.models.counterparty import Counterparty
from src.modules.master_data.models.counterparty_role import CounterpartyRole


class VesselFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Vessel
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    code = factory.Faker("bothify", text="VESS-####")
    name = factory.Faker("company")
    imo = factory.Faker("numerify", text="#######")
    vessel_type = "Tanker"
    flag = "LR"
    status = "Active"
    active_for_reporting = True


class PortFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Port
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    unlocode = factory.Faker("bothify", text="NL###")
    name = factory.Faker("city")
    country = "Netherlands"
    timezone = "Europe/Rotterdam"
    latitude = factory.Faker("pyfloat", min_value=-90.0, max_value=90.0)
    longitude = factory.Faker("pyfloat", min_value=-180.0, max_value=180.0)
    distance_table_ref = None
    status = "Active"


class CounterpartyFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Counterparty
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    code = factory.Faker("bothify", text="CP-####")
    name = factory.Faker("company")
    status = "Active"
    contacts = factory.List(
        [
            {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+123456789",
                "role_hint": "Operations manager",
            }
        ]
    )


class CounterpartyRoleFactory(SQLAlchemyModelFactory):
    class Meta:
        model = CounterpartyRole
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    counterparty_id = factory.LazyAttribute(
        lambda o: o.counterparty.id if hasattr(o, "counterparty") else None
    )
    role = "Owner"
    ports_serviced = None
    nomination_contact_email = None
