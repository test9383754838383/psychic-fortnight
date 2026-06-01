import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.alerts.constants import SEVERITY_CRITICAL, SEVERITY_WARNING
from src.modules.alerts.exceptions import (
    AlertAlreadyResolvedError,
    AlertNotFoundError,
    AlertResolutionNoteRequiredError,
)
from src.modules.alerts.models.alert import Alert
from src.modules.alerts.repository.alert_repository import AlertRepository
from src.modules.alerts.service.dtos import (
    AlertCreateDTO,
    AlertListFilters,
    AlertResolveDTO,
)
from src.modules.auth.models.user import User


class AlertService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AlertRepository(session=session)

    async def create(self, dto: AlertCreateDTO, user: User) -> Alert:
        del user  # authenticated but not stored on alert
        alert = Alert(
            linked_entity_type=dto.linked_entity_type,
            linked_entity_id=dto.linked_entity_id,
            alert_type=dto.alert_type,
            message=dto.message,
            severity=dto.severity,
            triggered_at=datetime.now(timezone.utc),
        )
        await self.repo.add(alert)
        await self.session.commit()
        await self.session.refresh(alert)
        return alert

    async def get(self, alert_id: uuid.UUID) -> Alert:
        alert = await self.repo.get_by_id(alert_id)
        if alert is None:
            raise AlertNotFoundError(str(alert_id))
        return alert

    async def resolve(
        self, alert_id: uuid.UUID, dto: AlertResolveDTO, user: User
    ) -> Alert:
        alert = await self.get(alert_id)

        if alert.resolved_at is not None:
            raise AlertAlreadyResolvedError()

        if alert.severity in (SEVERITY_WARNING, SEVERITY_CRITICAL):
            if not dto.resolution_note or not dto.resolution_note.strip():
                raise AlertResolutionNoteRequiredError()

        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = user.id
        alert.resolution_note = dto.resolution_note

        await self.repo.update(alert)
        await self.session.commit()
        await self.session.refresh(alert)
        return alert

    async def list(self, filters: AlertListFilters) -> list[Alert]:
        return await self.repo.list_filtered(
            severity=filters.severity,
            resolved=filters.resolved,
            entity_type=filters.entity_type,
            limit=min(filters.limit, 200),
            offset=filters.offset,
        )
