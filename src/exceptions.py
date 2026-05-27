from fastapi import Request, status
from fastapi.responses import JSONResponse

class DomainError(Exception):
    """Base class for domain exceptions."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR", status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)

async def domain_error_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, DomainError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error", "code": "INTERNAL_ERROR"},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "code": exc.code},
    )
