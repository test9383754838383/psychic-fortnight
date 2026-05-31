# Block 6 — Operational Reporting · Terminal Prompts

**Total terminals:** M0 + 2 milestone terminals.
M0 is the coordinator — no code, stays open the whole time.
M1 and M2 are each a fresh coding terminal.
Working directory for all terminals: `ERP_Operations/`.

## Milestone split rationale

- **M1 owns the backend.** New `operational_reporting` module: PortActivity +
  ActivityLog + OperationalReport models, migration, repositories, two services
  (append-only event logging, report state machine + supersession), API, tests.
  Mirrors the Block 5 vertical slice. This block's danger lives here — the
  append-only enforcement, the XOR anchor constraint, the supersession chain,
  and the role-gated state machine. M1 must prove all of it before any frontend.
- **M2 owns the frontend.** EventLog panel + Reports panel inside the existing
  Voyage Workspace. Consumes M1's OpenAPI contract.

M2 cannot start until M1's OpenAPI schema is committed (frontend types are
generated from it). Two milestones is the right shape. ([ADR-0012])

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator for Block 6 — Operational Reporting of the Vessel & Voyage Operations Control System. You do not write code. Your only job is to guide me through building this block one milestone at a time.

Read these files now, in order:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0012-per-block-four-doc-workflow.md
- docs/adr/0016-session-auth-implementation.md
- OPEN_DECISIONS.md
- docs/port_call/runbook.md
- docs/operational_reporting/project_description.md
- docs/operational_reporting/architecture.md
- docs/operational_reporting/specifications.md
- docs/operational_reporting/locked_decisions.md
- docs/operational_reporting/plan.md

These are the full spec and your coordination map. When you are done, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1 → M2 in sequence:
- Tell me which milestone is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then move to the next milestone

If I report a problem or blocker in any terminal, help me diagnose it. Do not move forward until the current milestone's done condition is fully met.

TDD rule for every milestone: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Real-DB tests only on the backend. No mocked persistence. No fakes. No in-memory stubs for SQLAlchemy.

Critical boundary rule: operational_reporting may import only from port_call, voyage_spine, master_data, and auth PUBLIC surfaces. None of those modules may ever import operational_reporting. No ORM relationship from PortCall or Voyage into operational_reporting — scalar FKs only.

Critical append-only rule: PortActivity and ActivityLog rows are never updated or deleted. No UPDATE/DELETE endpoints, service guards reject mutation, no updated_at column. Corrections are new rows (PortActivity self-FK chain; OperationalReport supersession row).

Do not write code. Do not suggest code. Coordinate only.

