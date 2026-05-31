"""Unit tests for FormParserService using FakeStructuredClient.

CI contract: no live LLM calls. All tests are fully deterministic.
"""

from __future__ import annotations

import json
from typing import Optional

import pytest

from src.modules.forms.llm.client import StructuredResult
from src.modules.forms.service.parser import (
    FormParserService,
    ParseOutcome,
    UnknownFormTypeError,
)


# ---------------------------------------------------------------------------
# Sequence Fake client
# ---------------------------------------------------------------------------


class SequenceFakeStructuredClient:
    """Test double that returns a sequence of canned responses or exceptions.

    Implements the StructuredClient protocol without any network calls.
    """

    def __init__(self, responses: list[str | Exception]) -> None:
        self.responses = responses
        self.calls: list[dict] = []
        self._index = 0
        self.model = "gpt-4o-mini"

    def complete_structured(
        self,
        *,
        prompt: str,
        raw_text: str,
        json_schema: dict,
        model: Optional[str] = None,
    ) -> StructuredResult:
        self.calls.append(
            {
                "prompt": prompt,
                "raw_text": raw_text,
                "json_schema": json_schema,
                "model": model,
            }
        )
        if self._index >= len(self.responses):
            response = "{}"
        else:
            response = self.responses[self._index]
            self._index += 1

        if isinstance(response, Exception):
            raise response

        return StructuredResult(
            raw_json=response,
            input_tokens=100,
            output_tokens=50,
            latency_ms=42,
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOON_VALID_PAYLOAD = {
    "vessel_name": "MV TEST",
    "report_time": "2026-05-31T12:00:00+00:00",
    "latitude": "35.1",
    "longitude": "-120.5",
    "speed_gps": "12.5",
    "speed_log": "12.2",
    "distance_to_go": "1250.5",
    "bunker_fo_rob_mt": "450.2",
    "bunker_do_rob_mt": "55.8",
    "wind_force_beaufort": 5,
}

_ARRIVAL_VALID_PAYLOAD = {
    "vessel_name": "MV TEST",
    "port_name": "Rotterdam",
    "arrival_time": "2026-05-29T06:30:00+00:00",
    "bunker_fo_rob_mt": "380.5",
    "bunker_do_rob_mt": "48.2",
    "draft_fore_m": "9.8",
    "draft_aft_m": "10.2",
}

_DEPARTURE_VALID_PAYLOAD = {
    "vessel_name": "MV TEST",
    "port_name": "Rotterdam",
    "departure_time": "2026-05-31T14:00:00+00:00",
    "next_port_name": "Antwerp",
    "bunker_fo_rob_mt": "450.0",
    "bunker_do_rob_mt": "55.0",
    "draft_fore_m": None,
    "draft_aft_m": None,
}

_BUNKERING_VALID_PAYLOAD = {
    "vessel_name": "MV TEST",
    "port_name": "Rotterdam",
    "bunkering_start_time": "2026-05-30T08:00:00+00:00",
    "bunkering_end_time": "2026-05-30T16:00:00+00:00",
    "bunker_fo_received_mt": "150.0",
    "bunker_do_received_mt": "20.0",
    "bunker_supplier": "Shell Marine",
}

_SOF_VALID_PAYLOAD = {
    "vessel_name": "MV TEST",
    "port_name": "Rotterdam",
    "arrival_time": "2026-05-29T06:30:00+00:00",
    "departure_time": "2026-05-31T14:00:00+00:00",
    "cargo_quantity_mt": "45000.0",
    "demurrage_rate_usd_per_day": "15000.0",
    "remarks": "No issues.",
}


# ---------------------------------------------------------------------------
# Tests — happy path for all form types
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "form_type, payload",
    [
        ("Noon", _NOON_VALID_PAYLOAD),
        ("Arrival", _ARRIVAL_VALID_PAYLOAD),
        ("Departure", _DEPARTURE_VALID_PAYLOAD),
        ("Bunkering", _BUNKERING_VALID_PAYLOAD),
        ("Statement of Facts", _SOF_VALID_PAYLOAD),
    ],
)
def test_parse_returns_parse_outcome(form_type: str, payload: dict) -> None:
    """Happy path: FakeClient returns valid JSON -> ParseOutcome is returned."""
    client = SequenceFakeStructuredClient([json.dumps(payload)])

    result = FormParserService.parse_only(
        raw_text="fake email text", form_type=form_type, client=client
    )

    assert isinstance(result, ParseOutcome)
    assert result.status == "SUCCESS"
    assert result.validated_model is not None
    assert result.input_tokens == 100
    assert result.output_tokens == 50
    assert result.latency_ms == 42
    assert result.retry_no == 0
    assert result.error is None


