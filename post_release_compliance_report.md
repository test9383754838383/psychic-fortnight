# Post-Release Compliance Report

This report verifies the applicable principles from the 12-Factor App methodology for the **Block 2 (Master Data)** releases. As per `AGENTS.md`, 12-Factor Agent principles do not apply as no LLM/agent integrations are present.

---

## Part A: Block 2 (Master Data) Compliance

### 1. Codebase
- **File/Config Pointer**: `.git/` tracking the single repository.
- **Verification Step**: Run `git remote -v` to confirm exactly one tracked source repository.

### 2. Dependencies
- **File/Config Pointer**: `pyproject.toml` and `uv.lock`.
- **Verification Step**: Run `uv sync` to confirm that all dependencies are explicitly declared.

### 3. Config
- **File/Config Pointer**: `src/config.py` (`Settings`) and `.env.example`.
- **Verification Step**: Review Settings to ensure config values load from environment variables and never hardcode secrets.

### 4. Backing Services
- **File/Config Pointer**: `src/dependencies.py` (engine generation), `alembic/env.py`, and `docker-compose.yml` (Postgres service).
- **Verification Step**: Boot Postgres via `docker compose up -d` and verify the app connects using the `DATABASE_URL` environment variable.

### 6. Processes
- **File/Config Pointer**: `src/modules/master_data/services/` (stateless services).
- **Verification Step**: Restart `uvicorn` development server (`make dev`) and verify API works cleanly.

### 7. Port Binding
- **File/Config Pointer**: `Makefile` (`dev` target).
- **Verification Step**: Run `make dev` and observe Uvicorn binding directly to port 8000.

### 11. Logs
- **File/Config Pointer**: FastAPI/Uvicorn standard stdout logging.
- **Verification Step**: Trigger an API error and verify the stack trace outputs directly to stdout.

### 12. Admin Processes
- **File/Config Pointer**: `alembic/versions/` and `Makefile` (`migrate` target).
- **Verification Step**: Execute `make migrate` to run database schema upgrades as a one-off task.
