# Block 3 Post-Release Compliance Report

This report verifies the applicable principles from the 12-Factor App methodology for the Block 3 (Voyage Spine) release, which includes the backend API module and the frontend scaffold project.

---

## 1. Codebase
- **File/Config Pointer**: `.git/` tracking the single repository containing both the backend codebase and `frontend/` workspace.
- **Verification Step**: Run `git remote -v` to confirm exactly one tracked source repository for this codebase.

## 2. Dependencies
- **File/Config Pointer**: 
  - Backend: `pyproject.toml` and `uv.lock`.
  - Frontend: `frontend/package.json` and `frontend/pnpm-lock.yaml`.
- **Verification Step**: Run `uv sync` to confirm backend python environment installation, and run `cd frontend && pnpm install --frozen-lockfile` to confirm clean frontend dependency restoration.

## 3. Config
- **File/Config Pointer**: 
  - Backend: `src/config.py` (`Settings`) and `.env.example`.
  - Frontend: Proxy configuration in `frontend/vite.config.ts`.
- **Verification Step**: Review settings classes loading from the environment via `pydantic-settings` to verify no credentials, secrets, or ports are hardcoded in source code files.

## 4. Backing Services
- **File/Config Pointer**: 
  - Backend: `src/dependencies.py` (async database session pool provisioning) and `alembic/env.py`.
  - Frontend: API client in `frontend/src/api/client.ts` proxying the API layer.
- **Verification Step**: Connect backend to alternative SQLite/PostgreSQL instances using `DATABASE_URL` configurations without changing code. Verify the frontend routing connects to backend services via port proxy definitions.

## 6. Processes
- **File/Config Pointer**: 
  - Backend: `src/modules/voyage_spine/services/` and `src/modules/master_data/services/` (stateless service layers).
  - Frontend: Static HTML/JS bundle compiled under `frontend/dist/`.
- **Verification Step**: Run the development servers and confirm that restarting server instances yields seamless recovery, since no persistent state is kept in-process.

## 7. Port Binding
- **File/Config Pointer**: 
  - Backend: `Makefile` (`dev` target invoking uvicorn on port 8000).
  - Frontend: `frontend/vite.config.ts` (dev server binding on port 5173).
- **Verification Step**: Start backend and frontend to observe that each process exposes its service endpoints by binding directly to the configured local ports.

## 11. Logs
- **File/Config Pointer**: 
  - Backend: Standard structlog configuration writing directly to stdout/stderr.
  - Frontend: Client console APIs logging events to the web browser devtools.
- **Verification Step**: Check logs on the running processes and confirm that log entries stream directly to standard stdout/stderr streams instead of buffering into file writers.

## 12. Admin Processes
- **File/Config Pointer**: `alembic/versions/` database revisions and `Makefile` (`migrate` command).
- **Verification Step**: Run `make migrate` to confirm that migration files run as one-off administrative scripts executed in the identical code release and execution context.

---

*Note: Factors 5 (Build, Release, Run), 8 (Concurrency), 9 (Disposability), and 10 (Dev/Prod Parity) are managed at the CI pipeline or environment layout levels. As per `AGENTS.md` and `CLAUDE.md`, 12-Factor Agent factors do not apply because Block 3 contains no LLM or agent integrations.*
