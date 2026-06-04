import uuid
from typing import Optional

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.modules.operational_reporting.models.activity_report import (
    ActivityReport,
    ActivityReportBunker,
)


class ActivityReportRepository(SQLAlchemyAsyncRepository[ActivityReport]):
    model_type = ActivityReport

    async def get_with_lines(self, report_id: uuid.UUID) -> Optional[ActivityReport]:
        stmt = (
            select(ActivityReport)
            .where(ActivityReport.id == report_id)
            .options(selectinload(ActivityReport.bunker_lines))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_voyage(
        self, voyage_id: uuid.UUID, status: Optional[str] = None
    ) -> list[ActivityReport]:
        stmt = (
            select(ActivityReport)
            .where(ActivityReport.voyage_id == voyage_id)
            .options(selectinload(ActivityReport.bunker_lines))
            .order_by(ActivityReport.report_datetime)
        )
        if status:
            stmt = stmt.where(ActivityReport.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_approved_noon_for_voyage(
        self, voyage_id: uuid.UUID
    ) -> list[ActivityReport]:
        from src.modules.operational_reporting.models.activity_report import ReportType, ReportStatus
        stmt = (
            select(ActivityReport)
            .where(
                ActivityReport.voyage_id == voyage_id,
                ActivityReport.report_type == ReportType.NOON.value,
                ActivityReport.status == ReportStatus.APPROVED.value,
            )
            .options(selectinload(ActivityReport.bunker_lines))
            .order_by(ActivityReport.report_datetime)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ActivityReportBunkerRepository(SQLAlchemyAsyncRepository[ActivityReportBunker]):
    model_type = ActivityReportBunker

    async def list_for_report(self, report_id: uuid.UUID) -> list[ActivityReportBunker]:
        stmt = (
            select(ActivityReportBunker)
            .where(ActivityReportBunker.activity_report_id == report_id)
            .order_by(ActivityReportBunker.fuel_grade)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_by_id(self, line_id: uuid.UUID) -> None:
        stmt = select(ActivityReportBunker).where(ActivityReportBunker.id == line_id)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            await self.session.delete(row)
