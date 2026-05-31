import os
import time
from typing import Any, Optional, Protocol

from pydantic import BaseModel
from openai import OpenAI
from openai.types.chat.chat_completion_system_message_param import (
    ChatCompletionSystemMessageParam,
)
from openai.types.chat.chat_completion_user_message_param import (
    ChatCompletionUserMessageParam,
)
from openai.types.shared_params.response_format_json_schema import (
    JSONSchema,
    ResponseFormatJSONSchema,
)


class StructuredResult(BaseModel):
    raw_json: str
    input_tokens: int
    output_tokens: int
    latency_ms: int


class StructuredClient(Protocol):
    def complete_structured(
        self,
        *,
        prompt: str,
        raw_text: str,
        json_schema: dict[str, Any],
        model: Optional[str] = None,
    ) -> StructuredResult: ...


class OpenAIStructuredClient:
    """OpenAI implementation of StructuredClient."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.base_url = base_url or os.environ.get("OPENAI_BASE_URL")
        self.model = model or os.environ.get("FORMS_LLM_MODEL", "gpt-4o-mini")

        timeout_env = os.environ.get("FORMS_LLM_TIMEOUT_S")
        self.timeout = (
            timeout
            if timeout is not None
            else (float(timeout_env) if timeout_env else 30.0)
        )

        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            # We initialize it lazily to avoid throwing validation errors if API key is not present during import
            self._client = OpenAI(
                api_key=self.api_key or "mock-key-for-validation",
                base_url=self.base_url,
                timeout=self.timeout,
            )
        return self._client

    def complete_structured(
        self,
        *,
        prompt: str,
        raw_text: str,
        json_schema: dict[str, Any],
        model: Optional[str] = None,
    ) -> StructuredResult:
        target_model = model or self.model

        messages: list[
            ChatCompletionSystemMessageParam | ChatCompletionUserMessageParam
        ] = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": raw_text},
        ]
        response_format: ResponseFormatJSONSchema = {
            "type": "json_schema",
            "json_schema": JSONSchema(
                name="form_extraction",
                strict=True,
                schema=json_schema,
            ),
        }

        start_time = time.perf_counter()

        response = self.client.chat.completions.create(
            model=target_model,
            messages=messages,
            response_format=response_format,
        )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        raw_json = response.choices[0].message.content or ""
        usage = response.usage
        input_tokens = usage.prompt_tokens if usage else 0
        output_tokens = usage.completion_tokens if usage else 0

        return StructuredResult(
            raw_json=raw_json,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )
