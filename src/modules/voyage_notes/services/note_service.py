"""Voyage Notes service — CRUD, file pipeline, author-only mutation."""
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.exceptions import DomainError
from src.modules.voyage_notes.models.note import (
    NoteAttachment,
    NoteCategory,
    NotePriority,
    VoyageNote,
)
from src.modules.voyage_notes.repositories.note_repository import (
    NoteAttachmentRepository,
    VoyageNoteRepository,
)
from src.modules.voyage_spine import validate_voyage_exists


# ── exceptions ────────────────────────────────────────────────────────────────

class NoteNotFoundError(DomainError):
    def __init__(self, note_id: str) -> None:
        super().__init__(f"Voyage note {note_id} not found", code="NOT_FOUND", status_code=404)


class AttachmentNotFoundError(DomainError):
    def __init__(self, att_id: str) -> None:
        super().__init__(f"Attachment {att_id} not found", code="NOT_FOUND", status_code=404)


class NoteNotAuthorizedError(DomainError):
    def __init__(self) -> None:
        super().__init__(
            "Only the note author may modify or delete this note",
            code="NOT_AUTHORIZED",
            status_code=http_status.HTTP_403_FORBIDDEN,
        )


class AttachmentTooLargeError(DomainError):
    def __init__(self, size: int, limit: int) -> None:
        super().__init__(
            f"Attachment size {size} bytes exceeds the {limit}-byte limit",
            code="ATTACHMENT_TOO_LARGE",
            status_code=http_status.HTTP_413_CONTENT_TOO_LARGE,
        )


class AttachmentTypeNotAllowedError(DomainError):
    def __init__(self, content_type: str) -> None:
        super().__init__(
            f"Content type {content_type!r} is not allowed",
            code="ATTACHMENT_TYPE_NOT_ALLOWED",
            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )


# ── helpers ───────────────────────────────────────────────────────────────────

def _upload_dir(note_id: uuid.UUID) -> Path:
    p = Path(settings.UPLOAD_DIR) / str(note_id)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _safe_ext(filename: str) -> str:
    """Return the file extension, defaulting to empty string."""
    _, ext = os.path.splitext(filename)
    return ext.lower()


# ── service ───────────────────────────────────────────────────────────────────

class VoyageNoteService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = VoyageNoteRepository(session=session)
        self.att_repo = NoteAttachmentRepository(session=session)

    # ── get / list ────────────────────────────────────────────────────────────

    async def get(self, note_id: uuid.UUID) -> VoyageNote:
        note = await self.repo.get_one_or_none(id=note_id)
        if not note:
            raise NoteNotFoundError(str(note_id))
        return note

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[VoyageNote]:
        return await self.repo.list_for_voyage(voyage_id)

    async def get_attachment(self, att_id: uuid.UUID) -> NoteAttachment:
        att = await self.att_repo.get_one_or_none(id=att_id)
        if not att:
            raise AttachmentNotFoundError(str(att_id))
        return att

    # ── create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        voyage_id: uuid.UUID,
        body: str,
        author_user_id: uuid.UUID,
        category: str = NoteCategory.OPERATIONAL.value,
        priority: str = NotePriority.NORMAL.value,
    ) -> VoyageNote:
        await validate_voyage_exists(self.session, voyage_id)
        note = VoyageNote(
            voyage_id=voyage_id,
            body=body,
            category=category,
            priority=priority,
            author_user_id=author_user_id,
        )
        await self.repo.add(note)
        await self.session.commit()
        await self.session.refresh(note)
        return note

    # ── update ────────────────────────────────────────────────────────────────

    async def update(
        self,
        note_id: uuid.UUID,
        requesting_user_id: uuid.UUID,
        body: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> VoyageNote:
        note = await self.get(note_id)
        if note.author_user_id != requesting_user_id:
            raise NoteNotAuthorizedError()
        if body is not None:
            note.body = body
        if category is not None:
            note.category = category
        if priority is not None:
            note.priority = priority
        await self.repo.update(note)
        await self.session.commit()
        await self.session.refresh(note)
        return note

    # ── delete ────────────────────────────────────────────────────────────────

    async def delete(self, note_id: uuid.UUID, requesting_user_id: uuid.UUID) -> None:
        note = await self.get(note_id)
        if note.author_user_id != requesting_user_id:
            raise NoteNotAuthorizedError()
        # Explicitly load attachments so we have their paths before cascade delete
        atts = await self.att_repo.list_for_note(note_id)
        paths = [att.stored_path for att in atts]
        await self.repo.delete(note.id)
        await self.session.commit()
        # Remove files after commit — if this partially fails, files are orphaned
        # but data integrity is preserved.
        for path in paths:
            _remove_file(path)

    # ── attachments ───────────────────────────────────────────────────────────

    async def add_attachment(
        self,
        note_id: uuid.UUID,
        upload: UploadFile,
        uploader_user_id: uuid.UUID,
    ) -> NoteAttachment:
        # Validate note exists (no author check — any authenticated user can attach)
        await self.get(note_id)

        content_type = upload.content_type or ""
        if content_type not in settings.UPLOAD_ALLOWED_TYPES:
            raise AttachmentTypeNotAllowedError(content_type)

        data = await upload.read()
        if len(data) > settings.UPLOAD_MAX_BYTES:
            raise AttachmentTooLargeError(len(data), settings.UPLOAD_MAX_BYTES)

        # Store with a generated name so client filenames can't escape the dir
        stored_name = str(uuid.uuid4()) + _safe_ext(upload.filename or "")
        dir_path = _upload_dir(note_id)
        stored_path = str(dir_path / stored_name)
        Path(stored_path).write_bytes(data)

        att = NoteAttachment(
            note_id=note_id,
            filename=upload.filename or stored_name,
            stored_path=stored_path,
            content_type=content_type,
            size_bytes=len(data),
            uploaded_by=uploader_user_id,
        )
        await self.att_repo.add(att)
        await self.session.commit()
        await self.session.refresh(att)
        return att

    async def delete_attachment(
        self,
        att_id: uuid.UUID,
        requesting_user_id: uuid.UUID,
    ) -> None:
        att = await self.get_attachment(att_id)
        note = await self.get(att.note_id)
        if note.author_user_id != requesting_user_id:
            raise NoteNotAuthorizedError()
        stored_path = att.stored_path
        await self.att_repo.delete(att.id)
        await self.session.commit()
        _remove_file(stored_path)

    def read_attachment_bytes(self, att: NoteAttachment) -> bytes:
        return Path(att.stored_path).read_bytes()


def _remove_file(path: str) -> None:
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass
