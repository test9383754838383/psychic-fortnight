from fastapi import status

from src.exceptions import DomainError


class BunkerRequestError(DomainError):
    """Base class for bunker request domain errors."""


class BunkerRequestNotFoundError(BunkerRequestError):
    def __init__(self, bunker_request_id: str) -> None:
        super().__init__(
            f"Bunker request with ID '{bunker_request_id}' not found.",
            code="BUNKER_REQUEST_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class IllegalTransitionError(BunkerRequestError):
    def __init__(self, current: str, target: str) -> None:
        super().__init__(
            f"Cannot transition bunker request from '{current}' to '{target}'.",
            code="ILLEGAL_TRANSITION",
            status_code=status.HTTP_409_CONFLICT,
        )


class BlockerNoteRequiredError(BunkerRequestError):
    def __init__(self) -> None:
        super().__init__(
            "blocker_note is required when transitioning to Blocked.",
            code="BLOCKER_NOTE_REQUIRED",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class BunkerRequestTerminalError(BunkerRequestError):
    def __init__(self) -> None:
        super().__init__(
            "Bunker request is in terminal state (Supplied) and cannot be modified.",
            code="BUNKER_REQUEST_TERMINAL",
            status_code=status.HTTP_409_CONFLICT,
        )
