from decimal import Decimal
import pytest
from pydantic import ValidationError
from src.modules.forms.models.schemas import (
    NoonReportSchema,
    ArrivalReportSchema,
    DepartureReportSchema,
    BunkeringReportSchema,
    StatementOfFactsSchema,
)


def test_noon_report_validation_success() -> None:
    data = {
        "vessel_name": "MV Noon Star",
        "report_time": "2026-05-31T12:00:00Z",
        "latitude": "35.123456",
        "longitude": "-120.654321",
        "speed_gps": "12.5",
        "speed_log": "12.2",
        "distance_to_go": "1250.5",
        "bunker_fo_rob_mt": "450.2",
        "bunker_do_rob_mt": "55.8",
        "wind_force_beaufort": 5,
    }
    model = NoonReportSchema.model_validate(data)
    assert model.vessel_name == "MV Noon Star"
    assert model.latitude == Decimal("35.123456")
    assert model.wind_force_beaufort == 5


def test_noon_report_validation_optional_null() -> None:
    data = {
        "vessel_name": "MV Noon Star",
        "report_time": "2026-05-31T12:00:00Z",
        "latitude": "35.123456",
        "longitude": "-120.654321",
        "speed_gps": "12.5",
        "speed_log": "12.2",
        "distance_to_go": "1250.5",
        "bunker_fo_rob_mt": "450.2",
        "bunker_do_rob_mt": "55.8",
        "wind_force_beaufort": None,
    }
    model = NoonReportSchema.model_validate(data)
    assert model.wind_force_beaufort is None


def test_noon_report_validation_failures() -> None:
    base_data = {
        "vessel_name": "MV Noon Star",
        "report_time": "2026-05-31T12:00:00Z",
        "latitude": "35.123456",
        "longitude": "-120.654321",
        "speed_gps": "12.5",
        "speed_log": "12.2",
        "distance_to_go": "1250.5",
        "bunker_fo_rob_mt": "450.2",
        "bunker_do_rob_mt": "55.8",
        "wind_force_beaufort": None,
    }

    # Empty vessel name
    data = base_data.copy()
    data["vessel_name"] = "  "
    with pytest.raises(ValidationError):
        NoonReportSchema.model_validate(data)

    # Latitude out of bounds
    data = base_data.copy()
    data["latitude"] = "91.0"
    with pytest.raises(ValidationError):
        NoonReportSchema.model_validate(data)

    # Longitude out of bounds
    data = base_data.copy()
    data["longitude"] = "-181.0"
    with pytest.raises(ValidationError):
        NoonReportSchema.model_validate(data)

    # Negative speed
    data = base_data.copy()
    data["speed_gps"] = "-0.1"
    with pytest.raises(ValidationError):
        NoonReportSchema.model_validate(data)

    # Wind force out of bounds
    data = base_data.copy()
    data["wind_force_beaufort"] = 13
    with pytest.raises(ValidationError):
        NoonReportSchema.model_validate(data)


def test_bunkering_validation_timestamp_order() -> None:
    data = {
        "vessel_name": "MV Bunker King",
        "port_name": "Rotterdam",
        "bunkering_start_time": "2026-05-31T12:00:00Z",
        "bunkering_end_time": "2026-05-31T10:00:00Z",  # before start
        "bunker_fo_received_mt": "150.0",
        "bunker_do_received_mt": "20.0",
        "bunker_supplier": "Shell",
    }
    with pytest.raises(ValidationError) as exc_info:
        BunkeringReportSchema.model_validate(data)
    assert "start time must be before end time" in str(exc_info.value)


def test_sof_validation_timestamp_order() -> None:
    data = {
        "vessel_name": "MV Fact Carrier",
        "port_name": "Singapore",
        "arrival_time": "2026-05-31T15:00:00Z",
        "departure_time": "2026-05-31T12:00:00Z",  # before arrival
        "cargo_quantity_mt": "50000.0",
        "demurrage_rate_usd_per_day": "15000.0",
        "remarks": None,
    }
    with pytest.raises(ValidationError) as exc_info:
        StatementOfFactsSchema.model_validate(data)
    assert "Arrival time must be before departure time" in str(exc_info.value)


