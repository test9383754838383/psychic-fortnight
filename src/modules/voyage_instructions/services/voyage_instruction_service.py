"""Voyage Instructions service — lifecycle, templates, PDF export."""
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from src.exceptions import DomainError
from src.modules.voyage_instructions.models.voyage_instruction import (
    InstructionStatus,
    InstructionTemplate,
    VoyageInstruction,
)
from src.modules.voyage_instructions.repositories.voyage_instruction_repository import (
    InstructionTemplateRepository,
    VoyageInstructionRepository,
)
from src.modules.voyage_instructions.services.html_sanitizer import sanitize_html
from src.modules.voyage_instructions.services.pdf_renderer import render_instruction_pdf
from src.modules.voyage_spine import validate_voyage_exists


# ── exceptions ────────────────────────────────────────────────────────────────

class InstructionNotFoundError(DomainError):
    def __init__(self, instr_id: str) -> None:
        super().__init__(f"Voyage instruction {instr_id} not found",
                         code="NOT_FOUND", status_code=404)


class InstructionTemplateNotFoundError(DomainError):
    def __init__(self, template_id: str) -> None:
        super().__init__(f"Instruction template {template_id} not found",
                         code="NOT_FOUND", status_code=404)


class IllegalInstructionTransitionError(DomainError):
    def __init__(self, from_status: str, to_status: str) -> None:
        super().__init__(
            f"Cannot transition voyage instruction from {from_status!r} to {to_status!r}",
            code="ILLEGAL_INSTRUCTION_TRANSITION",
            status_code=http_status.HTTP_409_CONFLICT,
        )


class InstructionNotEditableError(DomainError):
    def __init__(self, status: str) -> None:
        super().__init__(
            f"Voyage instruction cannot be edited in status {status!r}",
            code="INSTRUCTION_NOT_EDITABLE",
            status_code=http_status.HTTP_409_CONFLICT,
        )


# ── state machine ─────────────────────────────────────────────────────────────

_LEGAL_TRANSITIONS: dict[str, set[str]] = {
    InstructionStatus.DRAFT.value: {InstructionStatus.APPROVED.value},
    InstructionStatus.APPROVED.value: {InstructionStatus.SENT.value},
    InstructionStatus.SENT.value: set(),
}


def _body(html: str) -> dict[str, Any]:
    return {"format": "html", "content": sanitize_html(html)}


# ── service ────────────────────────────────────────────────────────────────────

class VoyageInstructionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = VoyageInstructionRepository(session=session)
        self.template_repo = InstructionTemplateRepository(session=session)

    # ── get / list ────────────────────────────────────────────────────────────

    async def get(self, instr_id: uuid.UUID) -> VoyageInstruction:
        instr = await self.repo.get_one_or_none(id=instr_id)
        if not instr:
            raise InstructionNotFoundError(str(instr_id))
        return instr

    async def list_for_voyage(self, voyage_id: uuid.UUID) -> list[VoyageInstruction]:
        return await self.repo.list_for_voyage(voyage_id)

    async def list_templates(self) -> list[InstructionTemplate]:
        return await self.template_repo.list_all()

    # ── create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        voyage_id: uuid.UUID,
        title: str,
        body_html: str = "",
        template_id: Optional[uuid.UUID] = None,
    ) -> VoyageInstruction:
        await validate_voyage_exists(self.session, voyage_id)
        instr = VoyageInstruction(
            voyage_id=voyage_id,
            title=title,
            body=_body(body_html),
            status=InstructionStatus.DRAFT.value,
            template_id=template_id,
        )
        await self.repo.add(instr)
        await self.session.commit()
        await self.session.refresh(instr)
        return instr

    async def create_from_template(
        self,
        voyage_id: uuid.UUID,
        title: str,
        template_id: uuid.UUID,
    ) -> VoyageInstruction:
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            raise InstructionTemplateNotFoundError(str(template_id))
        return await self.create(
            voyage_id=voyage_id,
            title=title,
            body_html=template.body_html,
            template_id=template_id,
        )

    # ── update ────────────────────────────────────────────────────────────────

    async def update(
        self,
        instr_id: uuid.UUID,
        title: Optional[str] = None,
        body_html: Optional[str] = None,
    ) -> VoyageInstruction:
        instr = await self.get(instr_id)
        if instr.status != InstructionStatus.DRAFT.value:
            raise InstructionNotEditableError(instr.status)
        if title is not None:
            instr.title = title
        if body_html is not None:
            instr.body = _body(body_html)
        await self.repo.update(instr)
        await self.session.commit()
        await self.session.refresh(instr)
        return instr

    # ── lifecycle transitions ─────────────────────────────────────────────────

    async def _transition(
        self,
        instr_id: uuid.UUID,
        to_status: str,
        user: object,
        **stamp_fields: Any,
    ) -> VoyageInstruction:
        from src.modules.auth.models.user import User
        assert isinstance(user, User)

        instr = await self.get(instr_id)
        allowed = _LEGAL_TRANSITIONS.get(instr.status, set())
        if to_status not in allowed:
            raise IllegalInstructionTransitionError(instr.status, to_status)

        instr.status = to_status
        for field, val in stamp_fields.items():
            setattr(instr, field, val)

        await self.repo.update(instr)
        await self.session.commit()
        await self.session.refresh(instr)
        return instr

    async def approve(self, instr_id: uuid.UUID, user: object) -> VoyageInstruction:
        from src.modules.auth.models.user import User
        assert isinstance(user, User)
        now = datetime.now(timezone.utc)
        return await self._transition(
            instr_id, InstructionStatus.APPROVED.value, user,
            approved_at=now, approved_by=user.id,
        )

    async def send(self, instr_id: uuid.UUID, user: object) -> VoyageInstruction:
        from src.modules.auth.models.user import User
        assert isinstance(user, User)
        now = datetime.now(timezone.utc)
        return await self._transition(
            instr_id, InstructionStatus.SENT.value, user,
            sent_at=now, sent_by=user.id,
        )

    # ── PDF ───────────────────────────────────────────────────────────────────

    def render_pdf(self, instr: VoyageInstruction) -> bytes:
        # A draft is not a sendable document — only approved/sent docs export.
        if instr.status == InstructionStatus.DRAFT.value:
            raise InstructionNotEditableError(instr.status)
        body_html = instr.body.get("content", "")
        return render_instruction_pdf(
            title=instr.title,
            body_html=body_html,
            approved_at=instr.approved_at,
            sent_at=instr.sent_at,
        )
