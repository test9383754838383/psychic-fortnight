from src.exceptions import DomainError


class BunkerRobNotFoundError(DomainError):
    def __init__(self, rob_id: str) -> None:
        super().__init__(f"Bunker ROB {rob_id} not found", code="NOT_FOUND", status_code=404)


class InvalidFuelGradeError(DomainError):
    def __init__(self, grade: str) -> None:
        super().__init__(
            f"Invalid fuel grade: {grade!r}",
            code="INVALID_FUEL_GRADE",
            status_code=422,
        )
