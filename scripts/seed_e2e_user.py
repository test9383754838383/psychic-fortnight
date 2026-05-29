import asyncio
import os
import sys

# Ensure we're running from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.config import settings
from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.role import Role
from sqlalchemy import select

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # Ensure Admin role exists
        stmt = select(Role).where(Role.name == "Admin")
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            session.add(Role(name="Admin"))
            await session.commit()
            
        auth_service = AuthService(session)
        # Seed operator user for stub login
        try:
            await auth_service.authenticate("operator", "password")
        except Exception:
            try:
                await auth_service.create_user("operator", "password", ["Admin"])
                print("Seeded operator user successfully.")
            except Exception as e:
                print(f"Failed to seed operator: {e}")

        try:
            # Check if e2e user already exists
            await auth_service.authenticate("e2e_admin", "e2e_password")
            print("E2E user already exists.")
        except Exception:
            try:
                await auth_service.create_user("e2e_admin", "e2e_password", ["Admin"])
                print("Seeded E2E user successfully.")
            except Exception as e:
                print(f"Failed to seed user: {e}")

if __name__ == "__main__":
    asyncio.run(main())
