"""Golden corpus regression tests.

Each fixture supplies (RAW_EMAIL, EXPECTED_JSON). The test injects
EXPECTED_JSON back through FakeStructuredClient and asserts that the
parser round-trips it cleanly into the target Pydantic schema.

Intention: these tests guard against schema regressions — if a field
is renamed or a validator tightened, at least one golden fixture will
break here before any CI promotion.

NO LIVE LLM CALLS.
"""

from __future__ import annotations

import json
from typing import Optional


from src.modules.forms.llm.client import StructuredResult
from src.modules.forms.service.parser import FormParserService, ParseOutcome


# ---------------------------------------------------------------------------
# Shared fake client (same as test_parser.py, intentionally inlined to keep
# golden tests self-contained)
# ---------------------------------------------------------------------------


class FakeStructuredClient:
    def __init__(self, raw_json: str) -> None:
        self._raw_json = raw_json

    def complete_structured(
        self,
        *,
        prompt: str,
        raw_text: str,
        json_schema: dict,
        model: Optional[str] = None,
    ) -> StructuredResult:
        return StructuredResult(
            raw_json=self._raw_json,
            input_tokens=0,
            output_tokens=0,
            latency_ms=0,
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_client(payload: dict) -> FakeStructuredClient:
    return FakeStructuredClient(json.dumps(payload))


# ---------------------------------------------------------------------------
# Noon golden fixtures
# ---------------------------------------------------------------------------


def test_golden_noon_1() -> None:
    from tests.modules.forms.golden import noon_1

    client = _make_client(noon_1.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=noon_1.RAW_EMAIL, form_type="Noon", client=client
    )

    assert isinstance(result, ParseOutcome)
    m = result.validated_model
    assert m is not None
    assert m.vessel_name == noon_1.EXPECTED_JSON["vessel_name"]  # type: ignore[attr-defined]
    assert m.wind_force_beaufort == noon_1.EXPECTED_JSON["wind_force_beaufort"]  # type: ignore[attr-defined]


def test_golden_noon_2() -> None:
    from tests.modules.forms.golden import noon_2

    client = _make_client(noon_2.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=noon_2.RAW_EMAIL, form_type="Noon", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.vessel_name == noon_2.EXPECTED_JSON["vessel_name"]  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Arrival golden fixtures
# ---------------------------------------------------------------------------


def test_golden_arrival_1() -> None:
    from tests.modules.forms.golden import arrival_1

    client = _make_client(arrival_1.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=arrival_1.RAW_EMAIL, form_type="Arrival", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.port_name == arrival_1.EXPECTED_JSON["port_name"]  # type: ignore[attr-defined]


def test_golden_arrival_2() -> None:
    from tests.modules.forms.golden import arrival_2

    client = _make_client(arrival_2.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=arrival_2.RAW_EMAIL, form_type="Arrival", client=client
    )
    m = result.validated_model
    assert m is not None
    # Optional fields absent in email should be None
    assert m.draft_fore_m is None  # type: ignore[attr-defined]
    assert m.draft_aft_m is None  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Departure golden fixtures
# ---------------------------------------------------------------------------


def test_golden_departure_1() -> None:
    from tests.modules.forms.golden import departure_1

    client = _make_client(departure_1.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=departure_1.RAW_EMAIL, form_type="Departure", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.next_port_name == departure_1.EXPECTED_JSON["next_port_name"]  # type: ignore[attr-defined]


def test_golden_departure_2() -> None:
    from tests.modules.forms.golden import departure_2

    client = _make_client(departure_2.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=departure_2.RAW_EMAIL, form_type="Departure", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.port_name == departure_2.EXPECTED_JSON["port_name"]  # type: ignore[attr-defined]
    assert m.draft_fore_m is None  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Bunkering golden fixtures
# ---------------------------------------------------------------------------


def test_golden_bunkering_1() -> None:
    from tests.modules.forms.golden import bunkering_1

    client = _make_client(bunkering_1.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=bunkering_1.RAW_EMAIL, form_type="Bunkering", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.bunker_supplier == bunkering_1.EXPECTED_JSON["bunker_supplier"]  # type: ignore[attr-defined]


def test_golden_bunkering_2() -> None:
    from tests.modules.forms.golden import bunkering_2

    client = _make_client(bunkering_2.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=bunkering_2.RAW_EMAIL, form_type="Bunkering", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.bunker_supplier is None  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Statement of Facts golden fixtures
# ---------------------------------------------------------------------------


def test_golden_sof_1() -> None:
    from tests.modules.forms.golden import sof_1

    client = _make_client(sof_1.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=sof_1.RAW_EMAIL, form_type="Statement of Facts", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.port_name == sof_1.EXPECTED_JSON["port_name"]  # type: ignore[attr-defined]
    assert m.remarks == sof_1.EXPECTED_JSON["remarks"]  # type: ignore[attr-defined]


def test_golden_sof_2() -> None:
    from tests.modules.forms.golden import sof_2

    client = _make_client(sof_2.EXPECTED_JSON)
    result = FormParserService.parse_only(
        raw_text=sof_2.RAW_EMAIL, form_type="Statement of Facts", client=client
    )
    m = result.validated_model
    assert m is not None
    assert m.demurrage_rate_usd_per_day is None  # type: ignore[attr-defined]
    assert m.remarks is None  # type: ignore[attr-defined]
