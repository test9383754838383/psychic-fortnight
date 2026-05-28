from datetime import datetime, timedelta, timezone
import factory
from factory.alchemy import SQLAlchemyModelFactory

from src.modules.voyage_spine.models.voyage import Voyage
from src.modules.voyage_spine.models.itinerary_line import ItineraryLine


class VoyageFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Voyage
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    voyage_no = factory.Sequence(lambda n: f"VOY-{n:04d}")
    vessel_ref = factory.Faker("uuid4", cast_to=None)
    charterer_ref = None
    previous_voyage_ref = None
    status = "Scheduled"
    commencing_datetime = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    expected_completing_datetime = None
    expected_completing_manual_override = False
    voyage_instructions = None
    ops_notes = None


class ItineraryLineFactory(SQLAlchemyModelFactory):
    class Meta:
        model = ItineraryLine
        sqlalchemy_session_persistence = None

    id = factory.Faker("uuid4", cast_to=None)
    voyage_id = factory.Faker("uuid4", cast_to=None)
    sequence_no = factory.Sequence(lambda n: n)
    port_ref = factory.Faker("uuid4", cast_to=None)
    port_function = "Load"
    planned_eta = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    planned_etd = factory.LazyFunction(
        lambda: datetime.now(timezone.utc) + timedelta(days=1)
    )
