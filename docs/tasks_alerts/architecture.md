# Block 10 — Tasks & Alerts · Architecture

Two CRUD modules (`alerts`, `tasks`) + a one-line activation on the Vessel
Schedule exception dot + a deployment milestone. No new technology.

## 1. System overview

```
  Voyage / PortCall / Vessel
        │
        ├──▶ Alert  (create / list / resolve)
        │         └── resolution_note required for Warning/Critical
        │
        └──▶ Task   (create / list / transition / done)
                   └── originating_alert_ref? (manual FK, never auto-set)

  Vessel Schedule Gantt
        └── exception dot  (read DB: open critical/warning alert OR overdue task)

  /alerts   global alert feed
  /tasks    global task feed
```

Both modules depend on `voyage_spine`, `port_call`, `master_data` (Vessel ref),
and `auth`. No reverse imports.

## 2. Module layout

```
src/modules/alerts/
  api/          FastAPI router + DTOs
  service/      AlertService (create, resolve)
  repository/   advanced-alchemy repo
  models/       SQLAlchemy ORM model
  constants.py  ALERT_TYPES (10), SEVERITIES (3)

src/modules/tasks/
  api/          FastAPI router + DTOs
  service/      TaskService (create, update_status, complete)
  repository/   advanced-alchemy repo
  models/       SQLAlchemy ORM model
  constants.py  TASK_STATUSES (4), LINKED_ENTITY_TYPES (3)
```

Two modules, not one. Alerts and Tasks are distinct entities with different
lifecycles; shared constants (entity types) are duplicated in each
`constants.py` — no cross-module shared constant file.

## 3. Data models

```
Alert
  id                  UUID PK (app-side)
  linked_entity_type  String + CheckConstraint ('Voyage','PortCall','Vessel')
  linked_entity_id    UUID
  alert_type          String + CheckConstraint (10 values)
  triggered_at        datetime (default now)
  message             String
  severity            String + CheckConstraint ('Info','Warning','Critical')
  resolved_at         datetime (nullable)
  resolved_by         UUID FK (User, nullable)
  resolution_note     String (nullable — mandatory enforced in service layer
                               for Warning/Critical, not at DB level)
```

```
Task
  id                   UUID PK (app-side)
  linked_entity_type   String + CheckConstraint ('Voyage','PortCall','Vessel')
  linked_entity_id     UUID
  title                String
  description          String (nullable)
  assigned_to          UUID FK (User, nullable)
  due_datetime         datetime (nullable)
  status               String + CheckConstraint ('Open','In Progress',
                                                  'Blocked','Done')
  originating_alert_id UUID FK (Alert, nullable — manual only)
  created_by           UUID FK (User)
  created_at           datetime (default now)
  completed_at         datetime (nullable — set in service when status → Done)
```

`completed_at` is set by the service layer when `status` transitions to `Done`,
not passed by the client.

No ORM relationships that reach back into `voyage_spine` or `port_call`. Scalar
FKs only, same as every prior block.

## 4. Resolution logic

```
POST /api/v1/alerts/{id}/resolve
  body: { resolution_note?: str }
  → if severity in (Warning, Critical) and resolution_note is empty → 422
  → set resolved_at = now, resolved_by = current_user, resolution_note = body.note
```

Resolution is irreversible in V1. No un-resolve.

## 5. Task status transitions

No enforced FSM. Any authenticated user may move a task to any status. The
`LEGAL_TRANSITIONS` guard is not applied here — task management is intentionally
flexible. `completed_at` timestamp side-effect only fires on `→ Done`.

## 6. Exception dot query

```sql
SELECT EXISTS (
  SELECT 1 FROM alerts
  WHERE linked_entity_type = 'Voyage'
    AND linked_entity_id   = :voyage_id
    AND resolved_at IS NULL
    AND severity IN ('Warning', 'Critical')
  UNION ALL
  SELECT 1 FROM tasks
  WHERE linked_entity_type = 'Voyage'
    AND linked_entity_id   = :voyage_id
    AND status NOT IN ('Done')
    AND due_datetime < now()
)
```

Returned as `has_exception: bool` on the existing
`GET /api/v1/voyages/{id}/workspace` response — a one-field addition, not a new
endpoint. The Vessel Schedule Gantt already reads the workspace response; it
renders the dot when `has_exception` is true.

## 7. Global feed endpoints

```
GET /api/v1/alerts?severity=&resolved=&entity_type=&limit=&offset=
GET /api/v1/tasks?status=&assigned_to=&entity_type=&limit=&offset=
```

Simple query-param filtering. No cursor pagination in V1. `limit` defaults to
50, max 200.

## 8. Health endpoint

```
GET /health
→ 200 { "status": "ok", "db": "ok" }
```

Single sync DB ping (`SELECT 1`). Not behind auth. Consumed by Caddy's
`health_checks` directive and the CI smoke test.

Placed in the `core` module (not inside any feature module) since it is
infrastructure, not domain.

## 9. Deployment artefacts

New files, no changes to existing application code:

```
docker-compose.prod.yml     api + db (Postgres 18) + caddy; named volumes
Caddyfile                   reverse proxy → api:8000; automatic HTTPS
.github/workflows/ci.yml    new job: build + push image to ghcr.io on main
docs/deployment.md          env var reference; first-boot checklist
```

`VITE_API_BASE_URL` build arg baked into the frontend image at build time.
All secrets (DB password, OpenAI key) via environment variables per 12-Factor.

## 10. Auth

All feature endpoints require `get_current_user`. No role gate in V1.
`GET /health` is unauthenticated.

## 11. Test architecture

Real-DB [ADR-0011]:
- Alert CRUD: create; resolve Info without note OK; resolve Warning/Critical
  without note → 422; resolve with note OK; re-resolve → 409.
- Task CRUD: create; status transitions; Done sets `completed_at`; invalid
  status → 422.
- Exception dot: workspace returns `has_exception=true` when unresolved
  Warning/Critical alert exists; false when all resolved.
- Global feeds: filter by severity, status, entity_type.
- Health: `GET /health` returns 200 with `{"status":"ok","db":"ok"}`.

Frontend: Vitest + RTL for panels; Playwright e2e alert + task lifecycle
(create → resolve / create → Done).

## 12. Milestones

M1 backend · M2 frontend · M3 deployment. Detail in `plan.md`.
