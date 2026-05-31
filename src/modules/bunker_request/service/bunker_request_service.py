import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models.user import User
from src.modules.bunker_request.constants import (
    LEGAL_TRANSITIONS,
    STATUS_BLOCKED,
    STATUS_SUPPLIED,
    STATUS_RAISED,
)
from src.modules.bunker_request.exceptions import (
    BlockerNoteRequiredError,
    BunkerRequestNotFoundError,
    BunkerRequestTerminalError,
    IllegalTransitionError,
)
from src.modules.bunker_request.models.bunker_request import BunkerRequest
from src.modules.bunker_request.repository.bunker_request_repository import (
    BunkerRequestRepository,
)
from src.modules.bunker_request.service.dtos import (
    BunkerRequestCreateDTO,
    BunkerRequestUpdateDTO,
)
from src.modules.voyage_spine import validate_voyage_exists


class BunkerRequestService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = BunkerRequestRepository(session=session)

    async def create(
        self,
        voyage_id: uuid.UUID,
        dto: BunkerRequestCreateDTO,
        user: User,
    ) -> BunkerRequest:
        await validate_voyage_exists(self.session, voyage_id)

        if dto.port_call_id is not None:
            from src.modules.port_call import validate_port_call_exists

            await validate_port_call_exists(self.session, dto.port_call_id)

        br = BunkerRequest(
            voyage_id=voyage_id,
            port_call_id=dto.port_call_id,
            fuel_type=dto.fuel_type,
            quantity_required_mt=dto.quantity_required_mt,
            specification_grade=dto.specification_grade,
            max_sulphur_content=dto.max_sulphur_content,
            status=STATUS_RAISED,
            blocker_note=None,
            raised_by=user.id,
            raised_at=datetime.now(timezone.utc),
            supplier_id=dto.supplier_id,
            eta_supply=dto.eta_supply,
        )
        await self.repo.add(br)
        await self.session.commit()
        await self.session.refresh(br)
        return br

    async def get(self, bunker_request_id: uuid.UUID) -> BunkerRequest:
        br = await self.repo.get_one_or_none(id=bunker_request_id)
        if br is None:
            raise BunkerRequestNotFoundError(str(bunker_request_id))
        return br

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[BunkerRequest]:
        await validate_voyage_exists(self.session, voyage_id)
        return await self.repo.list_for_voyage(voyage_id)

    async def transition(
        self,
        bunker_request_id: uuid.UUID,
        target: str,
        user: User,
        blocker_note: str | None = None,
    ) -> BunkerRequest:
        br = await self.get(bunker_request_id)

        allowed = LEGAL_TRANSITIONS.get(br.status, ())
        if target not in allowed:
            raise IllegalTransitionError(br.status, target)

        if target == STATUS_BLOCKED:
            if not blocker_note:
                raise BlockerNoteRequiredError()
            br.blocker_note = blocker_note
        else:
            # Unblocking or normal forward transition — clear blocker note
            br.blocker_note = None

        br.status = target
        await self.repo.update(br)
        await self.session.commit()
        await self.session.refresh(br)
        return br

    async def update(
        self,
        bunker_request_id: uuid.UUID,
        dto: BunkerRequestUpdateDTO,
        user: User,
    ) -> BunkerRequest:
        del user
        br = await self.get(bunker_request_id)

        if br.status == STATUS_SUPPLIED:
            raise BunkerRequestTerminalError()

        if dto.quantity_required_mt is not None:
            br.quantity_required_mt = dto.quantity_required_mt
        if dto.specification_grade is not None:
            br.specification_grade = dto.specification_grade
        if dto.max_sulphur_content is not None:
            br.max_sulphur_content = dto.max_sulphur_content
        if dto.supplier_id is not None:
            br.supplier_id = dto.supplier_id
        if dto.eta_supply is not None:
            br.eta_supply = dto.eta_supply

        await self.repo.update(br)
        await self.session.commit()
        await self.session.refresh(br)
        return br