When M2 is green, remind me to write docs/operational_reporting/runbook.md before declaring the block done (per [ADR-0012]).
```

---

## M1 — Operational Reporting API (backend module)

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0016-session-auth-implementation.md
- docs/port_call/runbook.md
- docs/operational_reporting/project_description.md
- docs/operational_reporting/architecture.md
- docs/operational_reporting/specifications.md
- docs/operational_reporting/locked_decisions.md

Blocks 2–5 are shipped and green. The port_call module (PortCall, AgentAppointment), voyage_spine (Voyage, ItineraryLine), master_data (Vessel, Port, Counterparty), and auth (User, roles) all exist with public surfaces. Reuse the Block 5 vertical-slice pattern verbatim (model → repository → service → API → tests).

Implement M1 — Operational Reporting API.

## 1. Module scaffold

Create `src/modules/operational_reporting/` with subpackages `api/`, `services/`, `repositories/`, `models/`, plus `exceptions.py` and `__init__.py`. Mirror the port_call layout.

Update `tach.toml`: declare `src.modules.operational_reporting`. It may import only from `src.modules.port_call`, `src.modules.voyage_spine`, `src.modules.master_data`, and `src.modules.auth` PUBLIC surfaces. Forbid external imports of `operational_reporting.repositories.*` and `operational_reporting.models.*`. Confirm port_call, voyage_spine, and auth do NOT depend on operational_reporting.

If the port_call / voyage_spine / master_data / auth public surfaces lack the validators this block needs (port call exists, voyage exists, user exists), add minimal public validators to those modules' `__init__.py` — do not reach into their internals from operational_reporting.

## 2. Models and migration

- `models/port_activity.py` — `PortActivity` + `ActivityLog` per architecture §3.1/§3.2.
  - PortActivity: UUIDv4 PK. Scalar FK `port_call_id` → port_calls.id (required), `recorded_by_user_id` → users.id (required). `event_type` String + CheckConstraint (21 values, D-32/D-LOCK-4). `event_timestamp` DateTime UTC. `notes` Text nullable. `corrects_activity_id` self-FK nullable. `correction_reason` Text nullable. CheckConstraint: correction_reason NOT NULL when corrects_activity_id set. `created_at` only — NO `updated_at` (append-only, D-LOCK-2).
  - ActivityLog: UUIDv4 PK. Scalar FK `port_call_id` → port_calls.id (required), `logged_by_user_id` → users.id (required). `narrative` Text (required). `logged_at` DateTime UTC. NO `updated_at` (append-only, D-LOCK-3).
- `models/operational_report.py` — `OperationalReport` per architecture §3.3. UUIDv4 PK. Nullable scalar FKs `voyage_id` → voyages.id and `port_call_id` → port_calls.id with a CHECK enforcing exactly one is set (XOR, D-LOCK-5/D-39). `report_type` String + CheckConstraint (D-33). `status` String + CheckConstraint (D-34, default Pending). `submitted_by_user_id` → users.id. Flat nullable structured fields (position_lat, position_lon, speed_24h, distance_to_go, eta_next_port, bunker_rob_total_mt — note the explicit name, D-38). `raw_content_ref` Text nullable. `supersedes_report_id` self-FK nullable (D-37). TimestampMixin (updated_at allowed here — Pending reports are editable).
- Alembic migration: all three tables with FKs, self-FKs, CheckConstraints, and the XOR CHECK. Indexes per architecture §8. Verify it runs on SQLite (batch mode — self-referential FKs and CHECK constraints) and Postgres 18.

## 3. Repositories

- `repositories/port_activity_repository.py` — `PortActivityRepository`. Query: events for a port call ordered by event_timestamp.
- `repositories/activity_log_repository.py` — `ActivityLogRepository`. Query: entries for a port call ordered by logged_at.
- `repositories/operational_report_repository.py` — `OperationalReportRepository`. Query: reports for a voyage (direct voyage_id reports PLUS reports whose port_call_id belongs to that voyage); reports for a port call.

## 4. Services

`services/port_activity_service.py` — `PortActivityService` with `create_event`, `list_events`, `add_log_entry`, `list_log_entries`.
- Validate port call exists via public surface; validate event_type in allowed set.
- Correction: if `corrects_activity_id` set, validate original exists + same port call; require `correction_reason`.
- Append-only: NO update or delete methods. The service exposes only create + list.

`services/operational_report_service.py` — `OperationalReportService` with `create`, `get`, `list_for_voyage`, `list_for_port_call`, `update`, `transition_status`.
- Anchor inference: voyage route → voyage_id set; port-call route → port_call_id set. Validate XOR. Validate report_type matches anchor (Noon → voyage; Arrival/Departure/SOF/Bunkering → port call).
- `transition_status`: explicit-dict LEGAL_TRANSITIONS (D-LOCK-6). Reject illegal transitions. Terminal states (Accepted/Rejected) block further update.
- `update`: only allowed while status is Pending. Blocked after terminal.
- Supersession: create with `supersedes_report_id` → validate referenced report exists and is Accepted; new report starts Pending (D-LOCK-7). Original never mutated.

Typed domain exceptions: `IllegalReportTransitionError`, `ReportTerminalStateError`, `InvalidReportAnchorError`, `ReportTypeAnchorMismatchError`, `MissingCorrectionReasonError`, `InvalidSupersededReportError`, `AppendOnlyViolationError`, `MissingReferenceError`.

## 5. API

`api/port_activity.py` and `api/operational_report.py` — endpoints per specifications §1 (D-LOCK-10). Pydantic v2 DTOs. All depend on `get_current_user`; all mutation endpoints additionally depend on `require_role({Admin, Operations})` (D-35). NO UPDATE/DELETE endpoints for events or activity log.

`exceptions.py` — HTTP mappings: 409 (illegal transition, terminal-state edit), 422 (anchor XOR violation, type/anchor mismatch, missing correction reason, invalid superseded report), 404 (missing entity), 403 (mutation without role), 405 (attempted update/delete on append-only resource).

`__init__.py` — re-export routers and public types (`PortActivityEventType`, `OperationalReportType`, `OperationalReportStatus`).

## 6. Tests

Under `tests/modules/operational_reporting/` per specifications §4:
- `conftest.py` — `PortActivityFactory`, `ActivityLogFactory`, `OperationalReportFactory`; reuse PortCallFactory, VoyageFactory, UserFactory, etc.
- `test_port_activity.py`, `test_activity_log.py`, `test_operational_report_transitions.py`, `test_operational_report_correction.py`, `test_report_anchoring.py`, `test_cross_module_refs.py`, `test_operational_report_api.py`, `test_append_only.py`.

Real SQLite only. No persistence mocking. Parametrize the 21 event types and the valid-transition set; targeted invalid cases — do not build an exhaustive matrix.

## 7. CI + OpenAPI

- Confirm tach check passes with the new module and the one-directional dependency.
- Verify the XOR CHECK constraint and self-FK migrations run on the Postgres CI gate.
- Regenerate `openapi/openapi.json` and commit it — M2 generates types from this.

## 8. TDD discipline

RED → GREEN → REFACTOR. Commit at each GREEN. Real-DB tests only.

## Done when

- All endpoints work end-to-end via curl/HTTPie against a running dev server with a real session cookie (and a real Operations/Admin role for mutations).
- Append-only proven: no UPDATE/DELETE endpoint exists for events/logs; service has no mutation method; attempting update/delete returns 405.
- `make test` under 30s, all green. `make lint`, `make typecheck`, `tach check` pass.
- Coverage on `src/modules/operational_reporting/` ≥95% line.
- Migration creates all three tables, all constraints (incl. XOR CHECK and self-FKs); runs clean on SQLite and Postgres.
- `openapi/openapi.json` regenerated and committed with all new endpoints.
- CI green on all jobs.

Ask me before making any decision not covered by the specs.
```

