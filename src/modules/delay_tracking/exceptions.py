from fastapi import status

from src.exceptions import DomainError


class DelayError(DomainError):
    """Base class for delay tracking domain errors."""


class DelayNotFoundError(DelayError):
    def __init__(self, delay_id: str) -> None:
        super().__init__(
            f"Delay with ID '{delay_id}' not found.",
            code="DELAY_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class DelayLockedError(DelayError):
    def __init__(self) -> None:
        super().__init__(
            "Delay is approved and locked — edits are not permitted.",
            code="DELAY_LOCKED",
            status_code=status.HTTP_409_CONFLICT,
        )


class DelayAnchorConflictError(DelayError):
    def __init__(self) -> None:
        super().__init__(
            "A delay cannot have both port_call_id and leg_ref set simultaneously.",
            code="DELAY_ANCHOR_CONFLICT",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
