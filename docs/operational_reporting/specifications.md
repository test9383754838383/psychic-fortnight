# Block 6 — Operational Reporting · Specifications

ADR-linked. Stack-level decisions in `docs/architecture/locked_summary.md`.
Implementation decisions in `docs/operational_reporting/locked_decisions.md`
(D-LOCK-1 through D-LOCK-11). This file owns the block-specific surface: API
contract, D-entries, testing strategy, rejected alternatives, risks.

## 0. Context and Constraints

Block 6 adds the `operational_reporting` domain module: PortActivity,
ActivityLog, and OperationalReport. These entities capture the execution
record of a port stay at commercial/legal granularity.

**Non-negotiables (inherited):** TDD, real-DB tests [ADR-0011], mypy
`--strict`, Tach boundaries [ADR-0010], 12-Factor, simplicity-first, all
datetimes UTC.

## 1. Stack (as used by this block)

**Backend** (unchanged from Block 5):
- Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2. [ADR-0002]
- SQLAlchemy 2.0 async + Alembic batch mode. [ADR-0003]
- SQLite (dev/CI) / Postgres 18 (prod). [ADR-0004]
- Explicit-dict state machine (OperationalReport status). voyage_spine pattern.
- Service-layer append-only enforcement (PortActivity, ActivityLog).

**Frontend** (no new deps):
- Panels inside existing Voyage Workspace. TanStack Query, native form inputs.

### Project layout additions

```
src/modules/operational_reporting/
├── api/{port_activity.py, operational_report.py}
├── services/{port_activity_service.py, operational_report_service.py}
├── repositories/{port_activity_repository.py, activity_log_repository.py,
│                operational_report_repository.py}
├── models/{port_activity.py, operational_report.py}
├── exceptions.py
└── __init__.py
tests/modules/operational_reporting/
frontend/src/components/EventLogPanel/
frontend/src/components/ReportsPanel/
```

### API surface (Block 6 additions)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/port-calls/{id}/events` | Create port activity event |
| `GET` | `/api/v1/port-calls/{id}/events` | List events (chronological) |
| `POST` | `/api/v1/port-calls/{id}/activity-log` | Add narrative entry |
| `GET` | `/api/v1/port-calls/{id}/activity-log` | List narrative entries |
| `POST` | `/api/v1/voyages/{id}/reports` | Create voyage-level report (Noon) |
| `GET` | `/api/v1/voyages/{id}/reports` | List all reports for voyage |
| `POST` | `/api/v1/port-calls/{id}/reports` | Create port-call report |
| `GET` | `/api/v1/port-calls/{id}/reports` | List reports for port call |
| `GET` | `/api/v1/reports/{id}` | Get one report |
| `PATCH` | `/api/v1/reports/{id}` | Update fields (Pending only) |
| `POST` | `/api/v1/reports/{id}/transition` | Status transition |

No UPDATE or DELETE endpoints for port_activities or activity_logs.

### Schema rationale

- UUIDv4 PKs, UTC datetimes, enums via String + CheckConstraint. Same as
  prior blocks.
- PortActivity: append-only, self-FK correction chain (`corrects_activity_id`
  + `correction_reason`). No `updated_at`. (D-LOCK-2)
- ActivityLog: append-only, no correction chain in V1. No `updated_at`.
  (D-LOCK-3)
- OperationalReport: `voyage_id XOR port_call_id` CHECK constraint. Flat
  nullable structured fields. `supersedes_report_id` self-FK for corrections
  of accepted reports. (D-LOCK-5, D-LOCK-7, D-LOCK-8)

## 2. D-entries

Inherit D-1 through D-31 from prior blocks. New for Block 6:

| Key | Default | Where | Why |
|---|---|---|---|
| `D-32` PortActivity event_type enum | 21 values (see D-LOCK-4) | `port_activity_service.py` + CheckConstraint | Matches V1_ROADMAP Block 6 |
| `D-33` OperationalReport report_type enum | `Noon / Arrival / Departure / Bunkering / Statement of Facts` | `operational_report_service.py` + CheckConstraint | Matches V1_ROADMAP Block 6 |
| `D-34` OperationalReport status enum | `Pending / Queried / Accepted / Rejected` | `operational_report_service.py` + CheckConstraint | D-LOCK-6 |
| `D-35` Report mutation role | `{Admin, Operations}` | `operational_report_service.py` | Mutations are privileged (D-LOCK-9) |
| `D-36` Correction chain column name | `corrects_activity_id` | `port_activities` table | Self-FK; distinguishes from soft-delete |
| `D-37` Supersession column name | `supersedes_report_id` | `operational_reports` table | Self-FK for accepted-in-error correction |
| `D-38` Bunker ROB column name | `bunker_rob_total_mt` | `operational_reports` table | Names the V1 single-fuel compromise explicitly |
| `D-39` XOR anchor constraint | DB CHECK on `operational_reports` | Migration | Enforces exactly one of voyage_id / port_call_id |

