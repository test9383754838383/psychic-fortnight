# Block 10 — Tasks & Alerts · Specifications

No new technology. All references to existing ADRs.

## 1. Tech stack

| Concern | Choice | Source |
|---|---|---|
| Modules | New `alerts/` + `tasks/` modules | [ADR-0001] |
| Backend | Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2 | [ADR-0002] |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic | [ADR-0003] |
| DB | SQLite (dev/CI) · Postgres 18 (prod) | [ADR-0004] |
| Boundaries | Tach: alerts → voyage_spine, port_call, master_data, auth | [ADR-0010] |
| | Tach: tasks → voyage_spine, port_call, master_data, alerts, auth | [ADR-0010] |
| Auth | Session-based; authenticated user | [ADR-0016] |
| Tests | pytest real-DB; Vitest + RTL; Playwright | [ADR-0011] |
| Frontend | React + Vite + TS strict; openapi codegen; TanStack Query | [ADR-0005] |
| Reverse proxy | Caddy 2.x, automatic HTTPS | [ADR-0015] |
| Container | Docker Compose production profile | [ADR-0001] |

New backend dependency: none.
New frontend dependency: none.
New infra dependency: Docker Compose `caddy` service (Caddy 2.x, already
decided in [ADR-0015]).

## 2. API surface

### Alerts

```
POST  /api/v1/alerts                    create
GET   /api/v1/alerts                    global list (filtered)
GET   /api/v1/alerts/{id}              get one
POST  /api/v1/alerts/{id}/resolve      resolve
```

Alert update (edit) is not supported. Alerts are immutable after creation.

### Tasks

```
POST  /api/v1/tasks                     create
GET   /api/v1/tasks                     global list (filtered)
GET   /api/v1/tasks/{id}               get one
PATCH /api/v1/tasks/{id}               update (title, description, assigned_to,
                                         due_datetime, status, originating_alert_id)
```

No delete on either resource in V1.

### Workspace

```
GET   /api/v1/voyages/{id}/workspace   (existing) — adds has_exception: bool
```

`has_exception` is true when the voyage has ≥ 1 unresolved Warning/Critical
alert OR ≥ 1 non-Done task with `due_datetime < now`.

### Health

```
GET   /health                           unauthenticated; no /api/v1 prefix
```

## 3. DTOs

```jsonc
// AlertCreateDTO
{
  "linked_entity_type": "Voyage|PortCall|Vessel",
  "linked_entity_id": "uuid",
  "alert_type": "ETA Overdue|Departure Overdue|NOR Not Tendered|Agent Not Confirmed|Form Not Received|Bunker Request Blocked|Voyage Not Commenced|Performance Deviation|Consumption Deviation|Noon Report Missing",
  "message": "string",
  "severity": "Info|Warning|Critical"
}

// AlertResolveDTO
{ "resolution_note": "string?" }   // required when severity = Warning|Critical

// AlertReadDTO
{
  "id", "linked_entity_type", "linked_entity_id",
  "alert_type", "triggered_at", "message", "severity",
  "resolved_at?", "resolved_by?", "resolution_note?"
}

// AlertListParams (query)
{ "severity?": "Info|Warning|Critical",
  "resolved?": bool,
  "entity_type?": "Voyage|PortCall|Vessel",
  "limit?": int (default 50, max 200),
  "offset?": int }
```

```jsonc
// TaskCreateDTO
{
  "linked_entity_type": "Voyage|PortCall|Vessel",
  "linked_entity_id": "uuid",
  "title": "string",
  "description": "string?",
  "assigned_to": "uuid?",
  "due_datetime": "datetime?",
  "originating_alert_id": "uuid?"   // optional manual link to Alert
}

// TaskUpdateDTO  (all optional)
{ "title", "description", "assigned_to", "due_datetime",
  "status": "Open|In Progress|Blocked|Done",
  "originating_alert_id" }

// TaskReadDTO
{
  "id", "linked_entity_type", "linked_entity_id",
  "title", "description?", "assigned_to?", "due_datetime?",
  "status", "originating_alert_id?",
  "created_by", "created_at", "completed_at?"
}

// TaskListParams (query)
{ "status?": "Open|In Progress|Blocked|Done",
  "assigned_to?": "uuid",
  "entity_type?": "Voyage|PortCall|Vessel",
  "limit?": int (default 50, max 200),
  "offset?": int }
```

