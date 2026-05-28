# Post-Release Compliance Report — Block 2 & Block 3 (M1)

This report verifies the applicable principles from the 12-Factor App methodology for the **Master Data** and **Voyage Spine (M1)** releases. 12-Factor Agent principles do not apply as there are no LLM or agent integrations in these modules.

## 1. Codebase
* **File/Config Pointer**: `.git/` tracking the single repository.
* **Verification Step**: Run `git remote -v` to confirm exactly one tracked source repository for this modular monolith.

## 2. Dependencies
* **File/Config Pointer**: `pyproject.toml` and `uv.lock`.
* **Verification Step**: Run `uv sync` to confirm that all backend dependencies (including advanced-alchemy and sqlalchemy) are explicitly declared and the virtual environment can be cleanly rebuilt.

## 3. Config
* **File/Config Pointer**: `src/config.py` (`Settings`) loading from environment variables.
* **Verification Step**: Review `src/config.py` to ensure that configuration values (like `DATABASE_URL`) are loaded from environment variables and never hardcoded in the codebase.

## 4. Backing Services
* **File/Config Pointer**: `src/dependencies.py` providing `get_db_session`, and `alembic/env.py`.
* **Verification Step**: Supply the database connection string via `DATABASE_URL` and confirm the app connects to the backing service (SQLite in dev/test, Postgres in prod) seamlessly.

## 6. Processes
* **File/Config Pointer**: stateless service classes in `src/modules/master_data/services/` and `src/modules/voyage_spine/services/`.
* **Verification Step**: Confirm that service states are persisted entirely in the database; restarting the dev server (`make dev`) retains all resources and entities.

## 7. Port Binding
* **File/Config Pointer**: `Makefile` (`dev` target invoking `uvicorn`).
* **Verification Step**: Run `make dev` and confirm that the application binds directly to the port (default 8000) and serves requests without relying on a web server container.

## 11. Logs
* **File/Config Pointer**: FastAPI/Uvicorn standard logging configuration.
* **Verification Step**: Make an invalid API call (e.g. illegal status transition) and observe the logs streaming to `stdout` rather than local log files.

## 12. Admin Processes
* **File/Config Pointer**: `alembic/versions/` migrations and `Makefile` (`migrate` target).
* **Verification Step**: Run `make migrate` to verify database schema updates execute as a one-off administrative command within the same environment.