def test_parse_noon_populates_vessel_name() -> None:
    """Parsed NoonReportSchema.vessel_name matches the LLM payload."""
    client = SequenceFakeStructuredClient([json.dumps(_NOON_VALID_PAYLOAD)])
    result = FormParserService.parse_only(
        raw_text="irrelevant", form_type="Noon", client=client
    )
    assert result.validated_model is not None
    assert result.validated_model.vessel_name == "MV TEST"  # type: ignore[attr-defined]


def test_parse_passes_prompt_to_client() -> None:
    """The system prompt and raw_text are forwarded to the client."""
    client = SequenceFakeStructuredClient([json.dumps(_NOON_VALID_PAYLOAD)])
    raw = "The raw email body"
    FormParserService.parse_only(raw_text=raw, form_type="Noon", client=client)

    assert len(client.calls) == 1
    call = client.calls[0]
    assert call["raw_text"] == raw
    assert "Extract" in call["prompt"]


def test_parse_passes_model_override_to_client() -> None:
    """model= override is forwarded to the client unchanged."""
    client = SequenceFakeStructuredClient([json.dumps(_NOON_VALID_PAYLOAD)])
    FormParserService.parse_only(
        raw_text="x", form_type="Noon", client=client, model="gpt-4o"
    )
    assert client.calls[0]["model"] == "gpt-4o"


def test_json_schema_has_no_forbidden_keys() -> None:
    """The sanitised schema forwarded to the client must not contain 'format' or 'pattern'."""
    client = SequenceFakeStructuredClient([json.dumps(_NOON_VALID_PAYLOAD)])
    FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    schema = client.calls[0]["json_schema"]
    schema_str = json.dumps(schema)
    for forbidden in ('"format"', '"pattern"', '"minimum"', '"maximum"'):
        assert forbidden not in schema_str, f"Forbidden key {forbidden} found in schema"


# ---------------------------------------------------------------------------
# Tests — retry and error paths
# ---------------------------------------------------------------------------


def test_unknown_form_type_raises() -> None:
    """UnknownFormTypeError is raised for unrecognised form types."""
    client = SequenceFakeStructuredClient(["{}"])
    with pytest.raises(UnknownFormTypeError, match="Unknown form_type"):
        FormParserService.parse_only(
            raw_text="x", form_type="WeatherReport", client=client
        )


def test_invalid_json_retries_and_succeeds() -> None:
    """If first attempt has invalid JSON but second succeeds, outcome is SUCCESS."""
    client = SequenceFakeStructuredClient(
        ["NOT JSON AT ALL", json.dumps(_NOON_VALID_PAYLOAD)]
    )
    result = FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    assert result.status == "SUCCESS"
    assert result.validated_model is not None
    assert result.validated_model.vessel_name == "MV TEST"  # type: ignore[attr-defined]
    assert result.retry_no == 1
    assert result.error is None
    assert len(client.calls) == 2
    assert "JSONDecodeError" in client.calls[1]["prompt"]


