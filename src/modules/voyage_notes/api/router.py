import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.voyage_notes.models.note import NoteAttachment, VoyageNote
from src.modules.voyage_notes.services.note_service import VoyageNoteService


# ── DTOs ──────────────────────────────────────────────────────────────────────

class NoteAttachmentReadDTO(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    uploaded_by: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class VoyageNoteReadDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    body: str
    category: str
    priority: str
    author_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    attachments: list[NoteAttachmentReadDTO] = []
    model_config = ConfigDict(from_attributes=True)


class NoteCreateBody(BaseModel):
    body: str
    category: str = "Operational"
    priority: str = "Normal"


class NoteUpdateBody(BaseModel):
    body: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None


def _dto(note: VoyageNote) -> VoyageNoteReadDTO:
    return VoyageNoteReadDTO.model_validate(note)


def _att_dto(att: NoteAttachment) -> NoteAttachmentReadDTO:
    return NoteAttachmentReadDTO.model_validate(att)


# ── routers ───────────────────────────────────────────────────────────────────

voyage_router = APIRouter(prefix="/voyages/{voyage_id}/notes")
member_router = APIRouter(prefix="/notes")
attachment_router = APIRouter(prefix="/attachments")


@voyage_router.get("", response_model=list[VoyageNoteReadDTO], tags=["voyage-notes"])
async def list_notes(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[VoyageNoteReadDTO]:
    del current_user
    svc = VoyageNoteService(session)
    return [_dto(n) for n in await svc.list_for_voyage(voyage_id)]


@voyage_router.post(
    "", response_model=VoyageNoteReadDTO,
    status_code=status.HTTP_201_CREATED, tags=["voyage-notes"]
)
async def create_note(
    voyage_id: uuid.UUID,
    body: NoteCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageNoteReadDTO:
    svc = VoyageNoteService(session)
    note = await svc.create(
        voyage_id=voyage_id,
        body=body.body,
        author_user_id=current_user.id,
        category=body.category,
        priority=body.priority,
    )
    return _dto(note)


@member_router.get("/{note_id}", response_model=VoyageNoteReadDTO, tags=["voyage-notes"])
async def get_note(
    note_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageNoteReadDTO:
    del current_user
    svc = VoyageNoteService(session)
    return _dto(await svc.get(note_id))


@member_router.patch("/{note_id}", response_model=VoyageNoteReadDTO, tags=["voyage-notes"])
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageNoteReadDTO:
    svc = VoyageNoteService(session)
    note = await svc.update(
        note_id=note_id,
        requesting_user_id=current_user.id,
        body=body.body,
        category=body.category,
        priority=body.priority,
    )
    return _dto(note)


@member_router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["voyage-notes"])
async def delete_note(
    note_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    svc = VoyageNoteService(session)
    await svc.delete(note_id=note_id, requesting_user_id=current_user.id)


@member_router.post(
    "/{note_id}/attachments",
    response_model=NoteAttachmentReadDTO,
    status_code=status.HTTP_201_CREATED,
    tags=["voyage-notes"],
)
async def upload_attachment(
    note_id: uuid.UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> NoteAttachmentReadDTO:
    svc = VoyageNoteService(session)
    att = await svc.add_attachment(
        note_id=note_id,
        upload=file,
        uploader_user_id=current_user.id,
    )
    return _att_dto(att)


@attachment_router.get("/{att_id}", tags=["voyage-notes"])
async def download_attachment(
    att_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    del current_user
    svc = VoyageNoteService(session)
    att = await svc.get_attachment(att_id)
    data = svc.read_attachment_bytes(att)
    safe_name = att.filename.replace('"', "_")
    return Response(
        content=data,
        media_type=att.content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@attachment_router.delete(
    "/{att_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["voyage-notes"]
)
async def delete_attachment(
    att_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    svc = VoyageNoteService(session)
    await svc.delete_attachment(att_id=att_id, requesting_user_id=current_user.id)
