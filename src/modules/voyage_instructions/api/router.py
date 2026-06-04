import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.auth.models.user import User
from src.modules.voyage_instructions.models.voyage_instruction import VoyageInstruction, InstructionTemplate
from src.modules.voyage_instructions.services.voyage_instruction_service import VoyageInstructionService


# ── DTOs ──────────────────────────────────────────────────────────────────────

class InstructionBodyDTO(BaseModel):
    format: str
    content: str


class VoyageInstructionReadDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    title: str
    body: dict[str, Any]
    status: str
    template_id: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[uuid.UUID] = None
    sent_at: Optional[datetime] = None
    sent_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InstructionTemplateReadDTO(BaseModel):
    id: uuid.UUID
    name: str
    body_html: str
    model_config = ConfigDict(from_attributes=True)


class InstructionCreateBody(BaseModel):
    title: str
    body_html: str = ""
    template_id: Optional[uuid.UUID] = None


class InstructionUpdateBody(BaseModel):
    title: Optional[str] = None
    body_html: Optional[str] = None


def _dto(instr: VoyageInstruction) -> VoyageInstructionReadDTO:
    return VoyageInstructionReadDTO.model_validate(instr)


def _tmpl_dto(t: InstructionTemplate) -> InstructionTemplateReadDTO:
    return InstructionTemplateReadDTO.model_validate(t)


# ── routers ───────────────────────────────────────────────────────────────────

voyage_router = APIRouter(prefix="/voyages/{voyage_id}/instructions")
member_router = APIRouter(prefix="/instructions")
templates_router = APIRouter(prefix="/instruction-templates")


@voyage_router.get("", response_model=list[VoyageInstructionReadDTO], tags=["voyage-instructions"])
async def list_instructions(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[VoyageInstructionReadDTO]:
    del current_user
    svc = VoyageInstructionService(session)
    return [_dto(i) for i in await svc.list_for_voyage(voyage_id)]


@voyage_router.post(
    "", response_model=VoyageInstructionReadDTO,
    status_code=status.HTTP_201_CREATED, tags=["voyage-instructions"]
)
async def create_instruction(
    voyage_id: uuid.UUID,
    body: InstructionCreateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageInstructionReadDTO:
    del current_user
    svc = VoyageInstructionService(session)
    if body.template_id is not None:
        instr = await svc.create_from_template(
            voyage_id=voyage_id,
            title=body.title,
            template_id=body.template_id,
        )
    else:
        instr = await svc.create(
            voyage_id=voyage_id,
            title=body.title,
            body_html=body.body_html,
        )
    return _dto(instr)


@member_router.get("/{instr_id}", response_model=VoyageInstructionReadDTO, tags=["voyage-instructions"])
async def get_instruction(
    instr_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageInstructionReadDTO:
    del current_user
    svc = VoyageInstructionService(session)
    return _dto(await svc.get(instr_id))


@member_router.patch("/{instr_id}", response_model=VoyageInstructionReadDTO, tags=["voyage-instructions"])
async def update_instruction(
    instr_id: uuid.UUID,
    body: InstructionUpdateBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageInstructionReadDTO:
    del current_user
    svc = VoyageInstructionService(session)
    return _dto(await svc.update(instr_id, title=body.title, body_html=body.body_html))


@member_router.post("/{instr_id}/approve", response_model=VoyageInstructionReadDTO, tags=["voyage-instructions"])
async def approve_instruction(
    instr_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageInstructionReadDTO:
    svc = VoyageInstructionService(session)
    return _dto(await svc.approve(instr_id, current_user))


@member_router.post("/{instr_id}/send", response_model=VoyageInstructionReadDTO, tags=["voyage-instructions"])
async def send_instruction(
    instr_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VoyageInstructionReadDTO:
    svc = VoyageInstructionService(session)
    return _dto(await svc.send(instr_id, current_user))


@member_router.get("/{instr_id}/pdf", tags=["voyage-instructions"])
async def download_pdf(
    instr_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    del current_user
    svc = VoyageInstructionService(session)
    instr = await svc.get(instr_id)
    pdf_bytes = svc.render_pdf(instr)
    safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in instr.title)
    filename = f"voyage_instructions_{safe_title[:40]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@templates_router.get("", response_model=list[InstructionTemplateReadDTO], tags=["voyage-instructions"])
async def list_templates(
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[InstructionTemplateReadDTO]:
    del current_user
    svc = VoyageInstructionService(session)
    return [_tmpl_dto(t) for t in await svc.list_templates()]
