# Block 6 Post-Release Compliance Report — Operational Reporting

This report verifies the applicable principles from the 12-Factor App methodology for the Block 6 (Operational Reporting) release.

---

## 1. Codebase
- **File/Config Pointer**: `.git/` tracking the single repository containing both the backend codebase and `frontend/` workspace.
- **Verification Step**: Run `git remote -v` to confirm exactly one tracked source repository for this codebase.

## 2. Dependencies
- **File/Config Pointer**: [pyproject.toml](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/pyproject.toml) and [uv.lock](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/uv.lock).
- **Verification Step**: Run `uv sync` to confirm python environment installation.

## 3. Config
- **File/Config Pointer**: [src/config.py](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/config.py) (loads `Settings` from environment variables with local defaults).
- **Verification Step**: Confirm that settings are dynamically resolved at runtime through environment variables rather than hardcoded.

## 4. Backing Services
- **File/Config Pointer**: [src/dependencies.py](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/dependencies.py) (async database session pool provisioning) and [alembic/env.py](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/alembic/env.py) (attaching DB engine).
- **Verification Step**: Connect backend to alternative SQLite/PostgreSQL instances using `DATABASE_URL` configurations without changing code.

## 6. Processes
- **File/Config Pointer**: [src/modules/operational_reporting/services/](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/src/modules/operational_reporting/services/) (stateless services).
- **Verification Step**: Run the development servers and confirm that restarting server instances yields seamless recovery, since no persistent state is kept in-process.

## 7. Port Binding
- **File/Config Pointer**: [Makefile](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/Makefile) (`dev` target invoking uvicorn on port 8000).
- **Verification Step**: Start backend and observe the process exposes its service endpoints by binding directly to port 8000.

## 10. Dev/Prod Parity
- **File/Config Pointer**: [.github/workflows/ci.yml](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/.github/workflows/ci.yml) (`migration-smoke-test` job running migrations on Postgres 18).
- **Verification Step**: The CI pipeline spins up a real `postgres:18` container to replay migration revision `a1b2c3d4e5f6` forward and backward to ensure Postgres 18 compatibility, matching the production environment.

## 11. Logs
- **File/Config Pointer**: Standard stdout/stderr logging via FastAPI/Uvicorn.
- **Verification Step**: Verify that backend logs stream directly to standard stdout/stderr outputs instead of buffering to local files.

## 12. Admin Processes
- **File/Config Pointer**: [alembic/versions/a1b2c3d4e5f6_add_operational_reporting_tables.py](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/alembic/versions/a1b2c3d4e5f6_add_operational_reporting_tables.py) database revision and [Makefile](file:///Users/theprince/Documents/LT DIMMARE/Product/ERP_Operations/Makefile) (`migrate` command).
- **Verification Step**: Run `make migrate` to confirm that migration files run as one-off administrative scripts executed in the identical code release and execution context.

---

*Note: As per `AGENTS.md` and `CLAUDE.md`, 12-Factor Agent factors do not apply because Block 6 contains no LLM or agent integrations.*
