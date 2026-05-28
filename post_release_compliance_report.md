# Block 2 Post-Release Compliance Report

This report verifies the applicable principles from the 12-Factor App methodology for the Block 2 (Master Data) release. As per `AGENTS.md`, 12-Factor Agent principles do not apply to this release, as Block 2 contains no LLM or agent integrations.

## 1. Codebase
- **File/Config Pointer**: `.git/` tracking the single repository.
- **Verification Step**: Run `git remote -v` to confirm exactly one tracked source repository for this codebase.

## 2. Dependencies
- **File/Config Pointer**: `pyproject.toml` and `uv.lock`.
- **Verification Step**: Run `uv sync` to confirm that all dependencies are explicitly declared and the environment can be cleanly rebuilt.

## 3. Config
- **File/Config Pointer**: `src/config.py` (`Settings`) and `.env.example`.
- **Verification Step**: Review `src/config.py` and `.env.example` to ensure that configuration values (such as `DATABASE_URL` and `SESSION_SECRET`) are declared in the settings class loading from the environment via `pydantic-settings` and never hardcoded with production secrets.

## 4. Backing Services
- **File/Config Pointer**: `src/dependencies.py` (which creates the async engine and provides `get_db_session`), `alembic/env.py`, `alembic.ini`, and `docker-compose.yml` (specifying the PostgreSQL container backing service).
- **Verification Step**: Start the Postgres container using `docker compose up -d`, supply the PostgreSQL connection string via the `DATABASE_URL` environment variable, and confirm the application connects successfully to the database backing service without modifying source code.

## 6. Processes
- **File/Config Pointer**: `src/modules/master_data/services/` (stateless service classes).
- **Verification Step**: Restart the local `uvicorn` development server (`make dev`) and confirm that API functionality continues seamlessly, relying only on the external database for state.

## 7. Port Binding
- **File/Config Pointer**: `Makefile` (`dev` target invoking `uvicorn`).
- **Verification Step**: Run `make dev` and observe that the application directly binds to port 8000 (or the port specified in the environment) without needing an external web server container.

## 11. Logs
- **File/Config Pointer**: FastAPI/Uvicorn standard logging configuration.
- **Verification Step**: Send an invalid request (e.g., duplicate UNLOCODE) to the API and observe that the error is emitted as an event stream to `stdout` rather than written to local log files.

## 12. Admin Processes
- **File/Config Pointer**: `alembic/versions/` for migrations and `Makefile` (`migrate` target).
- **Verification Step**: Execute `make migrate` to confirm that database migrations run as a one-off administrative process within the identical environment and codebase as the main application.

---
*Note: Factors 5 (Build, Release, Run), 8 (Concurrency), 9 (Disposability), and 10 (Dev/Prod Parity) are handled at the infrastructure/CI level and are not actively changed or verifiable through Block 2 application code edits.*
