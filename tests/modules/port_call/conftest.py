import factory
from factory.alchemy import SQLAlchemyModelFactory
from src.modules.port_call.models.port_call import PortCall, PortCallStatus
from src.modules.port_call.models.agent_appointment import (
    AgentAppointment,
    AgentAppointmentStatus,
)
from tests.modules.master_data.conftest import (  # noqa: F401
    VesselFactory,
    PortFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)
from tests.modules.voyage_spine.conftest import (  # noqa: F401
    VoyageFactory,
    ItineraryLineFactory,
)


class PortCallFactory(SQLAlchemyModelFactory):
    class Meta:
        model = PortCall
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    voyage_id = factory.Faker("uuid4", cast_to=None)
    port_id = factory.Faker("uuid4", cast_to=None)
    itinerary_line_id = None
    status = PortCallStatus.PLANNED.value
    timezone_name = "UTC"
    timezone_offset_minutes = 0

    # Explicitly set all datetime fields to None to avoid factory_boy auto-generation
    ata = None
    anchored_datetime = None
    atb = None
    cargo_ops_started_datetime = None
    cargo_ops_completed_datetime = None
    atd = None
    nor_tendered_datetime = None
    nor_accepted_datetime = None
    free_pratique_granted_datetime = None
    customs_cleared_datetime = None


class AgentAppointmentFactory(SQLAlchemyModelFactory):
    class Meta:
        model = AgentAppointment
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    port_call_id = factory.Faker("uuid4", cast_to=None)
    agent_ref = factory.Faker("uuid4", cast_to=None)
    appointed_date = factory.Faker("date_object")
    status = AgentAppointmentStatus.NOMINATED.value