---

## M2 — Operational Reporting Panels (frontend, inside Voyage Workspace)

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0016-session-auth-implementation.md
- OPEN_DECISIONS.md (§15)
- docs/operational_reporting/project_description.md
- docs/operational_reporting/architecture.md
- docs/operational_reporting/specifications.md
- docs/operational_reporting/locked_decisions.md
- frontend/README.md
- frontend/src/routes/VoyageWorkspacePage.tsx
- frontend/src/components/PortCallPanel/PortCallPanel.tsx

M1 is complete: operational-reporting endpoints ship; openapi/openapi.json includes them. The Voyage Workspace page and Port Call panel exist (Blocks 4 + 5). The frontend shell, auth, and codegen pipeline are live.

Implement M2 — Operational Reporting Panels.

**Hard scope: two panels inside the existing Voyage Workspace.** No new top-level routes. No charting, no map, no AIS.

## 1. Codegen

Run `pnpm run codegen` (or `corepack pnpm run codegen`) to regenerate `src/api/schema.ts` with the new types. Confirm typecheck passes. Type all API data through the generated schema types — NO `any`, no unsafe casts, no eslint-disable.

## 2. Components

Under `frontend/src/components/EventLogPanel/`:
- `EventLogPanel.tsx` — scoped to the selected port call. Chronological list of port activity events (event-type chip, timestamp, recorded_by, notes). ActivityLog narrative remarks as a sub-section. No edit/delete controls on any row.
- `AddEventForm.tsx` — event_type select (21 values), datetime-local input, notes textarea. Submit creates an event. A correction mode that sets corrects_activity_id + correction_reason creates a new row (does not mutate).
- `ActivityLogSection.tsx` — narrative list + add-entry form.

