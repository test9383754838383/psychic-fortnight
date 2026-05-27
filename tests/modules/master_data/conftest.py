import factory
from factory.alchemy import SQLAlchemyModelFactory
from src.modules.master_data.models.vessel import Vessel


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
