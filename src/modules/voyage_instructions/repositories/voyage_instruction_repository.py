import uuid
from typing import Optional

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.voyage_instructions.models.voyage_instruction import (
    InstructionTemplate,
    VoyageInstruction,
)


class VoyageInstructionRepository(SQLAlchemyAsyncRepository[VoyageInstruction]):
    model_type = VoyageInstruction

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[VoyageInstruction]:
        stmt = (
            select(VoyageInstruction)
            .where(VoyageInstruction.voyage_id == voyage_id)
            .order_by(VoyageInstruction.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class InstructionTemplateRepository(SQLAlchemyAsyncRepository[InstructionTemplate]):
    model_type = InstructionTemplate

    async def list_all(self) -> list[InstructionTemplate]:
        stmt = select(InstructionTemplate).order_by(InstructionTemplate.name)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, template_id: uuid.UUID) -> Optional[InstructionTemplate]:
        stmt = select(InstructionTemplate).where(InstructionTemplate.id == template_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
