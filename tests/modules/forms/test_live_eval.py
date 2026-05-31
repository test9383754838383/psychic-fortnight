"""Live LLM evaluation tests — SKIPPED in CI.

These tests call the real OpenAI API and are only executed when the
environment variable ``RUN_LLM_EVALS=1`` is set. They must NEVER run in
standard ``make check`` / pytest CI.

Usage (developer workstation only):
    RUN_LLM_EVALS=1 OPENAI_API_KEY=sk-... pytest tests/modules/forms/test_live_eval.py -v
"""

from __future__ import annotations

import os

import pytest

# Guard: skip the entire module unless explicitly opted in.
if not os.environ.get("RUN_LLM_EVALS"):
    pytest.skip(
        "Live eval tests skipped — set RUN_LLM_EVALS=1 to run.",
        allow_module_level=True,
    )

from src.modules.forms.llm.client import OpenAIStructuredClient  # noqa: E402
from src.modules.forms.service.parser import FormParserService, ParseOutcome  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

NOON_EMAIL = """\
Noon Report – MV TEST VESSEL – 31 May 2026 – 1200 UTC

Position: LAT 35°07.4'N, LON 120°39.2'W
Speed GPS: 12.5 kts
Speed Log: 12.2 kts
Distance to go: 1250 NM
Wind: BF5
Bunkers: FO 450 MT, DO 55 MT
"""

ARRIVAL_EMAIL = """\
Arrival Report – MV TEST VESSEL – Rotterdam – 29 May 2026 0630 UTC

Bunker ROB on Arrival: FO 380 MT, DO 48 MT
Draft fore 9.8m / aft 10.2m
"""


# ---------------------------------------------------------------------------
# Live tests
# ---------------------------------------------------------------------------


@pytest.mark.live
def test_live_noon_parse() -> None:
    """Noon email → real OpenAI call → NoonReportSchema populated."""
    client = OpenAIStructuredClient()
    result = FormParserService.parse_only(
        raw_text=NOON_EMAIL, form_type="Noon", client=client
    )

    assert isinstance(result, ParseOutcome)
    assert result.status == "SUCCESS"
    m = result.validated_model
    assert m is not None
    # Sanity-checks only (we cannot assert exact LLM values).
    assert m.vessel_name  # not empty
    assert -90 <= float(m.latitude) <= 90
    assert float(m.speed_gps) > 0
    assert result.input_tokens > 0


@pytest.mark.live
def test_live_arrival_parse() -> None:
    """Arrival email → real OpenAI call → ArrivalReportSchema populated."""
    client = OpenAIStructuredClient()
    result = FormParserService.parse_only(
        raw_text=ARRIVAL_EMAIL, form_type="Arrival", client=client
    )

    assert isinstance(result, ParseOutcome)
    assert result.status == "SUCCESS"
    m = result.validated_model
    assert m is not None
    assert m.vessel_name
    assert m.port_name
    assert float(m.bunker_fo_rob_mt) > 0
