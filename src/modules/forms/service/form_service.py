import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, TypedDict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.auth.models.user import User
from src.modules.forms.constants import (
    FormStatus,
    LEGAL_TRANSITIONS,
    FormSourceType,
)
from src.modules.forms.exceptions import (
    FormNotFoundError,
    IllegalFormTransitionError,
    FormTerminalStateError,
    FormPermissionError,
    FormAnchorError,
)
from src.modules.forms.models.models import Form, FormDetail, FormParseAttempt
from src.modules.forms.repositories import (
    FormRepository,
    FormDetailRepository,
    FormParseAttemptRepository,
)
from src.modules.forms.service.parser import FormParserService, ParseOutcome
from src.modules.forms.llm.client import StructuredClient
from src.modules.forms.llm.pricing import estimate_cost
from src.modules.forms.types import JsonObject
from src.modules.port_call import validate_port_call_exists
from src.modules.voyage_spine import validate_voyage_exists


class FormUpdateData(TypedDict, total=False):
    raw_fields: JsonObject
    voyage_id: uuid.UUID | None
    port_call_id: uuid.UUID | None
    assigned_to: uuid.UUID | None
    notes: str | None


class FormService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.form_repo = FormRepository(session=session)
        self.detail_repo = FormDetailRepository(session=session)
        self.attempt_repo = FormParseAttemptRepository(session=session)

    async def _validate_anchor(
        self, voyage_id: Optional[uuid.UUID], port_call_id: Optional[uuid.UUID]
    ) -> None:
        if (voyage_id is not None) == (port_call_id is not None):
            raise FormAnchorError(
                "Exactly one of voyage_id or port_call_id must be provided"
            )

        if voyage_id:
            await validate_voyage_exists(self.session, voyage_id)
        if port_call_id:
            await validate_port_call_exists(self.session, port_call_id)

    async def parse(
        self,
        raw_text: str,
        form_type: str,
        *,
        voyage_id: Optional[uuid.UUID] = None,
        port_call_id: Optional[uuid.UUID] = None,
        client: StructuredClient,
        user_id: uuid.UUID,
        model: Optional[str] = None,
    ) -> Form:
        """Parse raw text via LLM, persistence attempt, and create form."""
        await self._validate_anchor(voyage_id, port_call_id)

        # Invoke parser (M1)
        outcome: ParseOutcome = FormParserService.parse_only(
            raw_text=raw_text,
            form_type=form_type,
            client=client,
            model=model,
        )

        # Create Form entity
        now = datetime.now(timezone.utc)
        form = Form(
            form_type=form_type,
            status=FormStatus.RECEIVED.value,
            voyage_id=voyage_id,
            port_call_id=port_call_id,
            submitted_by=user_id,
            received_at=now,
            submitted_at=now,
        )
        await self.form_repo.add(form)
        await self.session.flush()

        # Create FormDetail
        raw_fields = (
            outcome.validated_model.model_dump(mode="json")
            if outcome.validated_model
            else {}
        )
        text_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        detail = FormDetail(
            form_id=form.id,
            raw_fields=raw_fields,
            raw_source_ref=raw_text if outcome.status == "MANUAL_REVIEW" else None,
            raw_text_hash=text_hash,
            source_type=FormSourceType.PASTE.value,
        )
        await self.detail_repo.add(detail)

        # Create FormParseAttempt audit row
        cost = estimate_cost(outcome.model, outcome.input_tokens, outcome.output_tokens)
        attempt = FormParseAttempt(
            form_id=form.id,
            provider=outcome.provider,
            model=outcome.model,
            prompt_version=outcome.prompt_version,
            schema_version=outcome.schema_version,
            retry_no=outcome.retry_no,
            input_tokens=outcome.input_tokens,
            output_tokens=outcome.output_tokens,
            cost_estimate=cost,
            latency_ms=outcome.latency_ms,
            status=outcome.status,
            error_message=outcome.error,
        )
        await self.attempt_repo.add(attempt)

        await self.session.commit()
        await self.session.refresh(form)
        return form

    async def create_manual(
        self,
        form_type: str,
        raw_fields: JsonObject,
        user_id: uuid.UUID,
        voyage_id: Optional[uuid.UUID] = None,
        port_call_id: Optional[uuid.UUID] = None,
        raw_source_ref: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Form:
        """Create a form manually without LLM parse attempt."""
        await self._validate_anchor(voyage_id, port_call_id)

        now = datetime.now(timezone.utc)
        form = Form(
            form_type=form_type,
            status=FormStatus.RECEIVED.value,
            voyage_id=voyage_id,
            port_call_id=port_call_id,
            submitted_by=user_id,
            received_at=now,
            submitted_at=now,
            notes=notes,
        )
        await self.form_repo.add(form)
        await self.session.flush()

        detail = FormDetail(
            form_id=form.id,
            raw_fields=raw_fields,
            raw_source_ref=raw_source_ref,
            raw_text_hash="",  # No raw text for manual
            source_type=FormSourceType.PASTE.value,
        )
        await self.detail_repo.add(detail)

        await self.session.commit()
        await self.session.refresh(form)
        return form

    async def get(self, form_id: uuid.UUID) -> Form:
        """Get form by ID or raise FormNotFoundError."""
        form = await self.form_repo.get_one_or_none(id=form_id)
        if not form:
            raise FormNotFoundError(str(form_id))
        return form

    async def update_pre_accept(
        self,
        form_id: uuid.UUID,
        updates: FormUpdateData,
    ) -> Form:
        """Update form fields before it reaches a terminal state."""
        form = await self.get(form_id)
        if form.status in {FormStatus.ACCEPTED.value, FormStatus.REJECTED.value}:
            raise FormTerminalStateError(str(form_id), form.status)

        # Handle raw_fields update via detail
        if "raw_fields" in updates:
            detail = await self.detail_repo.get_one(form_id=form_id)
            detail.raw_fields = updates["raw_fields"]
            await self.detail_repo.update(detail)

        # Handle anchor updates
        voyage_id = updates.get("voyage_id", form.voyage_id)
        port_call_id = updates.get("port_call_id", form.port_call_id)
        if "voyage_id" in updates or "port_call_id" in updates:
            await self._validate_anchor(voyage_id, port_call_id)

        if "voyage_id" in updates:
            form.voyage_id = updates["voyage_id"]
        if "port_call_id" in updates:
            form.port_call_id = updates["port_call_id"]
        if "assigned_to" in updates:
            form.assigned_to = updates["assigned_to"]
        if "notes" in updates:
            form.notes = updates["notes"]

        await self.form_repo.update(form)
        await self.session.commit()
        await self.session.refresh(form)
        return form

    async def transition(
        self,
        form_id: uuid.UUID,
        target_status: FormStatus,
        user: User,
    ) -> Form:
        """Perform FSM transition with role validation."""
        form = await self.get(form_id)
        current_status = FormStatus(form.status)

        if target_status not in LEGAL_TRANSITIONS.get(current_status, set()):
            raise IllegalFormTransitionError(current_status.value, target_status.value)

        # Role gate
        if target_status in {FormStatus.ACCEPTED, FormStatus.REJECTED}:
            # Refresh user roles to avoid MissingGreenlet
            from src.modules.auth.models.user import UserRole
            from src.modules.auth.models.role import Role

            stmt = select(Role.name).join(UserRole).where(UserRole.user_id == user.id)
            result = await self.session.execute(stmt)
            user_roles = set(result.scalars().all())

            if not (user_roles & {"Admin", "Operations"}):
                raise FormPermissionError(
                    "Insufficient permissions to accept/reject form"
                )

        form.status = target_status.value
        if target_status in {FormStatus.ACCEPTED, FormStatus.REJECTED}:
            form.reviewed_by = user.id
            form.reviewed_at = datetime.now(timezone.utc)

        if target_status == FormStatus.ACCEPTED:
            # Set accepted_parse_attempt_id to the latest successful attempt
            result = await self.session.execute(
                select(FormParseAttempt.id)
                .where(
                    FormParseAttempt.form_id == form_id,
                    FormParseAttempt.status == "SUCCESS",
                )
                .order_by(FormParseAttempt.created_at.desc())
                .limit(1)
            )
            attempt_id = result.scalar_one_or_none()
            if attempt_id:
                form.accepted_parse_attempt_id = uuid.UUID(str(attempt_id))

        await self.form_repo.update(form)
        await self.session.commit()
        await self.session.refresh(form)
        return form
