from fastapi import status

from src.exceptions import DomainError


class ChecklistError(DomainError):
    """Base class for checklist domain errors."""


class ChecklistNotFoundError(ChecklistError):
    def __init__(self, checklist_id: str) -> None:
        super().__init__(
            f"Checklist with ID '{checklist_id}' not found.",
            code="CHECKLIST_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ChecklistItemNotFoundError(ChecklistError):
    def __init__(self, item_id: str) -> None:
        super().__init__(
            f"Checklist item with ID '{item_id}' not found.",
            code="CHECKLIST_ITEM_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class InvalidChecklistTypeError(ChecklistError):
    def __init__(self, checklist_type: str) -> None:
        super().__init__(
            f"Checklist type '{checklist_type}' is invalid.",
            code="INVALID_CHECKLIST_TYPE",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
