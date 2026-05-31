import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session, get_current_user
from src.modules.auth.models.user import User
from src.modules.forms.api.dtos import (
    FormCreateDTO,
    FormParseAttemptReadDTO,
    FormReadDTO,
    FormTransitionDTO,
    FormUpdateDTO,
    ParseRequestDTO,
)
from src.modules.forms.constants import FormStatus
from src.modules.forms.exceptions import (
    FormAnchorError,
    FormNotFoundError,
    FormPermissionError,
    FormTerminalStateError,
    IllegalFormTransitionError,
)
from src.modules.forms.llm.client import OpenAIStructuredClient, StructuredClient
from src.modules.forms.models.models import Form, FormParseAttempt
from src.modules.forms.service.form_service import FormService, FormUpdateData

router = APIRouter(prefix="/forms", tags=["forms"])


def get_forms_structured_client() -> StructuredClient:
    return OpenAIStructuredClient()


@router.post("/parse", response_model=FormReadDTO, status_code=status.HTTP_201_CREATED)
async def parse_form(
    payload: ParseRequestDTO,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
    client: StructuredClient = Depends(get_forms_structured_client),
) -> FormReadDTO:
    service = FormService(db)

    try:
        form = await service.parse(
            raw_text=payload.raw_text,
            form_type=payload.form_type,
            voyage_id=payload.voyage_id,
            port_call_id=payload.port_call_id,
            client=client,
            user_id=user.id,
        )
        # Return with detail and latest attempt
        return await _get_form_read_dto(form, db)
    except FormAnchorError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )


@router.post("", response_model=FormReadDTO, status_code=status.HTTP_201_CREATED)
async def create_manual(
    payload: FormCreateDTO,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> FormReadDTO:
    service = FormService(db)
    try:
        form = await service.create_manual(
            form_type=payload.form_type,
            raw_fields=payload.raw_fields,
            user_id=user.id,
            voyage_id=payload.voyage_id,
            port_call_id=payload.port_call_id,
            raw_source_ref=payload.raw_source_ref,
            notes=payload.notes,
        )
        return await _get_form_read_dto(form, db)
    except FormAnchorError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )


@router.get("", response_model=list[FormReadDTO])
async def list_forms(
    status: Optional[str] = Query(None),
    form_type: Optional[str] = Query(None),
    voyage_id: Optional[uuid.UUID] = Query(None),
    port_call_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> list[FormReadDTO]:
    conditions = []
    if status:
        conditions.append(Form.status == status)
    if form_type:
        conditions.append(Form.form_type == form_type)
    if voyage_id:
        conditions.append(Form.voyage_id == voyage_id)
    if port_call_id:
        conditions.append(Form.port_call_id == port_call_id)

    stmt = select(Form).where(*conditions).order_by(Form.received_at.desc())
    forms = (await db.execute(stmt)).scalars().all()
    return [await _get_form_read_dto(f, db) for f in forms]


@router.get("/{form_id}", response_model=FormReadDTO)
async def get_form(
    form_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> FormReadDTO:
    service = FormService(db)
    try:
        form = await service.get(form_id)
        return await _get_form_read_dto(form, db)
    except FormNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/{form_id}", response_model=FormReadDTO)
async def update_form(
    form_id: uuid.UUID,
    payload: FormUpdateDTO,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> FormReadDTO:
    service = FormService(db)
    try:
        updates: FormUpdateData = {}
        fields_set = payload.model_fields_set
        if "raw_fields" in fields_set and payload.raw_fields is not None:
            updates["raw_fields"] = payload.raw_fields
        if "voyage_id" in fields_set:
            updates["voyage_id"] = payload.voyage_id
        if "port_call_id" in fields_set:
            updates["port_call_id"] = payload.port_call_id
        if "assigned_to" in fields_set:
            updates["assigned_to"] = payload.assigned_to
        if "notes" in fields_set:
            updates["notes"] = payload.notes
        form = await service.update_pre_accept(form_id, updates)
        return await _get_form_read_dto(form, db)
    except FormNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except FormTerminalStateError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except FormAnchorError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )


@router.post("/{form_id}/transition", response_model=FormReadDTO)
async def transition_form(
    form_id: uuid.UUID,
    payload: FormTransitionDTO,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> FormReadDTO:
    service = FormService(db)
    try:
        target_status = FormStatus(payload.status)
        form = await service.transition(form_id, target_status, user)
        return await _get_form_read_dto(form, db)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status: {payload.status}",
        )
    except FormNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except IllegalFormTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except FormPermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


async def _get_form_read_dto(form: Form, db: AsyncSession) -> FormReadDTO:
    """Helper to enrich Form with detail and latest attempt."""
    service = FormService(db)
    detail = await service.detail_repo.get_one_or_none(form_id=form.id)
    attempts = (
        (
            await db.execute(
                select(FormParseAttempt)
                .where(FormParseAttempt.form_id == form.id)
                .order_by(FormParseAttempt.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    dto = FormReadDTO.model_validate(form)
    if detail:
        dto.raw_fields = detail.raw_fields
        dto.raw_source_ref = detail.raw_source_ref
    dto.parse_attempts = [
        FormParseAttemptReadDTO.model_validate(attempt) for attempt in attempts
    ]
    if dto.parse_attempts:
        dto.latest_attempt = dto.parse_attempts[0]
    dto.parse_failed = any(attempt.status == "MANUAL_REVIEW" for attempt in attempts)

    return dto
