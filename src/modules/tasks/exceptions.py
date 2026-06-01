from fastapi import status

from src.exceptions import DomainError


class TaskError(DomainError):
    """Base class for task domain errors."""


class TaskNotFoundError(TaskError):
    def __init__(self, task_id: str) -> None:
        super().__init__(
            f"Task with ID '{task_id}' not found.",
            code="TASK_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class TaskOriginatingAlertNotFoundError(TaskError):
    def __init__(self, alert_id: str) -> None:
        super().__init__(
            f"originating_alert_id '{alert_id}' references a non-existent alert.",
            code="TASK_ORIGINATING_ALERT_NOT_FOUND",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
