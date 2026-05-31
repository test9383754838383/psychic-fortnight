# Block 7b Post-Release Compliance Report — Checklists

Applicable factors only.

## 1. Codebase
- File/config pointer: [src/modules/checklists](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/modules/checklists), [tests/modules/checklists](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/tests/modules/checklists), [alembic/versions/4106af3a8e44_add_checklists_tables.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/alembic/versions/4106af3a8e44_add_checklists_tables.py).
- One-step verification: Run `git status --short` and confirm the checklist backend change lives in the single tracked repository.

## 2. Dependencies
- File/config pointer: [pyproject.toml](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/pyproject.toml), [uv.lock](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/uv.lock).
- One-step verification: Run `UV_CACHE_DIR=.uv-cache uv sync` and confirm the backend installs without adding new package dependencies for checklists.

## 3. Config
- File/config pointer: [src/config.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/config.py), [docker-compose.yml](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/docker-compose.yml).
- One-step verification: Set `DATABASE_URL` to SQLite or Postgres and run `uv run alembic upgrade head`; the checklist module follows the same runtime config path without code changes.

## 4. Backing Services
- File/config pointer: [src/dependencies.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/dependencies.py), [alembic/env.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/alembic/env.py).
- One-step verification: Run `DATABASE_URL=postgresql+asyncpg://user:password@127.0.0.1:55432/erp_ops UV_CACHE_DIR=.uv-cache uv run alembic upgrade head` against a Postgres 18 container and confirm the checklist tables migrate cleanly.

## 5. Build, Release, Run
- File/config pointer: [Makefile](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/Makefile), [openapi/openapi.json](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/openapi/openapi.json).
- One-step verification: Run `UV_CACHE_DIR=.uv-cache make lint && UV_CACHE_DIR=.uv-cache make typecheck && UV_CACHE_DIR=.uv-cache make tach-check && UV_CACHE_DIR=.uv-cache make test` to verify the release artifact and runtime code from the same checkout.

## 6. Processes
- File/config pointer: [src/modules/checklists/service/checklist_service.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/modules/checklists/service/checklist_service.py).
- One-step verification: Restart the API and repeat checklist create/sign-off requests; checklist lifecycle state is persisted in the database, not in process memory.

## 7. Port Binding
- File/config pointer: [src/app.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/app.py), [Makefile](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/Makefile).
- One-step verification: Run `make dev` and confirm the checklist routes are served through the FastAPI process bound by Uvicorn.

## 10. Dev/Prod Parity
- File/config pointer: [docker-compose.yml](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/docker-compose.yml), [alembic/versions/4106af3a8e44_add_checklists_tables.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/alembic/versions/4106af3a8e44_add_checklists_tables.py).
- One-step verification: Start a clean `postgres:18` container and run the migration command above; this matches the production database family called for in the checklist spec.

## 11. Logs
- File/config pointer: [src/app.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/app.py).
- One-step verification: Run the API and observe request and failure output on stdout/stderr; the checklist module does not introduce file-based logging.

## 12. Admin Processes
- File/config pointer: [alembic/versions/4106af3a8e44_add_checklists_tables.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/alembic/versions/4106af3a8e44_add_checklists_tables.py), [scripts/generate_openapi.py](/Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/scripts/generate_openapi.py).
- One-step verification: Run `PYTHONPATH=. UV_CACHE_DIR=.uv-cache uv run python scripts/generate_openapi.py` and `UV_CACHE_DIR=.uv-cache uv run alembic upgrade head`; both execute as one-off admin tasks from the same code release.

12-Factor Agent does not apply here. The checklist backend adds no LLM, prompt, tool-calling, or autonomous agent surface.
