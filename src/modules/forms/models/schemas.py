from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class NoonReportSchema(BaseModel):
    vessel_name: str = Field(description="Name of the vessel")
    report_time: datetime = Field(description="UTC timestamp of the noon report")
    latitude: Decimal = Field(description="Current latitude in degrees")
    longitude: Decimal = Field(description="Current longitude in degrees")
    speed_gps: Decimal = Field(description="GPS speed in knots over the last 24h")
    speed_log: Decimal = Field(description="Log speed in knots over the last 24h")
    distance_to_go: Decimal = Field(
        description="Remaining distance to destination in nautical miles"
    )
    bunker_fo_rob_mt: Decimal = Field(
        description="Fuel oil remaining on board in metric tons"
    )
    bunker_do_rob_mt: Decimal = Field(
        description="Diesel oil remaining on board in metric tons"
    )
    wind_force_beaufort: Optional[int] = Field(
        default=None, description="Wind force in Beaufort scale"
    )

    @field_validator("vessel_name")
    @classmethod
    def validate_vessel_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Vessel name must not be empty")
        return v.strip()

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Decimal) -> Decimal:
        if not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90 degrees")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Decimal) -> Decimal:
        if not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180 degrees")
        return v

    @field_validator(
        "speed_gps",
        "speed_log",
        "distance_to_go",
        "bunker_fo_rob_mt",
        "bunker_do_rob_mt",
    )
    @classmethod
    def validate_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Value must be non-negative")
        return v

    @field_validator("wind_force_beaufort")
    @classmethod
    def validate_beaufort(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (0 <= v <= 12):
            raise ValueError("Wind force must be between 0 and 12 Beaufort")
        return v


class ArrivalReportSchema(BaseModel):
    vessel_name: str = Field(description="Name of the vessel")
    port_name: str = Field(description="Name of the port of arrival")
    arrival_time: datetime = Field(description="UTC timestamp of arrival")
    bunker_fo_rob_mt: Decimal = Field(
        description="Fuel oil remaining on board in metric tons"
    )
    bunker_do_rob_mt: Decimal = Field(
        description="Diesel oil remaining on board in metric tons"
    )
    draft_fore_m: Optional[Decimal] = Field(
        default=None, description="Draft at fore in meters"
    )
    draft_aft_m: Optional[Decimal] = Field(
        default=None, description="Draft at aft in meters"
    )

    @field_validator("vessel_name", "port_name")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("String field must not be empty")
        return v.strip()

    @field_validator("bunker_fo_rob_mt", "bunker_do_rob_mt")
    @classmethod
    def validate_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Value must be non-negative")
        return v

    @field_validator("draft_fore_m", "draft_aft_m")
    @classmethod
    def validate_optional_non_negative(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Draft must be non-negative")
        return v


class DepartureReportSchema(BaseModel):
    vessel_name: str = Field(description="Name of the vessel")
    port_name: str = Field(description="Name of the port of departure")
    departure_time: datetime = Field(description="UTC timestamp of departure")
    next_port_name: str = Field(description="Name of the next port of call")
    bunker_fo_rob_mt: Decimal = Field(
        description="Fuel oil remaining on board in metric tons"
    )
    bunker_do_rob_mt: Decimal = Field(
        description="Diesel oil remaining on board in metric tons"
    )
    draft_fore_m: Optional[Decimal] = Field(
        default=None, description="Draft at fore in meters"
    )
    draft_aft_m: Optional[Decimal] = Field(
        default=None, description="Draft at aft in meters"
    )

    @field_validator("vessel_name", "port_name", "next_port_name")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("String field must not be empty")
        return v.strip()

    @field_validator("bunker_fo_rob_mt", "bunker_do_rob_mt")
    @classmethod
    def validate_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Value must be non-negative")
        return v

    @field_validator("draft_fore_m", "draft_aft_m")
    @classmethod
    def validate_optional_non_negative(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Draft must be non-negative")
        return v


class BunkeringReportSchema(BaseModel):
    vessel_name: str = Field(description="Name of the vessel")
    port_name: str = Field(description="Name of the port where bunkering occurred")
    bunkering_start_time: datetime = Field(
        description="UTC timestamp of bunkering start"
    )
    bunkering_end_time: datetime = Field(description="UTC timestamp of bunkering end")
    bunker_fo_received_mt: Decimal = Field(
        description="Fuel oil received in metric tons"
    )
    bunker_do_received_mt: Decimal = Field(
        description="Diesel oil received in metric tons"
    )
    bunker_supplier: Optional[str] = Field(
        default=None, description="Name of the bunkering supplier"
    )

    @field_validator("vessel_name", "port_name")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("String field must not be empty")
        return v.strip()

    @field_validator("bunker_fo_received_mt", "bunker_do_received_mt")
    @classmethod
    def validate_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Value must be non-negative")
        return v

    @field_validator("bunker_supplier")
    @classmethod
    def validate_optional_string(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            return None
        return v.strip() if v else None

    @model_validator(mode="after")
    def validate_timestamps(self) -> "BunkeringReportSchema":
        if self.bunkering_start_time > self.bunkering_end_time:
            raise ValueError("Bunkering start time must be before end time")
        return self


class StatementOfFactsSchema(BaseModel):
    vessel_name: str = Field(description="Name of the vessel")
    port_name: str = Field(description="Name of the port")
    arrival_time: datetime = Field(description="UTC timestamp of arrival")
    departure_time: datetime = Field(description="UTC timestamp of departure")
    cargo_quantity_mt: Decimal = Field(
        description="Cargo quantity loaded or discharged in metric tons"
    )
    demurrage_rate_usd_per_day: Optional[Decimal] = Field(
        default=None, description="Demurrage rate in USD per day"
    )
    remarks: Optional[str] = Field(default=None, description="General remarks or notes")

    @field_validator("vessel_name", "port_name")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("String field must not be empty")
        return v.strip()

    @field_validator("cargo_quantity_mt")
    @classmethod
    def validate_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Cargo quantity must be non-negative")
        return v

    @field_validator("demurrage_rate_usd_per_day")
    @classmethod
    def validate_optional_non_negative(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Demurrage rate must be non-negative")
        return v

    @model_validator(mode="after")
    def validate_timestamps(self) -> "StatementOfFactsSchema":
        if self.arrival_time > self.departure_time:
            raise ValueError("Arrival time must be before departure time")
        return self
