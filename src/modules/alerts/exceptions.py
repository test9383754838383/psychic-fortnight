from fastapi import status

from src.exceptions import DomainError


class AlertError(DomainError):
    """Base class for alert domain errors."""


class AlertNotFoundError(AlertError):
    def __init__(self, alert_id: str) -> None:
        super().__init__(
            f"Alert with ID '{alert_id}' not found.",
            code="ALERT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class AlertAlreadyResolvedError(AlertError):
    def __init__(self) -> None:
        super().__init__(
            "Alert is already resolved.",
            code="ALERT_ALREADY_RESOLVED",
            status_code=status.HTTP_409_CONFLICT,
        )


class AlertResolutionNoteRequiredError(AlertError):
    def __init__(self) -> None:
        super().__init__(
            "resolution_note is required for Warning and Critical severity alerts.",
            code="ALERT_RESOLUTION_NOTE_REQUIRED",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
