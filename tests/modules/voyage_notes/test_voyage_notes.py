"""M11 Voyage Notes — TDD tests.

Covers: CRUD, category/priority validation, author-only enforcement,
attachment upload (size + type validation, cascade delete), API layer,
unauthenticated rejection.
"""
import io
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_notes.models.note import NoteCategory, NotePriority, VoyageNote
from src.modules.voyage_notes.services.note_service import (
    AttachmentTooLargeError,
    AttachmentTypeNotAllowedError,
    NoteNotAuthorizedError,
    NoteNotFoundError,
    VoyageNoteService,
)
from tests.modules.port_call.conftest import VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


# ── helpers ───────────────────────────────────────────────────────────────────

async def _setup(session: AsyncSession) -> VoyageNote:
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()
    return voyage  # type: ignore[return-value]


async def _make_user(session: AsyncSession):  # type: ignore[return-value]
    from src.modules.auth.services.auth_service import AuthService
    return await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )


def _pdf_upload(name: str = "test.pdf", size: int = 100) -> object:
    from unittest.mock import AsyncMock, MagicMock
    f = MagicMock()
    f.filename = name
    f.content_type = "application/pdf"
    f.read = AsyncMock(return_value=b"%" + b"x" * (size - 1))
    return f


def _big_upload(size: int) -> object:
    from unittest.mock import AsyncMock, MagicMock
    f = MagicMock()
    f.filename = "huge.pdf"
    f.content_type = "application/pdf"
    f.read = AsyncMock(return_value=b"x" * size)
    return f


def _bad_type_upload() -> object:
    from unittest.mock import AsyncMock, MagicMock
    f = MagicMock()
    f.filename = "virus.exe"
    f.content_type = "application/x-msdownload"
    f.read = AsyncMock(return_value=b"MZ" + b"\x00" * 10)
    return f


# ── NoteCategory / NotePriority constants ────────────────────────────────────

def test_note_category_values() -> None:
    assert NoteCategory.OPERATIONAL.value == "Operational"
    assert NoteCategory.COMMERCIAL.value == "Commercial"
    assert NoteCategory.SAFETY.value == "Safety"
    assert NoteCategory.AGENT.value == "Agent"


def test_note_priority_values() -> None:
    assert NotePriority.LOW.value == "Low"
    assert NotePriority.NORMAL.value == "Normal"
    assert NotePriority.HIGH.value == "High"


# ── Service: create & get ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_note_defaults(session: AsyncSession) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)

    note = await svc.create(
        voyage_id=voyage.id,
        body="Departure delayed 4h due to weather.",
        author_user_id=user.id,
    )

    assert note.id is not None
    assert note.voyage_id == voyage.id
    assert note.body == "Departure delayed 4h due to weather."
    assert note.category == NoteCategory.OPERATIONAL.value
    assert note.priority == NotePriority.NORMAL.value
    assert note.author_user_id == user.id


@pytest.mark.asyncio
async def test_create_note_with_explicit_fields(session: AsyncSession) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)

    note = await svc.create(
        voyage_id=voyage.id,
        body="Contract amendment",
        author_user_id=user.id,
        category=NoteCategory.COMMERCIAL.value,
        priority=NotePriority.HIGH.value,
    )

    assert note.category == NoteCategory.COMMERCIAL.value
    assert note.priority == NotePriority.HIGH.value


@pytest.mark.asyncio
async def test_get_not_found_raises(session: AsyncSession) -> None:
    svc = VoyageNoteService(session)
    with pytest.raises(NoteNotFoundError):
        await svc.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_list_for_voyage_newest_first(session: AsyncSession) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)

    await svc.create(voyage.id, "First note", user.id)
    await svc.create(voyage.id, "Second note", user.id)

    notes = await svc.list_for_voyage(voyage.id)
    assert len(notes) == 2
    # Newest first
    assert notes[0].body == "Second note"
    assert notes[1].body == "First note"


# ── Service: update ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_by_author_succeeds(session: AsyncSession) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)

    note = await svc.create(voyage.id, "Original", user.id)
    updated = await svc.update(note.id, user.id, body="Updated body")

    assert updated.body == "Updated body"


