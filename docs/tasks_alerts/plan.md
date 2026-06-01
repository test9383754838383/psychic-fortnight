# Block 10 — Tasks & Alerts · Plan

M0 coordinator + three milestone terminals. No new technology. Binding
contract: this spec set. Land via branch + PR; merge only on founder's say-so.

Dependency: **M1 → M2 → M3.** Start M1 only after Block 9 M1 is merged to
main (avoids alembic/openapi collision).

---

## M0 — Coordinator prompt

```
You are the M0 coordinator for Block 10 — Tasks & Alerts of the Vessel &
Voyage Operations Control System. You coordinate; you do not write code. This
is the final V1 build block.

Read first, in full:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/tasks_alerts/project_description.md
- docs/tasks_alerts/architecture.md
- docs/tasks_alerts/specifications.md
- docs/delay_tracking/runbook.md  (most recent completed module — same shape)

IMPORTANT: Do not start M1 until Block 9 M1 is merged to main. Both blocks
touch alembic/versions/ and openapi/openapi.json; serialise to avoid conflicts.

Drive M1 → M2 → M3 in order. Independently verify each milestone — run gates
yourself. Land via branch + PR. Merge only on founder's say-so.
Co-author: "Claude Opus 4.8 <noreply@anthropic.com>".

Non-negotiables: TDD, real-DB tests, mypy --strict, no `any`, no eslint-disable,
Tach boundaries, ≥95% coverage on src/modules/alerts/ and src/modules/tasks/,
SQLite + Postgres 18 migration. E2e backend must start with TESTING=true.

When all three milestones are green and merged, write
docs/tasks_alerts/runbook.md and close the block (update PROJECT_CONTEXT.md,
V1_ROADMAP.md). V1 is complete.
```

---

## M1 — Backend

```
Implement the Tasks & Alerts backend — modules src/modules/alerts/ and
src/modules/tasks/. TDD, real-DB tests. Read CLAUDE.md,
docs/tasks_alerts/architecture.md, and docs/tasks_alerts/specifications.md
before writing.

IMPORTANT: Branch off current main AFTER Block 9 M1 is merged.

Build, behind failing tests first:

1. src/modules/alerts/
   models/: Alert — all fields per architecture.md §3. alert_type and
   severity as String+CheckConstraint. linked_entity_type as
   String+CheckConstraint ('Voyage','PortCall','Vessel'). resolved_at,
   resolved_by, resolution_note all nullable. Scalar FKs only. No ORM
   relationships back into voyage_spine or port_call.

   constants.py: ALERT_TYPES (10 values), SEVERITIES (3 values),
   LINKED_ENTITY_TYPES (3 values).

   repository/: advanced-alchemy repo.

   service/: AlertService:
   - create(dto, user): persist; triggered_at = now.
   - resolve(id, dto, user): if severity in (Warning, Critical) and
     resolution_note empty → raise 422. Set resolved_at=now,
     resolved_by=user, resolution_note. If already resolved → 409.
   - list(filters): query with severity/resolved/entity_type/limit/offset.

   api/: router + DTOs per specifications.md §3.
   All routes require get_current_user.

2. src/modules/tasks/
   models/: Task — all fields per architecture.md §3.
   originating_alert_id nullable FK to Alert. completed_at nullable.
   status as String+CheckConstraint (4 values).

   constants.py: TASK_STATUSES (4 values), LINKED_ENTITY_TYPES (3 values).

   repository/: advanced-alchemy repo.

   service/: TaskService:
   - create(dto, user): persist; created_by=user, status='Open',
     created_at=now. Validate originating_alert_id exists if provided → 422
     if not found.
   - update(id, dto): if status transitions to 'Done', set
     completed_at=now. No other side effects.
   - list(filters): query with status/assigned_to/entity_type/limit/offset.

   api/: router + DTOs per specifications.md §3.
   All routes require get_current_user.

3. core/health.py: GET /health (unauthenticated). Sync SELECT 1 DB ping.
   Returns {"status":"ok","db":"ok"}. Register on app outside /api/v1 prefix.

4. Workspace: add has_exception: bool to the existing
   GET /api/v1/voyages/{id}/workspace response. Computed per
   architecture.md §6 query. No new endpoint.

5. Tach config: alerts → voyage_spine, port_call, master_data, auth.
   tasks → voyage_spine, port_call, master_data, alerts, auth.

6. Register both modules. Alembic migration (two new tables); clean on SQLite
   AND Postgres 18. Regenerate + commit openapi/openapi.json.

Tests:
- Alert: create; resolve Info without note OK; resolve Warning/Critical
  without note → 422; resolve with note OK; already resolved → 409; list
  filtered by severity, resolved, entity_type.
- Task: create; status transitions Open→In Progress→Blocked→Done;
  completed_at set on Done, null otherwise; invalid status → 422;
  originating_alert_id FK validated; list filtered by status, assigned_to.
- Workspace: has_exception=true when unresolved Warning alert exists;
  has_exception=false when all resolved; has_exception=true when overdue
  open task exists.
- Health: GET /health → 200 {"status":"ok","db":"ok"}.
- Coverage ≥95% on src/modules/alerts/ and src/modules/tasks/.

Gates: make lint, make typecheck, make tach-check, make test; Postgres 18
migration smoke test. Report with actual gate output.
```

---

## M2 — Frontend

