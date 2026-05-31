import uuid
from typing import List

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.operational_reporting.models.operational_report import (
    OperationalReport,
)
from src.modules.port_call.models.port_call import PortCall


class OperationalReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, obj: OperationalReport) -> OperationalReport:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def get_one_or_none(self, **kwargs: object) -> OperationalReport | None:
        stmt = select(OperationalReport)
        for key, val in kwargs.items():
            stmt = stmt.where(getattr(OperationalReport, key) == val)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, obj: OperationalReport) -> OperationalReport:
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def list_for_port_call(
        self, port_call_id: uuid.UUID
    ) -> List[OperationalReport]:
        stmt = (
            select(OperationalReport)
            .where(OperationalReport.port_call_id == port_call_id)
            .order_by(OperationalReport.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> List[OperationalReport]:
        """Returns direct voyage reports PLUS all reports attached to port calls
        belonging to this voyage (D-LOCK-5 / §3 of specifications)."""
        # Sub-query: port call IDs for this voyage
        pc_ids_stmt = select(PortCall.id).where(PortCall.voyage_id == voyage_id)
        pc_ids_result = await self.session.execute(pc_ids_stmt)
        pc_ids = [row[0] for row in pc_ids_result.all()]

        stmt = (
            select(OperationalReport)
            .where(
                or_(
                    OperationalReport.voyage_id == voyage_id,
                    OperationalReport.port_call_id.in_(pc_ids)
                    if pc_ids
                    else OperationalReport.voyage_id == voyage_id,
                )
            )
            .order_by(OperationalReport.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
