"""M9 Voyage Instructions — TDD tests.

Covers: lifecycle transitions, illegal-transition rejection, HTML sanitization
(XSS path), template prefill, PDF export, list/get, unauthenticated rejection.
"""
import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.voyage_instructions.models.voyage_instruction import (
    InstructionStatus,
    VoyageInstruction,
)
from src.modules.voyage_instructions.services.voyage_instruction_service import (
    VoyageInstructionService,
    IllegalInstructionTransitionError,
    InstructionNotEditableError,
    InstructionNotFoundError,
)
from src.modules.voyage_instructions.services.html_sanitizer import sanitize_html
from tests.modules.port_call.conftest import VesselFactory
from tests.modules.voyage_spine.conftest import VoyageFactory


# ── helpers ──────────────────────────────────────────────────────────────────

async def _setup(session: AsyncSession):
    vessel = VesselFactory.build()
    session.add(vessel)
    await session.flush()
    voyage = VoyageFactory.build(vessel_ref=vessel.id)
    session.add(voyage)
    await session.commit()
    return voyage


async def _make_user(session: AsyncSession):
    from src.modules.auth.services.auth_service import AuthService
    return await AuthService(session).create_user(
        f"u_{uuid.uuid4().hex[:8]}", "pass", []
    )


# ── sanitizer unit tests ───────────────────────────────────────────────────────

def test_sanitize_strips_script_tags():
    html = '<p>Hello</p><script>alert("xss")</script>'
    result = sanitize_html(html)
    assert "<script>" not in result
    assert "alert" not in result
    assert "<p>Hello</p>" in result


def test_sanitize_strips_event_handlers():
    html = '<p onclick="evil()">Click me</p>'
    result = sanitize_html(html)
    assert "onclick" not in result
    assert "evil" not in result


def test_sanitize_strips_style_tags():
    html = "<style>body{display:none}</style><p>Safe</p>"
    result = sanitize_html(html)
    assert "<style>" not in result
    assert "<p>Safe</p>" in result


def test_sanitize_strips_javascript_href():
    html = '<a href="javascript:alert(1)">link</a>'
    result = sanitize_html(html)
    assert "javascript:" not in result


def test_sanitize_preserves_allowed_tags():
    html = "<h1>Title</h1><p>Para</p><ul><li>Item</li></ul><strong>Bold</strong>"
    result = sanitize_html(html)
    assert "<h1>" in result
    assert "<p>" in result
    assert "<li>" in result
    assert "<strong>" in result


def test_sanitize_empty_string():
    assert sanitize_html("") == ""


# ── InstructionStatus constants ────────────────────────────────────────────────

def test_instruction_status_values():
    assert InstructionStatus.DRAFT.value == "draft"
    assert InstructionStatus.APPROVED.value == "approved"
    assert InstructionStatus.SENT.value == "sent"


# ── Service: create & get ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_instruction_defaults_to_draft(session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(
        voyage_id=voyage.id,
        title="Test Instructions",
        body_html="<p>Test content</p>",
    )

    assert instr.id is not None
    assert instr.voyage_id == voyage.id
    assert instr.title == "Test Instructions"
    assert instr.status == InstructionStatus.DRAFT.value
    assert instr.approved_at is None
    assert instr.sent_at is None
    # Body stored as discriminated JSON
    assert instr.body["format"] == "html"
    assert "<p>Test content</p>" in instr.body["content"]


