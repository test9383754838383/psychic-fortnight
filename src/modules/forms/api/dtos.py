import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.modules.forms.types import JsonObject

FormTypeValue = Literal[
    "Noon", "Arrival", "Departure", "Bunkering", "Statement of Facts"
]


class ParseRequestDTO(BaseModel):
    raw_text: str = Field(..., min_length=1)
    form_type: FormTypeValue
    voyage_id: Optional[uuid.UUID] = None
    port_call_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def validate_anchor_xor(self) -> "ParseRequestDTO":
        if (self.voyage_id is not None) == (self.port_call_id is not None):
            raise ValueError(
                "Exactly one of voyage_id or port_call_id must be provided"
            )
        return self


class FormCreateDTO(BaseModel):
    form_type: FormTypeValue
    voyage_id: Optional[uuid.UUID] = None
    port_call_id: Optional[uuid.UUID] = None
    raw_fields: JsonObject
    raw_source_ref: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_anchor_xor(self) -> "FormCreateDTO":
        if (self.voyage_id is not None) == (self.port_call_id is not None):
            raise ValueError(
                "Exactly one of voyage_id or port_call_id must be provided"
            )
        return self


class FormUpdateDTO(BaseModel):
    raw_fields: Optional[JsonObject] = None
    voyage_id: Optional[uuid.UUID] = None
    port_call_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_anchor_xor(self) -> "FormUpdateDTO":
        # If both are provided, they must still be XOR.
        # If only one is provided as an update, we rely on the service to check against the other stored one.
        # But if both are set in the DTO, we can check.
        if self.voyage_id is not None and self.port_call_id is not None:
            raise ValueError("Both voyage_id and port_call_id cannot be provided")
        return self


class FormTransitionDTO(BaseModel):
    status: str


class FormParseAttemptReadDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider: str
    model: str
    prompt_version: str
    schema_version: str
    retry_no: int
    input_tokens: int
    output_tokens: int
    cost_estimate: float
    latency_ms: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime


class FormReadDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    form_type: str
    status: str
    voyage_id: Optional[uuid.UUID] = None
    port_call_id: Optional[uuid.UUID] = None
    submitted_by: uuid.UUID
    submitted_at: datetime
    received_at: datetime
    assigned_to: Optional[uuid.UUID] = None
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    accepted_parse_attempt_id: Optional[uuid.UUID] = None

    # Detail fields (usually joined or fetched separately, but we'll include them if available)
    raw_fields: Optional[JsonObject] = None
    raw_source_ref: Optional[str] = None
    parse_failed: bool = False

    # Recent attempt
    latest_attempt: Optional[FormParseAttemptReadDTO] = None
    parse_attempts: list[FormParseAttemptReadDTO] = Field(default_factory=list)
