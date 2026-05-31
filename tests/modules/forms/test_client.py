"""Unit tests for OpenAIStructuredClient.

CI contract: no live LLM calls. Uses unittest.mock to mock OpenAI SDK.
"""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

from src.modules.forms.llm.client import OpenAIStructuredClient, StructuredResult


def test_client_init_defaults() -> None:
    """Test client initialization with default arguments and fallback to env vars."""
    with patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "env-key",
            "OPENAI_BASE_URL": "https://env.url",
            "FORMS_LLM_MODEL": "gpt-env-model",
            "FORMS_LLM_TIMEOUT_S": "15.5",
        },
    ):
        client = OpenAIStructuredClient()
        assert client.api_key == "env-key"
        assert client.base_url == "https://env.url"
        assert client.model == "gpt-env-model"
        assert client.timeout == 15.5


def test_client_init_explicit() -> None:
    """Test client initialization with explicit arguments overriding env vars."""
    with patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "env-key",
            "OPENAI_BASE_URL": "https://env.url",
            "FORMS_LLM_MODEL": "gpt-env-model",
            "FORMS_LLM_TIMEOUT_S": "15.5",
        },
    ):
        client = OpenAIStructuredClient(
            api_key="explicit-key",
            base_url="https://explicit.url",
            model="gpt-explicit-model",
            timeout=42.0,
        )
        assert client.api_key == "explicit-key"
        assert client.base_url == "https://explicit.url"
        assert client.model == "gpt-explicit-model"
        assert client.timeout == 42.0


def test_client_lazy_initialization() -> None:
    """Test that OpenAI client is initialized lazily and cached."""
    client = OpenAIStructuredClient(
        api_key="my-key", base_url="https://api.url", timeout=10.0
    )
    assert client._client is None

    with patch("src.modules.forms.llm.client.OpenAI") as mock_openai_cls:
        mock_instance = MagicMock()
        mock_openai_cls.return_value = mock_instance

        # Access the client property
        first_client = client.client
        assert first_client is mock_instance
        assert client._client is mock_instance
        mock_openai_cls.assert_called_once_with(
            api_key="my-key",
            base_url="https://api.url",
            timeout=10.0,
        )

        # Access again, verify cached
        second_client = client.client
        assert second_client is mock_instance
        mock_openai_cls.assert_called_once()  # no extra calls


def test_complete_structured() -> None:
    """Test complete_structured calls chat completions with correct options."""
    client = OpenAIStructuredClient(api_key="my-key", model="my-model")

    # Mocking completion response
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"key": "val"}'
    mock_response.choices = [mock_choice]

    mock_usage = MagicMock()
    mock_usage.prompt_tokens = 120
    mock_usage.completion_tokens = 60
    mock_response.usage = mock_usage

    mock_completions = MagicMock()
    mock_completions.create.return_value = mock_response

    mock_client = MagicMock()
    mock_client.chat.completions = mock_completions
    client._client = mock_client

    schema = {"type": "object", "properties": {"key": {"type": "string"}}}

    result = client.complete_structured(
        prompt="system prompt",
        raw_text="user input",
        json_schema=schema,
    )

    assert isinstance(result, StructuredResult)
    assert result.raw_json == '{"key": "val"}'
    assert result.input_tokens == 120
    assert result.output_tokens == 60
    assert result.latency_ms >= 0

    mock_completions.create.assert_called_once_with(
        model="my-model",
        messages=[
            {"role": "system", "content": "system prompt"},
            {"role": "user", "content": "user input"},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "form_extraction",
                "strict": True,
                "schema": schema,
            },
        },
    )


def test_complete_structured_with_model_override() -> None:
    """Test model override in complete_structured."""
    client = OpenAIStructuredClient(api_key="my-key", model="my-model")

    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "{}"
    mock_response.choices = [mock_choice]
    mock_response.usage = None

    mock_completions = MagicMock()
    mock_completions.create.return_value = mock_response
    mock_client = MagicMock()
    mock_client.chat.completions = mock_completions
    client._client = mock_client

    result = client.complete_structured(
        prompt="prompt",
        raw_text="text",
        json_schema={},
        model="override-model",
    )

    assert result.input_tokens == 0
    assert result.output_tokens == 0

    mock_completions.create.assert_called_once()
    kwargs = mock_completions.create.call_args[1]
    assert kwargs["model"] == "override-model"
