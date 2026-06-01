import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.alerts.models.alert import Alert


class AlertRepository(SQLAlchemyAsyncRepository[Alert]):
    model_type = Alert

    async def list_filtered(
        self,
        severity: str | None = None,
        resolved: bool | None = None,
        entity_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Alert]:
        stmt = select(Alert)
        if severity is not None:
            stmt = stmt.where(Alert.severity == severity)
        if resolved is True:
            stmt = stmt.where(Alert.resolved_at.is_not(None))
        elif resolved is False:
            stmt = stmt.where(Alert.resolved_at.is_(None))
        if entity_type is not None:
            stmt = stmt.where(Alert.linked_entity_type == entity_type)
        stmt = stmt.order_by(Alert.triggered_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, alert_id: uuid.UUID) -> Alert | None:
        return await self.get_one_or_none(id=alert_id)
