import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models.user import User
from src.modules.delay_tracking.exceptions import (
    DelayAnchorConflictError,
    DelayLockedError,
    DelayNotFoundError,
)
from src.modules.delay_tracking.models.delay import Delay
from src.modules.delay_tracking.repository.delay_repository import DelayRepository
from src.modules.delay_tracking.service.dtos import DelayCreateDTO, DelayUpdateDTO
from src.modules.voyage_spine import validate_voyage_exists


class DelayService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = DelayRepository(session=session)

    def _validate_anchor_xor(
        self, port_call_id: uuid.UUID | None, leg_ref: str | None
    ) -> None:
        """Raise 422 if both anchors are set simultaneously."""
        if port_call_id is not None and leg_ref is not None:
            raise DelayAnchorConflictError()

    async def create(
        self,
        voyage_id: uuid.UUID,
        dto: DelayCreateDTO,
        user: User,
    ) -> Delay:
        await validate_voyage_exists(self.session, voyage_id)
        self._validate_anchor_xor(dto.port_call_id, dto.leg_ref)

        if dto.port_call_id is not None:
            from src.modules.port_call import validate_port_call_exists

            await validate_port_call_exists(self.session, dto.port_call_id)

        delay = Delay(
            voyage_id=voyage_id,
            port_call_id=dto.port_call_id,
            leg_ref=dto.leg_ref,
            delay_type=dto.delay_type,
            fault_attribution=dto.fault_attribution,
            start_datetime=dto.start_datetime,
            end_datetime=dto.end_datetime,
            claimed_duration=dto.claimed_duration,
            description=dto.description,
            recorded_by=user.id,
            approved_by=None,
        )
        await self.repo.add(delay)
        await self.session.commit()
        await self.session.refresh(delay)
        return delay

    async def get(self, delay_id: uuid.UUID) -> Delay:
        delay = await self.repo.get_one_or_none(id=delay_id)
        if delay is None:
            raise DelayNotFoundError(str(delay_id))
        return delay

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[Delay]:
        await validate_voyage_exists(self.session, voyage_id)
        return await self.repo.list_for_voyage(voyage_id)

    async def update(
        self,
        delay_id: uuid.UUID,
        dto: DelayUpdateDTO,
        user: User,
    ) -> Delay:
        del user
        delay = await self.get(delay_id)

        if delay.approved_by is not None:
            raise DelayLockedError()

        # Validate anchor XOR using updated values (fall back to existing)
        new_port_call_id = (
            dto.port_call_id if dto.port_call_id is not None else delay.port_call_id
        )
        new_leg_ref = dto.leg_ref if dto.leg_ref is not None else delay.leg_ref
        self._validate_anchor_xor(new_port_call_id, new_leg_ref)

        if dto.delay_type is not None:
            delay.delay_type = dto.delay_type
        if dto.fault_attribution is not None:
            delay.fault_attribution = dto.fault_attribution
        if dto.start_datetime is not None:
            delay.start_datetime = dto.start_datetime
        if dto.end_datetime is not None:
            delay.end_datetime = dto.end_datetime
        if dto.claimed_duration is not None:
            delay.claimed_duration = dto.claimed_duration
        if dto.description is not None:
            delay.description = dto.description
        if dto.port_call_id is not None:
            delay.port_call_id = dto.port_call_id
        if dto.leg_ref is not None:
            delay.leg_ref = dto.leg_ref

        await self.repo.update(delay)
        await self.session.commit()
        await self.session.refresh(delay)
        return delay

    async def approve(self, delay_id: uuid.UUID, user: User) -> Delay:
        delay = await self.get(delay_id)
        delay.approved_by = user.id
        await self.repo.update(delay)
        await self.session.commit()
        await self.session.refresh(delay)
        return delay
