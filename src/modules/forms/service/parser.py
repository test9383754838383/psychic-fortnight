"""FormParserService orchestrates LLM extraction for all form types.

Responsibilities:
- Map form_type → (prompt module, Pydantic schema class).
- Export + sanitize the JSON schema for OpenAI strict mode.
- Invoke the StructuredClient.
- Deserialise raw JSON into the appropriate Pydantic model.
- Return a ParseOutcome carrying the validated model or manual-review outcome.

This module NEVER imports from outside src/modules/forms/. (12-Factor Agent boundary.)
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional, Type

from pydantic import BaseModel

from src.modules.forms.constants import FORM_TYPES
from src.modules.forms.llm.client import StructuredClient
from src.modules.forms.llm.schema import export_schema, sanitize_strict
from src.modules.forms.models.schemas import (
    ArrivalReportSchema,
    BunkeringReportSchema,
    DepartureReportSchema,
    NoonReportSchema,
    StatementOfFactsSchema,
)
from src.modules.forms.llm.prompts import (
    arrival,
    bunkering,
    departure,
    noon,
    statement_of_facts,
)


# ---------------------------------------------------------------------------
# Internal registry
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, tuple[str, Type[BaseModel]]] = {
    "Noon": (noon.PROMPT, NoonReportSchema),
    "Arrival": (arrival.PROMPT, ArrivalReportSchema),
    "Departure": (departure.PROMPT, DepartureReportSchema),
    "Bunkering": (bunkering.PROMPT, BunkeringReportSchema),
    "Statement of Facts": (statement_of_facts.PROMPT, StatementOfFactsSchema),
}


# ---------------------------------------------------------------------------
# Public result type
# ---------------------------------------------------------------------------


@dataclass
class ParseOutcome:
    """Holds the result of a single parse_only call."""

    status: str  # "SUCCESS" or "MANUAL_REVIEW"
    validated_model: Optional[BaseModel]
    provider: str
    model: str  # LLM model name
    prompt_version: str
    schema_version: str
    tokens: int
    input_tokens: int
    output_tokens: int
    latency_ms: int
    retry_no: int
    error: Optional[str] = None
    raw_json: Optional[str] = None

    @property
    def latency(self) -> int:
        """Alias for compatibility with specifications requiring 'latency'."""
        return self.latency_ms


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class UnknownFormTypeError(ValueError):
    """Raised when *form_type* is not in FORM_TYPES."""


class ExtractionError(RuntimeError):
    """Raised when the LLM response cannot be parsed into the schema."""


# ---------------------------------------------------------------------------
# Prompt Version Registry
# ---------------------------------------------------------------------------

_REGISTRY_VERSIONS: dict[str, str] = {
    "Noon": noon.prompt_version,
    "Arrival": arrival.prompt_version,
    "Departure": departure.prompt_version,
    "Bunkering": bunkering.prompt_version,
    "Statement of Facts": statement_of_facts.prompt_version,
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class FormParserService:
    """Parse a raw email into a typed Pydantic form model via an LLM call.

    Parameters
    ----------
    client:
        Any object satisfying the :class:`StructuredClient` protocol.
    model:
        Optional override for the LLM model identifier (forwarded to the
        client's ``complete_structured`` call).
    """

    def __init__(
        self,
        client: StructuredClient,
        model: Optional[str] = None,
    ) -> None:
        self._client = client
        self._model = model

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def parse_only(
        raw_text: str,
        form_type: str,
        *,
        client: StructuredClient,
        model: Optional[str] = None,
    ) -> ParseOutcome:
        """Extract structured data from *raw_text* and return a :class:`ParseOutcome`.

        Parameters
        ----------
        raw_text:
            The raw text/email to extract from.
        form_type:
            One of the values in :data:`FORM_TYPES`.
        client:
            Any object satisfying the :class:`StructuredClient` protocol.
        model:
            Optional override for the LLM model identifier.

        Raises
        ------
        UnknownFormTypeError
            If *form_type* is not recognised.
        """
        if form_type not in FORM_TYPES:
            raise UnknownFormTypeError(
                f"Unknown form_type {form_type!r}. Expected one of {sorted(FORM_TYPES)}."
            )

        prompt, schema_cls = _REGISTRY[form_type]
        schema_version = f"{schema_cls.__name__.lower().replace('schema', '')}_v1"
        prompt_version = _REGISTRY_VERSIONS.get(form_type, "v1")

        # Prepare the sanitised JSON schema for OpenAI strict mode.
        raw_schema = export_schema(schema_cls)
        strict_schema = sanitize_strict(raw_schema)

        provider = (
            "openai" if "openai" in client.__class__.__name__.lower() else "unknown"
        )
        client_model = getattr(client, "model", "gpt-4o-mini")
        if not isinstance(client_model, str):
            client_model = "gpt-4o-mini"
        target_model: str = model or client_model

        total_input_tokens = 0
        total_output_tokens = 0
        total_latency_ms = 0
        retry_no = 0
        raw_json = None
        validated_model = None
        attempt_error = None

        try:
            # First attempt
            result = client.complete_structured(
                prompt=prompt,
                raw_text=raw_text,
                json_schema=strict_schema,
                model=target_model,
            )
            total_input_tokens += result.input_tokens
            total_output_tokens += result.output_tokens
            total_latency_ms += result.latency_ms
            raw_json = result.raw_json

            # Deserialise + validate
            payload = json.loads(raw_json)
            validated_model = schema_cls.model_validate(payload)
        except Exception as exc:
            attempt_error = exc

        # If first attempt failed with invalid JSON / validation / client error, retry exactly once
        if attempt_error is not None:
            retry_no = 1
            error_msg = f"{type(attempt_error).__name__}: {attempt_error}"
            retry_prompt = (
                f"{prompt}\n\n"
                f"Your previous attempt failed with the following error:\n"
                f"--- BEGIN ERROR ---\n"
                f"{error_msg}\n"
                f"--- END ERROR ---\n\n"
                f"Please correct the error and return valid JSON conforming to the schema."
            )

            try:
                result = client.complete_structured(
                    prompt=retry_prompt,
                    raw_text=raw_text,
                    json_schema=strict_schema,
                    model=target_model,
                )
                total_input_tokens += result.input_tokens
                total_output_tokens += result.output_tokens
                total_latency_ms += result.latency_ms
                raw_json = result.raw_json

                # Deserialise + validate again
                payload = json.loads(raw_json)
                validated_model = schema_cls.model_validate(payload)
                # Successful retry clears the error!
                attempt_error = None
            except Exception as exc2:
                attempt_error = exc2

        # Return appropriate ParseOutcome
        if attempt_error is None:
            return ParseOutcome(
                status="SUCCESS",
                validated_model=validated_model,
                provider=provider,
                model=target_model,
                prompt_version=prompt_version,
                schema_version=schema_version,
                tokens=total_input_tokens + total_output_tokens,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                latency_ms=total_latency_ms,
                retry_no=retry_no,
                error=None,
                raw_json=raw_json,
            )
        else:
            return ParseOutcome(
                status="MANUAL_REVIEW",
                validated_model=None,
                provider=provider,
                model=target_model,
                prompt_version=prompt_version,
                schema_version=schema_version,
                tokens=total_input_tokens + total_output_tokens,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                latency_ms=total_latency_ms,
                retry_no=retry_no,
                error=f"{type(attempt_error).__name__}: {attempt_error}",
                raw_json=raw_json,
            )
