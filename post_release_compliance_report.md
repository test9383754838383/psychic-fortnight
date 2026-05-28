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
  - Backend: `src/config.py` (loads `Settings` from environment variables with local dev defaults) and `.env.example`.
  - Frontend: `frontend/src/api/client.ts` (resolves base API URL via `VITE_API_BASE_URL` with a fallback default of `/api`) and `frontend/vite.config.ts` (contains spec-locked local dev proxy/port, not production configuration).
- **Verification Step**: Confirm that settings are dynamically resolved at runtime through environment variables rather than hardcoded. Verify the frontend API client defaults to `/api` and that `vite.config.ts` is only used for local dev proxy configuration.

## 4. Backing Services
- **File/Config Pointer**: 
  - Backend: `src/dependencies.py` (async database session pool provisioning) and `alembic/env.py` (attaching the DB engine).
  - Frontend: API client in `frontend/src/api/client.ts` (attaching the backend REST API as a backing service).
- **Verification Step**: Connect backend to alternative SQLite/PostgreSQL instances using `DATABASE_URL` configurations without changing code. Verify that the frontend client points to the backend API backing service (using local proxy or `VITE_API_BASE_URL` runtime targets).

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
  - Backend: FastAPI/Uvicorn standard stdout/stderr logging.
  - Frontend: `console.error` in `frontend/src/lib/ErrorBoundary.tsx` and standard browser console logging.
- **Verification Step**: Verify that backend logs stream directly to standard stdout/stderr outputs instead of buffering to local files, and that unhandled frontend exceptions log detailed event info via `console.error`.

## 12. Admin Processes
- **File/Config Pointer**: `alembic/versions/` database revisions and `Makefile` (`migrate` command).
- **Verification Step**: Run `make migrate` to confirm that migration files run as one-off administrative scripts executed in the identical code release and execution context.

---

*Note: Factors 5 (Build, Release, Run), 8 (Concurrency), 9 (Disposability), and 10 (Dev/Prod Parity) are not fully release-verifiable in the application code until downstream deployment and infrastructure architecture work is implemented. As per `AGENTS.md` and `CLAUDE.md`, 12-Factor Agent factors do not apply because Block 3 contains no LLM or agent integrations.*
