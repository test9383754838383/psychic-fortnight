from fastapi import status
from src.exceptions import DomainError


class AuthError(DomainError):
    def __init__(
        self,
        message: str,
        code: str = "AUTH_ERROR",
        status_code: int = status.HTTP_401_UNAUTHORIZED,
    ):
        super().__init__(message, code, status_code)


class InvalidCredentialsError(AuthError):
    def __init__(self) -> None:
        super().__init__(
            "Invalid username or password",
            code="INVALID_CREDENTIALS",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class InactiveUserError(AuthError):
    def __init__(self) -> None:
        super().__init__(
            "User account is inactive",
            code="INACTIVE_USER",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class SessionExpiredError(AuthError):
    def __init__(self) -> None:
        super().__init__(
            "Session has expired",
            code="SESSION_EXPIRED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class SessionNotFoundError(AuthError):
    def __init__(self) -> None:
        super().__init__(
            "Session not found",
            code="SESSION_NOT_FOUND",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class RoleNotFoundError(AuthError):
    def __init__(self, role_name: str) -> None:
        super().__init__(
            f"Role not found: {role_name}",
            code="ROLE_NOT_FOUND",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class UsernameAlreadyExistsError(AuthError):
    def __init__(self, username: str) -> None:
        super().__init__(
            f"Username already exists: {username}",
            code="USERNAME_EXISTS",
            status_code=status.HTTP_409_CONFLICT,
        )


class UserNotFoundError(AuthError):
    def __init__(self, user_id: str) -> None:
        super().__init__(
            f"User not found: {user_id}",
            code="USER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class InsufficientPermissionsError(AuthError):
    def __init__(self) -> None:
        super().__init__(
            "Insufficient permissions",
            code="INSUFFICIENT_PERMISSIONS",
            status_code=status.HTTP_403_FORBIDDEN,
        )
