import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure we're running from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.config import settings
from src.modules.auth.services.auth_service import AuthService
from src.modules.auth.models.role import Role
from src.modules.auth.models.user import User
from src.modules.auth.models.session import Session
from sqlalchemy import select

# Fixed session ID used by E2E tests — injected directly as a cookie so tests
# never need to call the Argon2-backed login endpoint in parallel.
E2E_SESSION_ID = "e2e-fixed-session-00000000000000000000000000000001"

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

        # Insert a fixed session for the operator user so E2E tests can inject
        # the cookie directly — no Argon2 call needed during parallel test execution.
        operator_stmt = select(User).where(User.username == "operator")
        operator_result = await session.execute(operator_stmt)
        operator_user = operator_result.scalar_one_or_none()
        if operator_user:
            existing_session_stmt = select(Session).where(Session.session_id == E2E_SESSION_ID)
            existing_session_result = await session.execute(existing_session_stmt)
            if not existing_session_result.scalar_one_or_none():
                fixed_session = Session(
                    session_id=E2E_SESSION_ID,
                    user_id=operator_user.id,
                    last_seen_at=datetime.now(timezone.utc),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=365),
                )
                session.add(fixed_session)
                await session.commit()
                print("Seeded E2E fixed session.")
            else:
                # Refresh expiry so a stale session doesn't block
                existing_session_result_2 = await session.execute(existing_session_stmt)
                fixed_session = existing_session_result_2.scalar_one_or_none()
                if fixed_session:
                    fixed_session.expires_at = datetime.now(timezone.utc) + timedelta(days=365)
                    fixed_session.last_seen_at = datetime.now(timezone.utc)
                    await session.commit()

if __name__ == "__main__":
    asyncio.run(main())
