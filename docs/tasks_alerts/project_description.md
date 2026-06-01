# Block 10 — Tasks & Alerts · Project Description

## What this block is

Block 10 builds the **Tasks & Alerts** layer: a structured alert feed that
surfaces operational exceptions, and a task list that lets shore operators act
on them. It is the final V1 build block.

The block also carries the **deployment milestone** — the gap left open in
`V1_ROADMAP.md §GAP` is resolved here as the final milestone: production Docker
Compose, Caddy TLS, CI/CD image build + push, health endpoint, and env var
documentation.

(`V1_ROADMAP.md §Block 10`, `OPEN_DECISIONS.md §12`)

## Why it exists

By Block 9, every operational record exists — voyages, port calls, delays,
checklists, bunker requests, forms. What is missing is a way for the system to
surface exceptions proactively and for operators to track follow-up action.
Without alerts, exceptions go unnoticed. Without tasks, follow-up lives in email.

This block closes the operational loop: the system flags what needs attention,
the operator acts, and the action is tracked to completion.

## What it delivers

### Alert

- `alert_id`, `linked_entity_type` (`Voyage / PortCall / Vessel`),
  `linked_entity_id`.
- `alert_type` (10 values):
  `ETA Overdue / Departure Overdue / NOR Not Tendered / Agent Not Confirmed /
  Form Not Received / Bunker Request Blocked / Voyage Not Commenced /
  Performance Deviation / Consumption Deviation / Noon Report Missing`.
- `triggered_at`, `message` (free text, set at trigger time).
- `severity` (`Info / Warning / Critical`).
- `resolved_at`, `resolved_by` (User ref).
- `resolution_note` — mandatory for `Warning` and `Critical` severity; optional
  for `Info`.

Alerts are created manually by operators in V1. No rule-engine or scheduler
auto-generates alerts. Automated triggers are out of V1 scope.

### Task

- `task_id`, `linked_entity_type` (`Voyage / PortCall / Vessel`),
  `linked_entity_id`.
- `title` (required), `description` (optional).
- `assigned_to` (User ref), `due_datetime`.
- `status` (`Open / In Progress / Blocked / Done`).
- `originating_alert_ref` (optional — FK to Alert; set manually when the
  operator escalates an alert into a task; never auto-populated by the system).
- `created_by`, `created_at`, `completed_at` (set when status → Done).

Tasks do **not** auto-spawn from alerts in V1. Escalation is manual only —
an operator reads an alert, decides it needs follow-up, and creates a task with
the alert ref attached. (`V1_ROADMAP.md §Block 10`)

### Vessel Schedule exception dot

The dormant exception dot on the Vessel Schedule Gantt activates once this
block exists. It lights up when a voyage has at least one unresolved `Warning`
or `Critical` alert, or at least one `Open / In Progress / Blocked` task that
is past `due_datetime`. Dot is read-only; clicking it is not in V1 scope.

### Frontend

- An **Alerts panel** in the Voyage Workspace (no new route) — list, create,
  resolve.
- A **Tasks panel** in the Voyage Workspace — list, create, status transitions,
  mark Done.
- A standalone **Alert List page** (`/alerts`) — global feed, filterable by
  severity and entity type. Read/resolve from this view.
- A standalone **Task List page** (`/tasks`) — global feed, filterable by
  status and assignee.
- Vessel Schedule exception dot activation.

### Deployment milestone

Production-ready packaging for V1 ship:

- `docker-compose.prod.yml` — `api` + `db` (Postgres 18) + `caddy` services;
  named volumes for DB data; no dev hot-reload mounts.
- `Caddyfile` — reverse proxy to `api:8000`, automatic HTTPS (Let's Encrypt
  via Caddy ACME). TLS decision: [ADR-0015].
- CI/CD image build + push job — `ghcr.io` registry; triggered on `main`
  merge; tags `latest` + git SHA.
- `GET /health` endpoint — returns `{"status": "ok", "db": "ok"}` (live DB
  ping); consumed by Caddy health check and the CI smoke test.
- `docs/deployment.md` — canonical env var reference; secrets management
  guidance; how to point the domain; first-boot checklist.

## What it is NOT

- Not an automated rule engine. No alerts auto-fire from DB state.
- Not a notification/push system. Alerts are in-app only; email/SMS is out of
  V1.
- Not a full task-management system. No sub-tasks, no attachments, no comments.
- `Vessel`-linked alerts and tasks reference vessel by ID; no new Vessel CRUD
  is added.
- The exception dot is read-only. Clicking to filter by alert/task is not V1.

## Success criteria

- Operator creates an alert linked to a voyage; it appears in the Voyage
  Workspace Alerts panel and on the `/alerts` page.
- Operator resolves a `Critical` alert with a `resolution_note`; resolving
  without a note on `Warning/Critical` is rejected (422).
- Operator creates a task from the Voyage Workspace Tasks panel; status
  transitions `Open → In Progress → Done` work correctly; `completed_at` is
  set on Done.
- Operator manually links a task to an alert via `originating_alert_ref`.
- Vessel Schedule exception dot is visible on a voyage with an unresolved
  `Warning/Critical` alert or an overdue open task.
- `GET /health` returns 200 `{"status": "ok", "db": "ok"}`.
- `docker-compose.prod.yml up` brings up a working stack (manual smoke test
  documented in runbook).
- `make lint`, `make typecheck`, `tach check`, `make test` pass; coverage ≥ 95%
  on new backend code.
- CI image-build job produces a tagged image on merge to `main`.