Under `frontend/src/components/ReportsPanel/`:
- `ReportsPanel.tsx` — list of reports (voyage-level + all port-call reports for the voyage) with status chip, type badge, submitted_at, submitted_by.
- `ReportForm.tsx` — create form (report_type select; fields shown per type — Noon shows position/speed/distance/eta/rob; SOF/Arrival/Departure port-call-anchored). Edit form for Pending reports only.
- `ReportTransitionControl.tsx` — shows only legal next-states; gated by Operations/Admin role (hide/disable for other roles); calls the transition endpoint. No edit/delete after Accepted/Rejected.

Mount both panels inside `VoyageWorkspacePage.tsx`.

## 3. Tests

- Vitest + RTL: EventLogPanel renders list and has no edit/delete controls; AddEventForm submits; ActivityLog adds entry; ReportsPanel renders with status chips; ReportForm create works and edit is blocked on accepted reports; transition button gated by role.
- Playwright e2e (`e2e/operational_reporting.spec.ts`): add port event → add activity log entry → create Arrival report → transition Pending → Accepted → verify locked → create superseding report.

Do not over-mock — mock only the API boundary in RTL; use the real seeded backend in Playwright.

## 4. CI

- Frontend job already runs codegen, typecheck, lint, test, e2e, audit. Confirm the new e2e flow is covered; no new dependencies.

## 5. TDD discipline

Tests before components. RED → GREEN → REFACTOR. Commit at each GREEN.

## Done when

- `pnpm run dev` → open a voyage's workspace → EventLog and Reports panels list, create, and transition against the live backend.
- Append-only honoured in UI: no edit/delete controls on events or activity log; corrections create new rows; accepted reports are read-only.
- Role gating works: non-Operations/Admin users cannot mutate.
- `pnpm run build`, `typecheck`, `lint`, `test`, `test:e2e`, `pnpm audit --audit-level=high` all pass.
- CI green on all jobs end-to-end.
- frontend/README.md updated: the EventLog + Reports panels, the append-only UI pattern, the per-type report form.

Ask me before making any decision not covered by the specs.
```

---

## After M2 green

Per [ADR-0012], write `docs/operational_reporting/runbook.md` before declaring the block done. The runbook should cover:

- How to run backend + frontend locally and reach the panels (log in, open a voyage workspace, open a port call, open EventLog + Reports).
- Seeding: a voyage with a port call, then a port activity event, an activity log entry, and a report (curl examples with a session cookie and an Operations/Admin role).
- The 21 event types and what append-only means in practice (corrections create new rows; nothing is ever edited or deleted).
- The report status lifecycle, legal transitions, role gating, and how supersession handles accepted-in-error.
- The voyage-vs-port-call anchoring rule (Noon is voyage-level; SOF/Arrival/Departure/Bunkering are port-call-level) and the XOR constraint.
- Common failure modes: illegal transition (409), terminal-state edit (409), anchor XOR violation (422), type/anchor mismatch (422), missing correction reason (422), mutation without role (403), attempted edit/delete on append-only resource (405), self-FK / CHECK dialect surprises.
- Operational notes: no Laytime calculation; no demurrage claim workflow; no SOF PDF export; raw_content_ref is an opaque string.
- Useful URLs (Swagger, OpenAPI JSON, Vite dev workspace).

Then I (the orchestrator) audit the block, verify diffs and CI evidence for the exact commit, and update `PROJECT_CONTEXT.md` to "Block 6 complete, Block 7 next."