## 3. Authentication and Authorization

All endpoints require `get_current_user`.

Mutation endpoints additionally require `require_role({Admin, Operations})`:
- `POST /port-calls/{id}/events`
- `POST /port-calls/{id}/activity-log`
- `POST /voyages/{id}/reports`
- `POST /port-calls/{id}/reports`
- `PATCH /reports/{id}`
- `POST /reports/{id}/transition`

Read endpoints are open to any authenticated user.

## 4. Testing Strategy

**Backend (real-DB, parametrized but bounded):**

- `test_port_activity.py` — create event; parametrize all 21 event types;
  invalid event_type rejected; correction chain (corrects_activity_id +
  correction_reason required together; original row unchanged); no UPDATE/DELETE
  at API + service layer; role check (403 without Operations/Admin).
- `test_activity_log.py` — add entry; list entries; no UPDATE/DELETE; role
  check.
- `test_operational_report_transitions.py` — valid transitions parametrized
  (Pending→Accepted, Pending→Queried, Queried→Accepted, Queried→Rejected,
  Pending→Rejected); illegal transitions rejected (409); terminal state blocks
  further PATCH; role check on transitions.
- `test_operational_report_correction.py` — superseding report accepted;
  original accepted report unchanged; supersedes_report_id validates the
  referenced report is Accepted; supersession requires Operations/Admin.
- `test_report_anchoring.py` — voyage_id XOR port_call_id enforced; Noon
  requires voyage_id; Arrival/Departure/SOF/Bunkering require port_call_id;
  malformed request rejected 422.
- `test_cross_module_refs.py` — port_call not found → 404; voyage not found
  → 404; user ref validated.
- `test_operational_report_api.py` — 201/200/404/409/422/403 paths per
  endpoint; auth required; `GET /voyages/{id}/reports` returns direct + port-
  call reports.
- `test_append_only.py` — direct repository/service call to update or delete
  raises; API returns 405.

Real SQLite only. No persistence mocking.

**Frontend (Vitest + RTL):**
- EventLogPanel renders list; add-event form submits; no edit/delete controls
  present; correction form creates new row.
- ReportsPanel renders list with status chips; create form works; transition
  button gated by role; edit blocked on accepted reports.

**Playwright e2e (`e2e/operational_reporting.spec.ts`):**
- Add port event → add activity log entry → create Arrival report →
  transition Pending → Accepted → verify report locked → create superseding
  report → verify supersedes_report_id present.

**Forbidden:** mocked persistence; fake repositories; skipping the DB.

## 5. Deployment and Infra

No new services. No new backend or frontend dependencies. Alembic migration
adds `port_activities`, `activity_logs`, `operational_reports` tables plus
self-FKs, CHECK constraints, and indexes. Verified on SQLite (batch mode)
and Postgres 18.

## 6. Rejected Alternatives

| Item | Rejected | Reason |
|---|---|---|
| Soft-delete for PortActivity corrections | `is_active` flag | Still a mutation; doesn't preserve the original fact chain |
| Single table for ActivityLog + PortActivity | Discriminator column | Weak constraints, nullable columns, confusing semantics |
| JSONB for structured report fields | `bunker_rob JSONB` etc | Six known typed fields deserve typed columns; JSONB for variable data only |
| Multiple tables per report type | Separate Noon/SOF tables | Overcomplicates queries; type-specific validation belongs in service layer |
| Accepted → Rejected transition | Status mutation | Accepted is source of truth for reconciliation; supersession is safer |
| Authenticated-only for mutations | No role restriction | Operational records have legal/commercial weight; role guard required |

## 7. Risks

| Risk | Confidence | Impact | Mitigation |
|---|---|---|---|
| XOR CHECK constraint on SQLite | Medium | High | Test the migration + constraint on both engines in CI; SQLite supports CHECK |
| Self-FK on SQLite (batch mode) | Medium | Medium | Alembic batch mode handles self-referential FKs; test explicitly |
| Append-only bypass via direct DB access | Low | High | Service-layer guard + no UPDATE endpoint; prod DB privileges considered (deferred) |
| report_type / anchor mismatch | Medium | Medium | Service validates type-vs-anchor at create time; 422 on mismatch |
| `GET /voyages/{id}/reports` join complexity | Low | Low | Two-step query (direct + port-call reports); no raw JOIN needed with async repositories |
| Role gate bypassed by stub in tests | Low | Medium | Use real auth fixtures in integration tests; do not bypass `require_role` in test setup |

## 8. Open Decisions Impacting This Block

| OPEN_DECISIONS item | Block 6 impact |
|---|---|
| §2 Multi-tenancy | None; single-tenant holds |
| §5 Audit log | Correction chain + supersession gives per-entity history; full audit log still its own future block |
| §10 Alert/task dots | NOR Tendered / Departure events here will feed Block 10 alerts later; no coupling yet |