@pytest.mark.asyncio
async def test_update_by_non_author_raises(session: AsyncSession) -> None:
    voyage = await _setup(session)
    author = await _make_user(session)
    other = await _make_user(session)
    svc = VoyageNoteService(session)

    note = await svc.create(voyage.id, "Author only", author.id)

    with pytest.raises(NoteNotAuthorizedError):
        await svc.update(note.id, other.id, body="Hack")


# ── Service: delete ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_by_author_succeeds(session: AsyncSession) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)

    note = await svc.create(voyage.id, "To be deleted", user.id)
    await svc.delete(note.id, user.id)

    with pytest.raises(NoteNotFoundError):
        await svc.get(note.id)


@pytest.mark.asyncio
async def test_delete_by_non_author_raises(session: AsyncSession) -> None:
    voyage = await _setup(session)
    author = await _make_user(session)
    other = await _make_user(session)
    svc = VoyageNoteService(session)

    note = await svc.create(voyage.id, "Protected", author.id)

    with pytest.raises(NoteNotAuthorizedError):
        await svc.delete(note.id, other.id)


# ── Service: attachments ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_attachment_stores_file(session: AsyncSession, tmp_path, monkeypatch) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    note = await svc.create(voyage.id, "Has attachment", user.id)
    upload = _pdf_upload(size=200)
    att = await svc.add_attachment(note.id, upload, user.id)  # type: ignore[arg-type]

    assert att.id is not None
    assert att.note_id == note.id
    assert att.filename == "test.pdf"
    assert att.content_type == "application/pdf"
    assert att.size_bytes == 200
    # File must exist on disk
    from pathlib import Path
    assert Path(att.stored_path).exists()


@pytest.mark.asyncio
async def test_upload_too_large_raises(session: AsyncSession, tmp_path, monkeypatch) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_MAX_BYTES", 100)

    note = await svc.create(voyage.id, "Note", user.id)
    upload = _big_upload(size=101)

    with pytest.raises(AttachmentTooLargeError):
        await svc.add_attachment(note.id, upload, user.id)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_upload_disallowed_type_raises(session: AsyncSession, tmp_path, monkeypatch) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    note = await svc.create(voyage.id, "Note", user.id)
    upload = _bad_type_upload()

    with pytest.raises(AttachmentTypeNotAllowedError):
        await svc.add_attachment(note.id, upload, user.id)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_delete_attachment_removes_file(session: AsyncSession, tmp_path, monkeypatch) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    note = await svc.create(voyage.id, "Note", user.id)
    upload = _pdf_upload(size=50)
    att = await svc.add_attachment(note.id, upload, user.id)  # type: ignore[arg-type]

    from pathlib import Path
    path = att.stored_path
    assert Path(path).exists()

    await svc.delete_attachment(att.id, user.id)

    assert not Path(path).exists()


@pytest.mark.asyncio
async def test_delete_attachment_by_non_author_raises(session: AsyncSession, tmp_path, monkeypatch) -> None:
    voyage = await _setup(session)
    author = await _make_user(session)
    other = await _make_user(session)
    svc = VoyageNoteService(session)
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    note = await svc.create(voyage.id, "Note", author.id)
    upload = _pdf_upload(size=50)
    att = await svc.add_attachment(note.id, upload, author.id)  # type: ignore[arg-type]

    with pytest.raises(NoteNotAuthorizedError):
        await svc.delete_attachment(att.id, other.id)


@pytest.mark.asyncio
async def test_delete_note_cascades_files(session: AsyncSession, tmp_path, monkeypatch) -> None:
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageNoteService(session)
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    note = await svc.create(voyage.id, "Note with file", user.id)
    upload = _pdf_upload(size=50)
    att = await svc.add_attachment(note.id, upload, user.id)  # type: ignore[arg-type]

    from pathlib import Path
    path = att.stored_path
    assert Path(path).exists()

    await svc.delete(note.id, user.id)

    assert not Path(path).exists()
    with pytest.raises(NoteNotFoundError):
        await svc.get(note.id)


