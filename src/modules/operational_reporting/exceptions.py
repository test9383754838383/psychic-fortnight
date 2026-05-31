from fastapi import status as http_status
from src.exceptions import DomainError


class OperationalReportingError(DomainError):
    """Base class for operational reporting domain errors."""


class MissingReferenceError(OperationalReportingError):
    def __init__(self, entity: str, ref_id: str) -> None:
        super().__init__(
            f"{entity} with ID '{ref_id}' not found.",
            code="MISSING_REFERENCE",
            status_code=http_status.HTTP_404_NOT_FOUND,
        )


class IllegalReportTransitionError(OperationalReportingError):
    def __init__(self, from_status: str, to_status: str) -> None:
        super().__init__(
            f"Illegal report status transition from '{from_status}' to '{to_status}'.",
            code="ILLEGAL_REPORT_TRANSITION",
            status_code=http_status.HTTP_409_CONFLICT,
        )


class ReportTerminalStateError(OperationalReportingError):
    def __init__(self, report_id: str, current_status: str) -> None:
        super().__init__(
            f"Report '{report_id}' is in terminal state '{current_status}' and cannot be modified.",
            code="REPORT_TERMINAL_STATE",
            status_code=http_status.HTTP_409_CONFLICT,
        )


class InvalidReportAnchorError(OperationalReportingError):
    def __init__(self, detail: str) -> None:
        super().__init__(
            detail,
            code="INVALID_REPORT_ANCHOR",
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class ReportTypeAnchorMismatchError(OperationalReportingError):
    def __init__(self, report_type: str, anchor: str) -> None:
        super().__init__(
            f"Report type '{report_type}' is not valid for anchor '{anchor}'.",
            code="REPORT_TYPE_ANCHOR_MISMATCH",
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class MissingCorrectionReasonError(OperationalReportingError):
    def __init__(self) -> None:
        super().__init__(
            "correction_reason is required when corrects_activity_id is set.",
            code="MISSING_CORRECTION_REASON",
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class InvalidSupersededReportError(OperationalReportingError):
    def __init__(self, detail: str) -> None:
        super().__init__(
            detail,
            code="INVALID_SUPERSEDED_REPORT",
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class AppendOnlyViolationError(OperationalReportingError):
    def __init__(self, entity: str) -> None:
        super().__init__(
            f"{entity} is append-only. Update and delete operations are not permitted.",
            code="APPEND_ONLY_VIOLATION",
            status_code=http_status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class InvalidEventTypeError(OperationalReportingError):
    def __init__(self, event_type: str) -> None:
        super().__init__(
            f"Invalid event_type '{event_type}'.",
            code="INVALID_EVENT_TYPE",
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