```
Implement the Tasks & Alerts frontend for Block 10. React + Vite + TS strict.
TDD. No `any`, no eslint-disable. Regenerate typed client from
openapi/openapi.json before writing any component.

Read CLAUDE.md, docs/tasks_alerts/specifications.md §3 before writing.

Build, behind failing tests first:

1. AlertsPanel — Voyage Workspace panel (no new route):
   - List of alerts with type, severity chip, message, triggered_at,
     resolved/unresolved state.
   - Create form: linked_entity_type (default Voyage), linked_entity_id
     (pre-filled from voyageId prop), alert_type, severity, message.
   - Resolve button: opens inline resolution form; resolution_note field
     (required label when severity=Warning/Critical); submit →
     POST /api/v1/alerts/{id}/resolve.
   - TanStack Query; refetch on create/resolve.
   - data-testid="alerts-panel" on outer wrapper.

2. TasksPanel — Voyage Workspace panel (no new route):
   - List of tasks with title, status chip, due_datetime, assigned_to,
     overdue indicator when due_datetime < now and status ≠ Done.
   - Create form: title, description, assigned_to, due_datetime,
     originating_alert_id (optional, manual).
   - Status dropdown per task card → PATCH /api/v1/tasks/{id}.
   - completed_at shown when Done.
   - TanStack Query; refetch on create/update.
   - data-testid="tasks-panel" on outer wrapper.

3. Mount both panels in VoyageWorkspacePage.tsx alongside existing panels
   (left column, below BunkerRequestPanel).

4. /alerts global page — route: /alerts.
   - Full alert feed; filter bar: severity, resolved (yes/no/all), entity_type.
   - Resolve action inline (same resolution form as AlertsPanel).
   - Pagination: load-more or page controls (limit/offset).

5. /tasks global page — route: /tasks.
   - Full task feed; filter bar: status, entity_type.
   - Status update inline.
   - Pagination: load-more or page controls.

6. Vessel Schedule exception dot:
   - Read has_exception from voyage workspace query (already returned by M1).
   - In the Vessel Schedule Gantt row, render a small dot indicator when
     has_exception=true. Dot is visual only — no click handler.

Tests: Vitest + RTL for AlertsPanel (list, create, resolve, resolution_note
required on Warning), TasksPanel (list, create, status transition, Done sets
timestamp, overdue indicator). MSW for API mocks.

Playwright e2e (two specs, workers=1, TESTING=true):
- alerts.spec.ts: navigate to workspace → create Critical alert → attempt
  resolve without note → error visible → resolve with note → alert shows
  resolved.
- tasks.spec.ts: navigate to workspace → create task → transition to
  In Progress → transition to Done → completed_at visible.

Gates: pnpm typecheck, lint, test, test:e2e (--workers=1),
npx eslint --no-inline-config, pnpm audit. Report with actual gate output.
```

---

## M3 — Deployment

```
Implement the production deployment artefacts for Block 10 / V1. No application
code changes — infrastructure only. Read CLAUDE.md,
docs/tasks_alerts/specifications.md §6 before writing.

Build:

1. docker-compose.prod.yml at repo root:
   Services: db (postgres:18-alpine, named volume pgdata, POSTGRES_* env
   vars), api (ghcr.io image, DATABASE_URL + SESSION_SECRET_KEY +
   OPENAI_API_KEY from env), frontend (ghcr.io image, static files served
   by the image's built-in server or Nginx), caddy (caddy:2-alpine, mounts
   ./Caddyfile, ports 80+443, health_checks pointing to api:8000/health).
   No dev hot-reload mounts. All secrets from environment — no hardcoded
   values in the file.

2. Caddyfile at repo root:
   {YOUR_DOMAIN} block with reverse_proxy api:8000 and encode gzip. Caddy
   handles ACME automatically. Include a comment noting that for air-gapped
   installs without Let's Encrypt, replace with tls /path/to/cert.pem
   /path/to/key.pem per ADR-0015.

3. Dockerfile.api at repo root (multi-stage):
   Stage 1 (builder): python:3.12-slim, install uv, copy pyproject.toml +
   uv.lock, uv sync --no-dev.
   Stage 2 (runtime): copy venv from builder, copy src/, expose 8000,
   CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"].

4. Dockerfile.frontend at repo root (multi-stage):
   Stage 1 (builder): node:22-alpine, install deps, build with
   VITE_API_BASE_URL build arg.
   Stage 2 (runtime): nginx:alpine, copy dist/ from builder,
   minimal nginx.conf serving on port 80.

5. .github/workflows/ci.yml — add new job `build-and-push` after the
   existing test jobs (depends-on: test):
   - Triggers on push to main only (not PRs).
   - Steps: checkout → setup Docker Buildx → login to ghcr.io using
     GITHUB_TOKEN → build+push Dockerfile.api tagged
     ghcr.io/${{ github.repository }}/api:latest and
     ghcr.io/${{ github.repository }}/api:${{ github.sha }} → same for
     Dockerfile.frontend with VITE_API_BASE_URL build arg from
     vars.VITE_API_BASE_URL (GitHub Actions variable, not a secret).

6. docs/deployment.md:
   - Full env var reference (DATABASE_URL, SESSION_SECRET_KEY, OPENAI_API_KEY,
     POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, VITE_API_BASE_URL).
   - Secrets management guidance: never commit .env files; use Docker secrets
     or a secrets manager in production.
   - First-boot checklist: clone repo → set env vars → docker compose -f
     docker-compose.prod.yml up -d → docker compose exec api uv run alembic
     upgrade head → verify GET /health → point DNS to server IP.
   - Caddy domain configuration instructions.
   - How to update: pull new image tags → docker compose up -d.

Smoke test (manual, documented in runbook):
   docker compose -f docker-compose.prod.yml up -d → curl http://localhost/health
   → expect {"status":"ok","db":"ok"}.

CI gate: the build-and-push job must be green on merge to main.
No new pytest tests for this milestone — deployment artefacts are verified by
the CI job and the manual smoke test. Existing test suite must remain green.

Gates: make lint, make typecheck, make test (full suite still green);
CI build-and-push job green on merge. Report with actual gate output.
```
