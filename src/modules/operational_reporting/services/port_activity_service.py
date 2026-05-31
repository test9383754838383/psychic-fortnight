import uuid
from datetime import datetime, timezone
from typing import List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.port_call import validate_port_call_exists
from src.modules.port_call.exceptions import PortCallNotFoundError
from src.modules.operational_reporting.exceptions import (
    AppendOnlyViolationError,
    InvalidEventTypeError,
    MissingCorrectionReasonError,
    MissingReferenceError,
)
from src.modules.operational_reporting.models.port_activity import (
    ActivityLog,
    PortActivity,
    PortActivityEventType,
)
from src.modules.operational_reporting.repositories.activity_log_repository import (
    ActivityLogRepository,
)
from src.modules.operational_reporting.repositories.port_activity_repository import (
    PortActivityRepository,
)

_ALLOWED_EVENT_TYPES = {e.value for e in PortActivityEventType}


class PortActivityCreateData(TypedDict, total=False):
    port_call_id: uuid.UUID
    event_type: str
    event_timestamp: datetime
    recorded_by_user_id: uuid.UUID
    notes: Optional[str]
    corrects_activity_id: Optional[uuid.UUID]
    correction_reason: Optional[str]


class ActivityLogCreateData(TypedDict):
    port_call_id: uuid.UUID
    logged_by_user_id: uuid.UUID
    narrative: str
    logged_at: datetime


class PortActivityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.activity_repo = PortActivityRepository(session)
        self.log_repo = ActivityLogRepository(session)

    async def create_event(self, data: PortActivityCreateData) -> PortActivity:
        port_call_id = data["port_call_id"]
        event_type = data["event_type"]

        # Validate port call exists
        try:
            await validate_port_call_exists(self.session, port_call_id)
        except PortCallNotFoundError:
            raise MissingReferenceError("PortCall", str(port_call_id))

        # Validate event_type
        if event_type not in _ALLOWED_EVENT_TYPES:
            raise InvalidEventTypeError(event_type)

        corrects_activity_id: Optional[uuid.UUID] = data.get("corrects_activity_id")
        correction_reason: Optional[str] = data.get("correction_reason")

        # Correction chain validation (D-LOCK-2)
        if corrects_activity_id is not None:
            if not correction_reason:
                raise MissingCorrectionReasonError()
            original = await self.activity_repo.get_one_or_none(id=corrects_activity_id)
            if not original:
                raise MissingReferenceError("PortActivity", str(corrects_activity_id))
            if original.port_call_id != port_call_id:
                raise MissingReferenceError(
                    "PortActivity (wrong port call)", str(corrects_activity_id)
                )

        now = datetime.now(timezone.utc)
        event = PortActivity(
            id=uuid.uuid4(),
            port_call_id=port_call_id,
            event_type=event_type,
            event_timestamp=data["event_timestamp"],
            recorded_by_user_id=data["recorded_by_user_id"],
            notes=data.get("notes"),
            corrects_activity_id=corrects_activity_id,
            correction_reason=correction_reason,
            created_at=now,
        )

        await self.activity_repo.add(event)
        await self.session.commit()
        await self.session.refresh(event)
        return event

    async def list_events(self, port_call_id: uuid.UUID) -> List[PortActivity]:
        return await self.activity_repo.list_for_port_call(port_call_id)

    async def add_log_entry(self, data: ActivityLogCreateData) -> ActivityLog:
        port_call_id = data["port_call_id"]

        try:
            await validate_port_call_exists(self.session, port_call_id)
        except PortCallNotFoundError:
            raise MissingReferenceError("PortCall", str(port_call_id))

        entry = ActivityLog(
            id=uuid.uuid4(),
            port_call_id=port_call_id,
            logged_by_user_id=data["logged_by_user_id"],
            narrative=data["narrative"],
            logged_at=data["logged_at"],
        )

        await self.log_repo.add(entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def list_log_entries(self, port_call_id: uuid.UUID) -> List[ActivityLog]:
        return await self.log_repo.list_for_port_call(port_call_id)

    # Append-only enforcement: no update or delete methods exist on this service.
    # Calling code that attempts mutation must use create_event / add_log_entry.
    @staticmethod
    def update_not_allowed() -> None:
        raise AppendOnlyViolationError("PortActivity/ActivityLog")
