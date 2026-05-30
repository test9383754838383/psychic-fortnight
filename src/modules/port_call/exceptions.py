from fastapi import status
from src.exceptions import DomainError


class PortCallError(DomainError):
    """Base class for port call domain errors."""


class PortCallNotFoundError(PortCallError):
    def __init__(self, port_call_id: str):
        super().__init__(
            f"Port call with ID '{port_call_id}' not found.",
            code="PORT_CALL_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class IllegalPortCallTransitionError(PortCallError):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            f"Illegal status transition from '{from_status}' to '{to_status}'.",
            code="ILLEGAL_PORT_CALL_TRANSITION",
            status_code=status.HTTP_409_CONFLICT,
        )


class TimestampCoherenceError(PortCallError):
    def __init__(self, message: str):
        super().__init__(
            message,
            code="TIMESTAMP_COHERENCE_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class MissingMasterDataReferenceError(PortCallError):
    def __init__(
        self, field: str, ref_id: str, reason: str = "does not exist or is Inactive"
    ):
        super().__init__(
            f"Reference '{ref_id}' for field '{field}' is invalid: {reason}.",
            code="MISSING_MASTER_DATA_REFERENCE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class AgentRoleError(PortCallError):
    def __init__(self, counterparty_id: str):
        super().__init__(
            f"Counterparty '{counterparty_id}' does not have the Agent role.",
            code="AGENT_ROLE_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class DuplicateActiveAppointmentError(PortCallError):
    def __init__(self, port_call_id: str):
        super().__init__(
            f"Port call '{port_call_id}' already has an active agent appointment.",
            code="DUPLICATE_ACTIVE_APPOINTMENT",
            status_code=status.HTTP_409_CONFLICT,
        )


class CorrectionReasonRequiredError(PortCallError):
    def __init__(self) -> None:
        super().__init__(
            "Correction reason is required for backward status changes.",
            code="CORRECTION_REASON_REQUIRED",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class IllegalAgentAppointmentTransitionError(PortCallError):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            f"Illegal agent appointment transition from '{from_status}' to '{to_status}'.",
            code="ILLEGAL_AGENT_APPOINTMENT_TRANSITION",
            status_code=status.HTTP_409_CONFLICT,
        )


class PortCallCapExceededError(PortCallError):
    def __init__(self, max_cap: int):
        super().__init__(
            f"Port call cap of {max_cap} per voyage exceeded.",
            code="PORT_CALL_CAP_EXCEEDED",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class AgentAppointmentNotFoundError(PortCallError):
    def __init__(self, appointment_id: str):
        super().__init__(
            f"Agent appointment with ID '{appointment_id}' not found.",
            code="AGENT_APPOINTMENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )
