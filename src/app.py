from fastapi import FastAPI
from src.exceptions import DomainError, domain_error_handler
from src.modules.master_data import router as master_data_router


def create_app() -> FastAPI:
    app = FastAPI(title="ERP Operations")

    app.add_exception_handler(DomainError, domain_error_handler)

    app.include_router(master_data_router, prefix="/api/v1")

    return app
