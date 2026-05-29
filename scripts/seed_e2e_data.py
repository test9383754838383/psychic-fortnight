import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
import uuid

# Ensure we're running from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.config import settings
from src.modules.master_data.models.vessel import Vessel
from src.modules.master_data.models.port import Port
from src.modules.master_data.models.counterparty import Counterparty
from src.modules.master_data.models.counterparty_role import CounterpartyRole
from src.modules.voyage_spine.models.voyage import Voyage
from src.modules.voyage_spine.models.itinerary_line import ItineraryLine
from sqlalchemy import select

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # 1. Create a Port if it doesn't exist
        port_id = str(uuid.UUID('00000000-0000-0000-0000-000000000003'))
        stmt = select(Port).where(Port.id == port_id)
        result = await session.execute(stmt)
        port = result.scalar_one_or_none()
        if not port:
            port = Port(
                id=port_id,
                unlocode="NLRTM",
                name="Rotterdam",
                country="NL",
                timezone="Europe/Amsterdam",
                latitude=51.9225,
                longitude=4.47917,
                status="Active"
            )
            session.add(port)
            print("Seeded E2E Port.")

        # 2. Create a Vessel if it doesn't exist
        vessel_id = str(uuid.UUID('00000000-0000-0000-0000-000000000001'))
        stmt = select(Vessel).where(Vessel.id == vessel_id)
        result = await session.execute(stmt)
        vessel = result.scalar_one_or_none()
        
        if not vessel:
            vessel = Vessel(
                id=vessel_id,
                code="E2EV",
                name="E2E TEST VESSEL",
                imo="1234567",
                vessel_type="Bulker",
                flag="MH",
                status="Active"
            )
            session.add(vessel)
            print("Seeded E2E Vessel.")
        
        # 3. Create a Voyage for that vessel
        voyage_id = str(uuid.UUID('00000000-0000-0000-0000-000000000002'))
        stmt = select(Voyage).where(Voyage.id == voyage_id)
        result = await session.execute(stmt)
        voyage = result.scalar_one_or_none()
        
        if not voyage:
            now = datetime.now(timezone.utc)
            voyage = Voyage(
                id=voyage_id,
                voyage_no="V001",
                vessel_ref=vessel_id,
                status="Commenced",
                commencing_datetime=now - timedelta(days=5),
                expected_completing_datetime=now + timedelta(days=5),
                terms_charterer_name="E2E CHARTERER",
                terms_cp_type="TC",
                terms_cp_date=now.date()
            )
            session.add(voyage)
            
            # Add itinerary lines
            line1 = ItineraryLine(
                voyage_id=voyage_id,
                sequence_no=0, # orderinglist usually starts at 0
                port_ref=port_id,
                port_function="Load",
                planned_eta=now - timedelta(days=5),
                planned_etd=now - timedelta(days=4)
            )
            line2 = ItineraryLine(
                voyage_id=voyage_id,
                sequence_no=1,
                port_ref=port_id, 
                port_function="Discharge",
                planned_eta=now + timedelta(days=4),
                planned_etd=now + timedelta(days=5)
            )
            session.add_all([line1, line2])
            print("Seeded E2E Voyage and Itinerary.")
            
        # 4. Create an Agent if it doesn't exist
        agent_id = str(uuid.UUID('00000000-0000-0000-0000-000000000005'))
        stmt = select(Counterparty).where(Counterparty.id == agent_id)
        result = await session.execute(stmt)
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Counterparty(
                id=agent_id,
                code="E2EAGENT",
                name="E2E GLOBAL AGENT",
                status="Active"
            )
            session.add(agent)
            
            # Attach Agent role
            role = CounterpartyRole(
                id=str(uuid.uuid4()),
                counterparty_id=agent_id,
                role="Agent"
            )
            session.add(role)
            print("Seeded E2E Agent.")
            
        await session.commit()

if __name__ == "__main__":
    asyncio.run(main())
