from src.exceptions import DomainError


class CargoNotFoundError(DomainError):
    def __init__(self, cargo_id: str) -> None:
        super().__init__(f"Cargo {cargo_id} not found", status_code=404)


class InvalidCommodityError(DomainError):
    def __init__(self, value: str) -> None:
        super().__init__(f"Invalid commodity: {value}", status_code=422)


class InvalidUnitError(DomainError):
    def __init__(self, value: str) -> None:
        super().__init__(f"Invalid unit: {value}", status_code=422)
