from fastapi import status
from src.exceptions import DomainError


class MasterDataError(DomainError):
    """Base class for master data domain errors."""


# --- Vessel Exceptions ---


class VesselError(MasterDataError):
    """Base class for vessel domain errors."""


class DuplicateVesselCodeError(VesselError):
    def __init__(self, code: str):
        super().__init__(
            f"Vessel with code '{code}' already exists.",
            code="DUPLICATE_VESSEL_CODE",
            status_code=status.HTTP_409_CONFLICT,
        )


class InvalidIMOError(VesselError):
    def __init__(self, imo: str):
        super().__init__(
            f"Invalid IMO number: '{imo}'. Must be 7 digits.", code="INVALID_IMO"
        )


class InvalidVesselTypeError(VesselError):
    def __init__(self, vessel_type: str):
        super().__init__(
            f"Invalid vessel type: '{vessel_type}'.", code="INVALID_VESSEL_TYPE"
        )


class InvalidVesselStatusError(VesselError):
    def __init__(self, status: str):
        super().__init__(
            f"Invalid vessel status: '{status}'.", code="INVALID_VESSEL_STATUS"
        )


class VesselNotFoundError(VesselError):
    def __init__(self, vessel_id: str):
        super().__init__(
            f"Vessel with ID '{vessel_id}' not found.",
            code="VESSEL_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


# --- Port Exceptions ---


class PortError(MasterDataError):
    """Base class for port domain errors."""


class DuplicatePortUnlocodeError(PortError):
    def __init__(self, unlocode: str):
        super().__init__(
            f"Port with UN/LOCODE '{unlocode}' already exists.",
            code="DUPLICATE_PORT_UNLOCODE",
            status_code=status.HTTP_409_CONFLICT,
        )


class InvalidUnlocodeError(PortError):
    def __init__(self, unlocode: str, reason: str = "Invalid format"):
        super().__init__(
            f"Invalid UN/LOCODE '{unlocode}': {reason}.",
            code="INVALID_UNLOCODE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class InvalidPortCoordinatesError(PortError):
    def __init__(self, message: str):
        super().__init__(
            message,
            code="INVALID_PORT_COORDINATES",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class PortNotFoundError(PortError):
    def __init__(self, port_id: str):
        super().__init__(
            f"Port with ID '{port_id}' not found.",
            code="PORT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class InvalidPortStatusError(PortError):
    def __init__(self, status_val: str):
        super().__init__(
            f"Invalid port status: '{status_val}'.", code="INVALID_PORT_STATUS"
        )


# --- Counterparty & CounterpartyRole Exceptions ---


class CounterpartyError(MasterDataError):
    """Base class for counterparty domain errors."""


class DuplicateCounterpartyCodeError(CounterpartyError):
    def __init__(self, code: str):
        super().__init__(
            f"Counterparty with code '{code}' already exists.",
            code="DUPLICATE_COUNTERPARTY_CODE",
            status_code=status.HTTP_409_CONFLICT,
        )


class CounterpartyNotFoundError(CounterpartyError):
    def __init__(self, counterparty_id: str):
        super().__init__(
            f"Counterparty with ID '{counterparty_id}' not found.",
            code="COUNTERPARTY_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class InvalidCounterpartyStatusError(CounterpartyError):
    def __init__(self, status_val: str):
        super().__init__(
            f"Invalid counterparty status: '{status_val}'.",
            code="INVALID_COUNTERPARTY_STATUS",
        )


class DuplicateCounterpartyRoleError(CounterpartyError):
    def __init__(self, counterparty_id: str, role: str):
        super().__init__(
            f"Counterparty with ID '{counterparty_id}' already has role '{role}'.",
            code="DUPLICATE_COUNTERPARTY_ROLE",
            status_code=status.HTTP_409_CONFLICT,
        )


class CounterpartyRoleNotFoundError(CounterpartyError):
    def __init__(self, counterparty_id: str, role: str):
        super().__init__(
            f"Role '{role}' not found for counterparty with ID '{counterparty_id}'.",
            code="COUNTERPARTY_ROLE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class InvalidAgentFieldsError(CounterpartyError):
    def __init__(self, reason: str):
        super().__init__(
            f"Invalid agent fields: {reason}.",
            code="INVALID_AGENT_FIELDS",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class AgentFieldsNotAllowedError(CounterpartyError):
    def __init__(self, role: str):
        super().__init__(
            f"Agent fields are not allowed for role '{role}'.",
            code="AGENT_FIELDS_NOT_ALLOWED",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class InvalidCounterpartyRoleError(CounterpartyError):
    def __init__(self, role: str):
        super().__init__(
            f"Invalid role: '{role}'.",
            code="INVALID_COUNTERPARTY_ROLE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class InvalidCounterpartyContactsError(CounterpartyError):
    def __init__(self, reason: str):
        super().__init__(
            f"Invalid contacts format: {reason}.",
            code="INVALID_COUNTERPARTY_CONTACTS",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
