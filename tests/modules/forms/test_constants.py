from src.modules.forms.constants import FORM_TYPES


def test_form_types_exact_set() -> None:
    expected = {"Noon", "Arrival", "Departure", "Bunkering", "Statement of Facts"}
    assert FORM_TYPES == expected
