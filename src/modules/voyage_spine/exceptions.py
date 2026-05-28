from fastapi import status
from src.exceptions import DomainError


class VoyageSpineError(DomainError):
    """Base class for voyage spine domain errors."""


class VoyageNotFoundError(VoyageSpineError):
    def __init__(self, voyage_id: str):
        super().__init__(
            f"Voyage with ID '{voyage_id}' not found.",
            code="VOYAGE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ItineraryLineNotFoundError(VoyageSpineError):
    def __init__(self, line_id: str):
        super().__init__(
            f"Itinerary line with ID '{line_id}' not found.",
            code="ITINERARY_LINE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class DuplicateVoyageNumberError(VoyageSpineError):
    def __init__(self, voyage_no: str):
        super().__init__(
            f"Voyage with number '{voyage_no}' already exists.",
            code="DUPLICATE_VOYAGE_NUMBER",
            status_code=status.HTTP_409_CONFLICT,
        )


class IllegalVoyageStatusTransitionError(VoyageSpineError):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            f"Illegal status transition from '{from_status}' to '{to_status}'.",
            code="ILLEGAL_VOYAGE_STATUS_TRANSITION",
            status_code=status.HTTP_409_CONFLICT,
        )


class InvalidPortFunctionError(VoyageSpineError):
    def __init__(self, port_function: str):
        super().__init__(
            f"Invalid port function: '{port_function}'.",
            code="INVALID_PORT_FUNCTION",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class InvalidCpTypeError(VoyageSpineError):
    def __init__(self, cp_type: str):
        super().__init__(
            f"Invalid CP type: '{cp_type}'.",
            code="INVALID_CP_TYPE",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class ItineraryLineCapExceededError(VoyageSpineError):
    def __init__(self, max_cap: int):
        super().__init__(
            f"Itinerary line cap of {max_cap} lines exceeded.",
            code="ITINERARY_LINE_CAP_EXCEEDED",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class MissingMasterDataReferenceError(VoyageSpineError):
    def __init__(
        self, field: str, ref_id: str, reason: str = "does not exist or is Inactive"
    ):
        super().__init__(
            f"Reference '{ref_id}' for field '{field}' is invalid: {reason}.",
            code="MISSING_MASTER_DATA_REFERENCE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