def test_invalid_json_retries_and_fails_to_manual_review() -> None:
    """If both attempts return invalid JSON, outcome is MANUAL_REVIEW."""
    client = SequenceFakeStructuredClient(["NOT JSON AT ALL", "STILL NOT JSON"])
    result = FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    assert result.status == "MANUAL_REVIEW"
    assert result.validated_model is None
    assert result.retry_no == 1
    assert "JSONDecodeError" in result.error  # type: ignore[argument-type]
    assert len(client.calls) == 2


def test_schema_validation_failure_retries_and_succeeds() -> None:
    """If first attempt fails Pydantic validation but second succeeds, outcome is SUCCESS."""
    bad_payload = {"vessel_name": ""}
    client = SequenceFakeStructuredClient(
        [json.dumps(bad_payload), json.dumps(_NOON_VALID_PAYLOAD)]
    )
    result = FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    assert result.status == "SUCCESS"
    assert result.validated_model is not None
    assert result.retry_no == 1
    assert len(client.calls) == 2
    assert (
        "ValidationError" in client.calls[1]["prompt"]
        or "ValueError" in client.calls[1]["prompt"]
    )


def test_schema_validation_failure_retries_and_fails() -> None:
    """If both attempts fail Pydantic validation, outcome is MANUAL_REVIEW."""
    bad_payload = {"vessel_name": ""}
    client = SequenceFakeStructuredClient(
        [json.dumps(bad_payload), json.dumps(bad_payload)]
    )
    result = FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    assert result.status == "MANUAL_REVIEW"
    assert result.validated_model is None
    assert result.retry_no == 1
    assert "validation" in result.error.lower() or "value" in result.error.lower()  # type: ignore[union-attr]
    assert len(client.calls) == 2


def test_client_error_retries_and_succeeds() -> None:
    """If first attempt throws a client exception but second succeeds, outcome is SUCCESS."""
    client = SequenceFakeStructuredClient(
        [RuntimeError("API Gateway Timeout"), json.dumps(_NOON_VALID_PAYLOAD)]
    )
    result = FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    assert result.status == "SUCCESS"
    assert result.validated_model is not None
    assert result.retry_no == 1
    assert len(client.calls) == 2
    assert "RuntimeError" in client.calls[1]["prompt"]


def test_client_error_retries_and_fails() -> None:
    """If both attempts throw client exceptions, outcome is MANUAL_REVIEW."""
    client = SequenceFakeStructuredClient(
        [RuntimeError("API Gateway Timeout"), RuntimeError("Internal Server Error")]
    )
    result = FormParserService.parse_only(raw_text="x", form_type="Noon", client=client)

    assert result.status == "MANUAL_REVIEW"
    assert result.validated_model is None
    assert result.retry_no == 1
    assert "Internal Server Error" in result.error  # type: ignore[argument-type]
    assert len(client.calls) == 2


def test_bunkering_timestamp_order_validation_fails_initially() -> None:
    """BunkeringReportSchema invalid timestamps fail to validate initially."""
    inverted = {**_BUNKERING_VALID_PAYLOAD}
    inverted["bunkering_start_time"] = "2026-05-30T20:00:00+00:00"
    inverted["bunkering_end_time"] = "2026-05-30T08:00:00+00:00"
    client = SequenceFakeStructuredClient([json.dumps(inverted), json.dumps(inverted)])
    result = FormParserService.parse_only(
        raw_text="x", form_type="Bunkering", client=client
    )
    assert result.status == "MANUAL_REVIEW"
    assert result.validated_model is None


def test_sof_timestamp_order_validation_fails_initially() -> None:
    """StatementOfFactsSchema invalid timestamps fail to validate initially."""
    inverted = {**_SOF_VALID_PAYLOAD}
    inverted["arrival_time"] = "2026-05-31T14:00:00+00:00"
    inverted["departure_time"] = "2026-05-29T06:30:00+00:00"
    client = SequenceFakeStructuredClient([json.dumps(inverted), json.dumps(inverted)])
    result = FormParserService.parse_only(
        raw_text="x", form_type="Statement of Facts", client=client
    )
    assert result.status == "MANUAL_REVIEW"
    assert result.validated_model is None