@pytest.mark.asyncio
async def test_create_sanitizes_xss_on_save(session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(
        voyage_id=voyage.id,
        title="XSS Test",
        body_html='<p>Safe</p><script>alert("xss")</script>',
    )

    assert "<script>" not in instr.body["content"]
    assert "<p>Safe</p>" in instr.body["content"]


@pytest.mark.asyncio
async def test_get_not_found_raises(session: AsyncSession):
    svc = VoyageInstructionService(session)
    with pytest.raises(InstructionNotFoundError):
        await svc.get(uuid.uuid4())


@pytest.mark.asyncio
async def test_list_for_voyage(session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)

    await svc.create(voyage.id, "Instruction A", "<p>A</p>")
    await svc.create(voyage.id, "Instruction B", "<p>B</p>")

    results = await svc.list_for_voyage(voyage.id)
    assert len(results) == 2
    titles = {r.title for r in results}
    assert titles == {"Instruction A", "Instruction B"}


# ── Service: update ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_draft_succeeds(session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Original", "<p>Original</p>")
    updated = await svc.update(
        instr.id,
        title="Updated",
        body_html="<p>Updated content</p>",
    )

    assert updated.title == "Updated"
    assert "Updated content" in updated.body["content"]


@pytest.mark.asyncio
async def test_update_approved_raises(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Doc", "<p>Body</p>")
    await svc.approve(instr.id, user)

    with pytest.raises(InstructionNotEditableError):
        await svc.update(instr.id, title="Hack")


# ── Service: lifecycle transitions ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_approve_transitions_draft_to_approved(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Doc", "<p>Body</p>")
    approved = await svc.approve(instr.id, user)

    assert approved.status == InstructionStatus.APPROVED.value
    assert approved.approved_by == user.id
    assert approved.approved_at is not None


@pytest.mark.asyncio
async def test_send_transitions_approved_to_sent(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Doc", "<p>Body</p>")
    await svc.approve(instr.id, user)
    sent = await svc.send(instr.id, user)

    assert sent.status == InstructionStatus.SENT.value
    assert sent.sent_by == user.id
    assert sent.sent_at is not None


@pytest.mark.asyncio
async def test_cannot_send_draft_directly(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Doc", "<p>Body</p>")
    with pytest.raises(IllegalInstructionTransitionError):
        await svc.send(instr.id, user)


@pytest.mark.asyncio
async def test_cannot_approve_sent_doc(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Doc", "<p>Body</p>")
    await svc.approve(instr.id, user)
    await svc.send(instr.id, user)

    with pytest.raises(IllegalInstructionTransitionError):
        await svc.approve(instr.id, user)


@pytest.mark.asyncio
async def test_cannot_update_sent_doc(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Doc", "<p>Body</p>")
    await svc.approve(instr.id, user)
    await svc.send(instr.id, user)

    with pytest.raises(InstructionNotEditableError):
        await svc.update(instr.id, title="Mutate sent doc")


# ── Service: template prefill ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_from_template_prefills_body(session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)

    templates = await svc.list_templates()
    assert len(templates) > 0, "Seeded templates must exist"

    template = templates[0]
    instr = await svc.create_from_template(
        voyage_id=voyage.id,
        title="From Template",
        template_id=template.id,
    )

    assert instr.template_id == template.id
    assert instr.body["format"] == "html"
    # Body content should match template body (sanitized)
    assert len(instr.body["content"]) > 0
    assert instr.body["content"] == sanitize_html(template.body_html)


@pytest.mark.asyncio
async def test_list_templates_returns_seeded_set(session: AsyncSession):
    svc = VoyageInstructionService(session)
    templates = await svc.list_templates()
    names = {t.name for t in templates}
    assert "Standard Voyage Orders" in names
    assert len(templates) >= 3


# ── Service: PDF ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pdf_export_returns_bytes_for_approved_doc(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "PDF Test", "<h1>Orders</h1><p>Report daily.</p>")
    await svc.approve(instr.id, user)

    pdf_bytes = svc.render_pdf(instr)
    assert len(pdf_bytes) > 0
    # PDF files start with %PDF
    assert pdf_bytes[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_pdf_export_rejected_for_draft(session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "Draft PDF", "<p>not ready</p>")
    # A draft has not been approved — exporting it is an illegal action.
    with pytest.raises(InstructionNotEditableError):
        svc.render_pdf(instr)


@pytest.mark.asyncio
async def test_pdf_contains_instruction_title(session: AsyncSession):
    voyage = await _setup(session)
    user = await _make_user(session)
    svc = VoyageInstructionService(session)

    instr = await svc.create(voyage.id, "UNIQUE_TITLE_99", "<p>Content</p>")
    await svc.approve(instr.id, user)

    pdf_bytes = svc.render_pdf(instr)
    # The title should appear somewhere in the PDF stream
    assert b"UNIQUE_TITLE_99" in pdf_bytes


# ── API tests ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_create_list_get(client, session: AsyncSession):
    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/instructions",
        json={"title": "API Test", "body_html": "<p>Hello</p>"},
    )
    assert resp.status_code == 201
    instr_id = resp.json()["id"]
    assert resp.json()["status"] == "draft"
    assert resp.json()["body"]["format"] == "html"
    assert "<p>Hello</p>" in resp.json()["body"]["content"]

    resp = await client.get(f"/api/v1/voyages/{voyage.id}/instructions")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.get(f"/api/v1/instructions/{instr_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "API Test"


@pytest.mark.asyncio
async def test_api_lifecycle_full(client, session: AsyncSession):
    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/instructions",
        json={"title": "Lifecycle Test", "body_html": "<p>Body</p>"},
    )
    assert resp.status_code == 201
    instr_id = resp.json()["id"]

    # Approve
    resp = await client.post(f"/api/v1/instructions/{instr_id}/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    assert resp.json()["approved_at"] is not None

    # Send
    resp = await client.post(f"/api/v1/instructions/{instr_id}/send")
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"
    assert resp.json()["sent_at"] is not None

    # Cannot approve again after sent
    resp = await client.post(f"/api/v1/instructions/{instr_id}/approve")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_api_illegal_transition_send_draft_returns_409(client, session: AsyncSession):
    voyage = await _setup(session)
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/instructions",
        json={"title": "Bad", "body_html": "<p>x</p>"},
    )
    instr_id = resp.json()["id"]

    resp = await client.post(f"/api/v1/instructions/{instr_id}/send")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_api_pdf_endpoint_returns_pdf(client, session: AsyncSession):
    voyage = await _setup(session)

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/instructions",
        json={"title": "PDF Doc", "body_html": "<h1>Voyage Orders</h1><p>Content here.</p>"},
    )
    instr_id = resp.json()["id"]

    # Approve then send
    await client.post(f"/api/v1/instructions/{instr_id}/approve")
    await client.post(f"/api/v1/instructions/{instr_id}/send")

    resp = await client.get(f"/api/v1/instructions/{instr_id}/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_api_xss_stripped_on_create(client, session: AsyncSession):
    voyage = await _setup(session)
    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/instructions",
        json={"title": "XSS", "body_html": '<p>Safe</p><script>alert(1)</script>'},
    )
    assert resp.status_code == 201
    assert "<script>" not in resp.json()["body"]["content"]
    assert "<p>Safe</p>" in resp.json()["body"]["content"]


@pytest.mark.asyncio
async def test_api_template_prefill(client, session: AsyncSession):
    voyage = await _setup(session)
    svc = VoyageInstructionService(session)
    templates = await svc.list_templates()
    template = templates[0]

    resp = await client.post(
        f"/api/v1/voyages/{voyage.id}/instructions",
        json={
            "title": "From Template",
            "template_id": str(template.id),
        },
    )
    assert resp.status_code == 201
    assert resp.json()["template_id"] == str(template.id)
    assert len(resp.json()["body"]["content"]) > 0


@pytest.mark.asyncio
async def test_api_list_templates(client):
    resp = await client.get("/api/v1/instruction-templates")
    assert resp.status_code == 200
    names = [t["name"] for t in resp.json()]
    assert "Standard Voyage Orders" in names
    assert len(resp.json()) >= 3


@pytest.mark.asyncio
async def test_unauthenticated_instructions_fail(unauthenticated_client: AsyncClient):
    r1 = await unauthenticated_client.get(
        f"/api/v1/voyages/{uuid.uuid4()}/instructions"
    )
    assert r1.status_code == 401
