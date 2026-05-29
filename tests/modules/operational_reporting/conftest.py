"""
Factories and shared fixtures for operational_reporting tests.
Reuses upstream factories — no persistence mocking.
"""

import uuid
from datetime import datetime, timezone

import factory
from factory.alchemy import SQLAlchemyModelFactory

from src.modules.operational_reporting.models.port_activity import (
    ActivityLog,
    PortActivity,
    PortActivityEventType,
)
from src.modules.operational_reporting.models.operational_report import (
    OperationalReport,
    OperationalReportStatus,
    OperationalReportType,
)

# Re-export upstream factories so test files can import from here
from tests.modules.port_call.conftest import (  # noqa: F401
    PortCallFactory,
    AgentAppointmentFactory,
    VoyageFactory,
    ItineraryLineFactory,
    VesselFactory,
    PortFactory,
    CounterpartyFactory,
    CounterpartyRoleFactory,
)
from tests.modules.auth.conftest import UserFactory  # noqa: F401


class PortActivityFactory(SQLAlchemyModelFactory):
    class Meta:
        model = PortActivity
        sqlalchemy_session_persistence = None

    id = factory.LazyFunction(uuid.uuid4)
    port_call_id = factory.LazyFunction(uuid.uuid4)
    event_type = PortActivityEventType.ARRIVED.value
    event_timestamp = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    recorded_by_user_id = factory.LazyFunction(uuid.uuid4)
    notes = None
    corrects_activity_id = None
    correction_reason = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class ActivityLogFactory(SQLAlchemyModelFactory):
    class Meta:
        model = ActivityLog
        sqlalchemy_session_persistence = None

    id = factory.LazyFunction(uuid.uuid4)
    port_call_id = factory.LazyFunction(uuid.uuid4)
    logged_by_user_id = factory.LazyFunction(uuid.uuid4)
    narrative = factory.Faker("sentence")
    logged_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class OperationalReportFactory(SQLAlchemyModelFactory):
    class Meta:
        model = OperationalReport
        sqlalchemy_session_persistence = None

    id = factory.LazyFunction(uuid.uuid4)
    voyage_id = factory.LazyFunction(uuid.uuid4)
    port_call_id = None
    report_type = OperationalReportType.NOON.value
    status = OperationalReportStatus.PENDING.value
    submitted_by_user_id = factory.LazyFunction(uuid.uuid4)
    submitted_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    received_at = None
    position_lat = None
    position_lon = None
    speed_24h = None
    distance_to_go = None
    eta_next_port = None
    bunker_rob_total_mt = None
    raw_content_ref = None
    supersedes_report_id = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
