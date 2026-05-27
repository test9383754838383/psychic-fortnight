from fastapi import status
from src.exceptions import DomainError

class MasterDataError(DomainError):
    """Base class for master data domain errors."""

class VesselError(MasterDataError):
    """Base class for vessel domain errors."""

class DuplicateVesselCodeError(VesselError):
    def __init__(self, code: str):
        super().__init__(
            f"Vessel with code '{code}' already exists.", 
            code="DUPLICATE_VESSEL_CODE",
            status_code=status.HTTP_409_CONFLICT
        )

class InvalidIMOError(VesselError):
    def __init__(self, imo: str):
        super().__init__(f"Invalid IMO number: '{imo}'. Must be 7 digits.", code="INVALID_IMO")

class InvalidVesselTypeError(VesselError):
    def __init__(self, vessel_type: str):
        super().__init__(f"Invalid vessel type: '{vessel_type}'.", code="INVALID_VESSEL_TYPE")

class InvalidVesselStatusError(VesselError):
    def __init__(self, status: str):
        super().__init__(f"Invalid vessel status: '{status}'.", code="INVALID_VESSEL_STATUS")

class VesselNotFoundError(VesselError):
    def __init__(self, vessel_id: str):
        super().__init__(
            f"Vessel with ID '{vessel_id}' not found.", 
            code="VESSEL_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
