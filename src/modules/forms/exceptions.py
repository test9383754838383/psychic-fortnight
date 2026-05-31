class FormError(Exception):
    """Base exception for forms module."""


class FormNotFoundError(FormError):
    def __init__(self, form_id: str):
        self.form_id = form_id
        super().__init__(f"Form '{form_id}' not found.")


class IllegalFormTransitionError(FormError):
    def __init__(self, current: str, target: str):
        self.current = current
        self.target = target
        super().__init__(f"Illegal transition from '{current}' to '{target}'.")


class FormTerminalStateError(FormError):
    def __init__(self, form_id: str, status: str):
        self.form_id = form_id
        self.status = status
        super().__init__(
            f"Form '{form_id}' is in terminal state '{status}' and cannot be modified."
        )


class FormPermissionError(FormError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message)


class FormAnchorError(FormError):
    def __init__(self, message: str):
        super().__init__(message)
