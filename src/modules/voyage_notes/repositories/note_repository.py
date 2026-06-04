import uuid

from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from sqlalchemy import select

from src.modules.voyage_notes.models.note import NoteAttachment, VoyageNote


class VoyageNoteRepository(SQLAlchemyAsyncRepository[VoyageNote]):
    model_type = VoyageNote

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[VoyageNote]:
        stmt = (
            select(VoyageNote)
            .where(VoyageNote.voyage_id == voyage_id)
            .order_by(VoyageNote.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class NoteAttachmentRepository(SQLAlchemyAsyncRepository[NoteAttachment]):
    model_type = NoteAttachment

    async def list_for_note(self, note_id: uuid.UUID) -> list[NoteAttachment]:
        stmt = (
            select(NoteAttachment)
            .where(NoteAttachment.note_id == note_id)
            .order_by(NoteAttachment.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
