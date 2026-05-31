import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models.user import User
from src.modules.checklists.constants import (
    CHECKLIST_STATUS_COMPLETED,
    CHECKLIST_STATUS_OPEN,
    DEFAULT_ITEMS,
    ITEM_STATUS_PENDING,
    ITEM_STATUS_SIGNED_OFF,
)
from src.modules.checklists.exceptions import (
    ChecklistItemNotFoundError,
    ChecklistNotFoundError,
    InvalidChecklistTypeError,
)
from src.modules.checklists.models import Checklist, ChecklistItem
from src.modules.checklists.repository import (
    ChecklistItemRepository,
    ChecklistRepository,
)
from src.modules.port_call import validate_port_call_exists


class ChecklistService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.checklist_repo = ChecklistRepository(session=session)
        self.item_repo = ChecklistItemRepository(session=session)

    async def create(
        self, port_call_id: uuid.UUID, checklist_type: str, user: User
    ) -> Checklist:
        del user

        if checklist_type not in DEFAULT_ITEMS:
            raise InvalidChecklistTypeError(checklist_type)

        await validate_port_call_exists(self.session, port_call_id)

        checklist = Checklist(
            port_call_id=port_call_id,
            checklist_type=checklist_type,
            status=CHECKLIST_STATUS_OPEN,
            created_at=datetime.now(timezone.utc),
            items=[
                ChecklistItem(
                    sequence_no=index,
                    item_name=item_name,
                    status=ITEM_STATUS_PENDING,
                )
                for index, item_name in enumerate(
                    DEFAULT_ITEMS[checklist_type], start=1
                )
            ],
        )
        await self.checklist_repo.add(checklist)

        await self.session.commit()
        return checklist

    async def sign_off(self, item_id: uuid.UUID, user: User) -> ChecklistItem:
        item = await self.item_repo.get_one_or_none(id=item_id)
        if item is None:
            raise ChecklistItemNotFoundError(str(item_id))

        if item.status == ITEM_STATUS_SIGNED_OFF:
            await self.session.commit()
            return item

        item.status = ITEM_STATUS_SIGNED_OFF
        item.signed_off_at = datetime.now(timezone.utc)
        item.signed_off_by = user.id
        await self.item_repo.update(item)

        checklist = await self.checklist_repo.get_one_or_none(id=item.checklist_id)
        if (
            checklist is not None
            and await self.checklist_repo.has_pending_items(item.checklist_id) is False
        ):
            checklist.status = CHECKLIST_STATUS_COMPLETED
            await self.checklist_repo.update(checklist)

        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def list_by_port_call(self, port_call_id: uuid.UUID) -> list[Checklist]:
        await validate_port_call_exists(self.session, port_call_id)
        return await self.checklist_repo.list_for_port_call(port_call_id)

    async def get_one(self, checklist_id: uuid.UUID) -> Checklist:
        checklist = await self.checklist_repo.get_with_items(checklist_id)
        if checklist is None:
            raise ChecklistNotFoundError(str(checklist_id))
        return checklist