```jsonc
// HealthReadDTO
{ "status": "ok", "db": "ok" }
```

## 4. Error mapping

| Condition | HTTP |
|---|---|
| Unknown alert_type / severity / entity_type | 422 |
| Resolve Warning/Critical without resolution_note | 422 |
| Alert already resolved | 409 |
| Unknown task status | 422 |
| originating_alert_id references non-existent alert | 422 |
| Not found | 404 |
| Unauthenticated (any feature endpoint) | 401 |

## 5. D-entries

| ID | Decision | Default | Rationale |
|---|---|---|---|
| D-ENTRY-1 | Alert immutability | No edit after creation | Alerts are audit records; mutable alerts undermine trust. |
| D-ENTRY-2 | Task FSM | No enforced transitions | Task management is intentionally flexible; operators move freely between statuses. |
| D-ENTRY-3 | `completed_at` | Service-set on → Done | Client never passes it; prevents backdating. |
| D-ENTRY-4 | `has_exception` scope | Voyage-scoped only | Vessel Schedule Gantt is voyage-row-based; per-port-call dot is not in V1. |
| D-ENTRY-5 | Exception dot overdue window | `due_datetime < now()` at query time | No scheduler needed; computed on read. |
| D-ENTRY-6 | Pagination | limit/offset, max 200 | Cursor pagination is over-engineering at V1 volumes. |
| D-ENTRY-7 | Role gate | None in V1 | Operator discipline; same pattern as delays/checklists. |
| D-ENTRY-8 | Health endpoint prefix | `/health` (no `/api/v1`) | Caddy and infra tooling expect a bare path; api versioning doesn't apply to health checks. |
| D-ENTRY-9 | Image registry | ghcr.io (GitHub Container Registry) | Free for public repos; no extra credentials needed in CI given GITHUB_TOKEN. |
| D-ENTRY-10 | Frontend image VITE_API_BASE_URL | Build arg baked at image build time | Runtime env injection into a pre-built Vite bundle requires a script-injection workaround; build-arg is simpler and sufficient for V1. |

## 6. Deployment specifications

### docker-compose.prod.yml services

| Service | Image | Key config |
|---|---|---|
| `db` | `postgres:18-alpine` | named volume `pgdata`; `POSTGRES_*` env vars |
| `api` | `ghcr.io/<org>/erp-ops-api:<tag>` | `DATABASE_URL`, `SESSION_SECRET_KEY`, `OPENAI_API_KEY` from env |
| `frontend` | `ghcr.io/<org>/erp-ops-frontend:<tag>` | static Nginx-served build; `VITE_API_BASE_URL` baked at build |
| `caddy` | `caddy:2-alpine` | mounts `Caddyfile`; binds 80+443; health checks `api:8000/health` |

All secrets via environment variables. No secrets in image layers.

### Caddyfile (outline)

```
{domain} {
    reverse_proxy api:8000
    encode gzip
}
```

Caddy handles ACME automatically. No cert management scripts.

### CI image build job (outline)

Triggered on push to `main`. Steps: checkout → setup Docker Buildx →
login to `ghcr.io` → build + push `api` and `frontend` images tagged
`latest` + `${{ github.sha }}`.

## 7. Rejected alternatives

| Rejected | Why |
|---|---|
| Auto-generated alerts from rule engine | Over-engineering at V1 scale; no scheduler capacity allocated. Manual creation is sufficient for the first operator cohort. |
| Auto-spawn tasks from alerts | Explicitly out of scope — V1_ROADMAP §Block 10. |
| Un-resolve alert | Alerts are audit records; irreversible in V1. |
| Cursor-based pagination | Unnecessary complexity at V1 data volumes. |
| Nginx instead of Caddy | ADR-0015 already decided Caddy. |
| Kubernetes / ECS | Out of scope per ADR-0001 (on-prem Docker Compose). |
| Separate `POST /api/v1/voyages/{id}/alerts` route | Global alert endpoints are simpler; voyage scoping is a query-param filter, not a nested route. Consistent with global `/tasks`. |

## 8. Definition of done

All `project_description.md §Success criteria`, plus:
- OpenAPI regenerated and frontend types up to date.
- Coverage ≥ 95% on new backend modules.
- CI green including Postgres 18 migration smoke test.
- CI image-build job green on merge to `main`.
- `docs/tasks_alerts/runbook.md` written.