def test_arrival_report_validation_failures() -> None:
    """Test validation errors for empty strings, negative ROB, and negative drafts in ArrivalReportSchema."""
    base_data = {
        "vessel_name": "MV Arrival Star",
        "port_name": "Rotterdam",
        "arrival_time": "2026-05-31T12:00:00Z",
        "bunker_fo_rob_mt": "450.2",
        "bunker_do_rob_mt": "55.8",
        "draft_fore_m": "9.5",
        "draft_aft_m": "10.0",
    }

    # Empty vessel name
    data = base_data.copy()
    data["vessel_name"] = "  "
    with pytest.raises(ValidationError, match="String field must not be empty"):
        ArrivalReportSchema.model_validate(data)

    # Negative FO ROB
    data = base_data.copy()
    data["bunker_fo_rob_mt"] = "-1.0"
    with pytest.raises(ValidationError, match="Value must be non-negative"):
        ArrivalReportSchema.model_validate(data)

    # Negative draft
    data = base_data.copy()
    data["draft_fore_m"] = "-0.5"
    with pytest.raises(ValidationError, match="Draft must be non-negative"):
        ArrivalReportSchema.model_validate(data)


def test_departure_report_validation_failures() -> None:
    """Test validation errors for empty strings, negative ROB, and negative drafts in DepartureReportSchema."""
    base_data = {
        "vessel_name": "MV Departure Star",
        "port_name": "Rotterdam",
        "departure_time": "2026-05-31T12:00:00Z",
        "next_port_name": "Antwerp",
        "bunker_fo_rob_mt": "450.2",
        "bunker_do_rob_mt": "55.8",
        "draft_fore_m": "9.5",
        "draft_aft_m": "10.0",
    }

    # Empty next port name
    data = base_data.copy()
    data["next_port_name"] = ""
    with pytest.raises(ValidationError, match="String field must not be empty"):
        DepartureReportSchema.model_validate(data)

    # Negative DO ROB
    data = base_data.copy()
    data["bunker_do_rob_mt"] = "-10.0"
    with pytest.raises(ValidationError, match="Value must be non-negative"):
        DepartureReportSchema.model_validate(data)

    # Negative draft aft
    data = base_data.copy()
    data["draft_aft_m"] = "-1.5"
    with pytest.raises(ValidationError, match="Draft must be non-negative"):
        DepartureReportSchema.model_validate(data)


def test_bunkering_report_validation_failures() -> None:
    """Test validation errors for BunkeringReportSchema."""
    base_data = {
        "vessel_name": "MV Bunker King",
        "port_name": "Rotterdam",
        "bunkering_start_time": "2026-05-31T10:00:00Z",
        "bunkering_end_time": "2026-05-31T12:00:00Z",
        "bunker_fo_received_mt": "150.0",
        "bunker_do_received_mt": "20.0",
        "bunker_supplier": "Shell",
    }

    # Empty port name
    data = base_data.copy()
    data["port_name"] = "  "
    with pytest.raises(ValidationError, match="String field must not be empty"):
        BunkeringReportSchema.model_validate(data)

    # Negative received bunker
    data = base_data.copy()
    data["bunker_fo_received_mt"] = "-5.0"
    with pytest.raises(ValidationError, match="Value must be non-negative"):
        BunkeringReportSchema.model_validate(data)

    # Optional string blank handler
    data = base_data.copy()
    data["bunker_supplier"] = "   "
    model = BunkeringReportSchema.model_validate(data)
    assert model.bunker_supplier is None


def test_sof_report_validation_failures() -> None:
    """Test validation errors for StatementOfFactsSchema."""
    base_data = {
        "vessel_name": "MV Fact Carrier",
        "port_name": "Singapore",
        "arrival_time": "2026-05-31T12:00:00Z",
        "departure_time": "2026-05-31T15:00:00Z",
        "cargo_quantity_mt": "50000.0",
        "demurrage_rate_usd_per_day": "15000.0",
        "remarks": None,
    }

    # Empty port name
    data = base_data.copy()
    data["port_name"] = " "
    with pytest.raises(ValidationError, match="String field must not be empty"):
        StatementOfFactsSchema.model_validate(data)

    # Negative cargo
    data = base_data.copy()
    data["cargo_quantity_mt"] = "-100.0"
    with pytest.raises(ValidationError, match="Cargo quantity must be non-negative"):
        StatementOfFactsSchema.model_validate(data)

    # Negative demurrage
    data = base_data.copy()
    data["demurrage_rate_usd_per_day"] = "-500.0"
    with pytest.raises(ValidationError, match="Demurrage rate must be non-negative"):
        StatementOfFactsSchema.model_validate(data)