# ── API tests ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_create_list_get(client: AsyncClient, session: AsyncSession) -> None:
    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "Port agent confirmed", "category": "Agent", "priority": "High"},
    )
    assert resp.status_code == 201
    data = resp.json()
    note_id = data["id"]
    assert data["body"] == "Port agent confirmed"
    assert data["category"] == "Agent"
    assert data["priority"] == "High"

    resp = await client.get(f"/api/v1/voyages/{voyage.id}/notes")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.get(f"/api/v1/notes/{note_id}")
    assert resp.status_code == 200
    assert resp.json()["body"] == "Port agent confirmed"


@pytest.mark.asyncio
async def test_api_update_note(client: AsyncClient, session: AsyncSession) -> None:
    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "Initial", "category": "Operational", "priority": "Normal"},
    )
    note_id = resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/notes/{note_id}",
        json={"body": "Updated", "priority": "High"},
    )
    assert resp.status_code == 200
    assert resp.json()["body"] == "Updated"
    assert resp.json()["priority"] == "High"


@pytest.mark.asyncio
async def test_api_delete_note(client: AsyncClient, session: AsyncSession) -> None:
    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "Delete me", "category": "Safety", "priority": "Low"},
    )
    note_id = resp.json()["id"]

    resp = await client.delete(f"/api/v1/notes/{note_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/notes/{note_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_api_attachment_upload_download_delete(
    client: AsyncClient, session: AsyncSession, tmp_path, monkeypatch
) -> None:
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "Has attachment", "category": "Operational", "priority": "Normal"},
    )
    note_id = resp.json()["id"]

    pdf_bytes = b"%PDF-1.4 test content"
    resp = await client.post(
        f"/api/v1/notes/{note_id}/attachments",
        files={"file": ("report.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 201
    att = resp.json()
    att_id = att["id"]
    assert att["filename"] == "report.pdf"
    assert att["content_type"] == "application/pdf"
    assert att["size_bytes"] == len(pdf_bytes)

    resp = await client.get(f"/api/v1/attachments/{att_id}")
    assert resp.status_code == 200
    assert resp.content == pdf_bytes
    assert "attachment" in resp.headers["content-disposition"]

    resp = await client.delete(f"/api/v1/attachments/{att_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/attachments/{att_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_api_attachment_oversize_returns_413(
    client: AsyncClient, session: AsyncSession, tmp_path, monkeypatch
) -> None:
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_MAX_BYTES", 10)

    voyage = await _setup(session)
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "x", "category": "Operational", "priority": "Normal"},
    )
    note_id = resp.json()["id"]

    resp = await client.post(
        f"/api/v1/notes/{note_id}/attachments",
        files={"file": ("big.pdf", io.BytesIO(b"x" * 20), "application/pdf")},
    )
    assert resp.status_code == 413


@pytest.mark.asyncio
async def test_api_attachment_bad_type_returns_415(
    client: AsyncClient, session: AsyncSession, tmp_path, monkeypatch
) -> None:
    monkeypatch.setattr("src.modules.voyage_notes.services.note_service.settings.UPLOAD_DIR", str(tmp_path))

    voyage = await _setup(session)
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "x", "category": "Operational", "priority": "Normal"},
    )
    note_id = resp.json()["id"]

    resp = await client.post(
        f"/api/v1/notes/{note_id}/attachments",
        files={"file": ("virus.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
    )
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_api_non_author_update_returns_403(
    client: AsyncClient, session: AsyncSession
) -> None:
    voyage = await _setup(session)

    # Create note as the test user (e2e session user)
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/notes",
        json={"body": "Mine", "category": "Operational", "priority": "Normal"},
    )
    note_id = resp.json()["id"]

    # Replace author_user_id with a different real user so FK constraint is satisfied
    other = await _make_user(session)
    from src.modules.voyage_notes.services.note_service import VoyageNoteService as Svc
    svc = Svc(session)
    note = await svc.get(uuid.UUID(note_id))
    note.author_user_id = other.id
    await session.commit()

    resp = await client.patch(f"/api/v1/notes/{note_id}", json={"body": "Hacked"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_notes_fail(unauthenticated_client: AsyncClient) -> None:
    r = await unauthenticated_client.get(f"/api/v1/voyages/{uuid.uuid4()}/notes")
    assert r.status_code == 401
