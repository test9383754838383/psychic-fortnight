# Block 6 — Operational Reporting · Architecture

References: [ADR-0001] modular monolith · [ADR-0002] FastAPI · [ADR-0003]
SQLAlchemy · [ADR-0004] dual-DB · [ADR-0010] Tach · [ADR-0011] real-DB tests ·
[ADR-0016] auth. Implementation decisions in
`docs/operational_reporting/locked_decisions.md` (D-LOCK-1 through D-LOCK-11).

## 1. System Overview

Block 6 adds the `operational_reporting` module — the third new domain module,
sitting above `port_call`.

```
┌──────────────────────────────────────────────────────────────┐
│  FastAPI process (uvicorn)                                   │
│  ├── module: master_data              ← Block 2              │
│  ├── module: voyage_spine             ← Block 3 + 4          │
│  ├── module: auth                     ← Block 3.5            │
│  ├── module: port_call                ← Block 5              │
│  └── module: operational_reporting   ← THIS BLOCK           │
│        PortActivity, ActivityLog, OperationalReport          │
└─────────────────────┬────────────────────────────────────────┘
                      │ SQLAlchemy 2.0 async
                      ▼
             ┌──────────────┐
             │  DB           │  port_activities, activity_logs,
             └──────────────┘  operational_reports
```

**Tach dependency direction (D-LOCK-1):**
```
operational_reporting ──> port_call      (public surface, scalar FKs)
operational_reporting ──> voyage_spine   (public surface, scalar FKs)
operational_reporting ──> master_data    (public surface, scalar FKs)
operational_reporting ──> auth           (public surface, scalar user IDs)
port_call      ──X──> operational_reporting   (forbidden)
voyage_spine   ──X──> operational_reporting   (forbidden)
```

## 2. Module Layout

```
src/modules/operational_reporting/
├── api/
│   ├── port_activity.py         ← events + activity log routes (port-call-nested)
│   └── operational_report.py    ← report routes (voyage-nested + port-call-nested
│                                   + top-level member)
├── services/
│   ├── port_activity_service.py ← append-only enforcement, correction chain
│   └── operational_report_service.py ← status machine, supersession, role checks
├── repositories/
│   ├── port_activity_repository.py
│   ├── activity_log_repository.py
│   └── operational_report_repository.py
├── models/
│   ├── port_activity.py         ← PortActivity + ActivityLog
│   └── operational_report.py   ← OperationalReport
├── exceptions.py
└── __init__.py                  ← public surface
```

## 3. Data Models

### 3.1 PortActivity

```
port_activities
├── id                    UUID PK
├── port_call_id          UUID FK → port_calls.id (NOT NULL)
├── event_type            String + CheckConstraint (21 values)
├── event_timestamp       DateTime UTC (NOT NULL)
├── recorded_by_user_id   UUID FK → users.id (NOT NULL)
├── notes                 Text nullable
├── corrects_activity_id  UUID FK → port_activities.id nullable (self-ref)
├── correction_reason     Text nullable (required when corrects_activity_id set)
└── created_at            DateTime UTC (immutable)
```

No `updated_at`. Append-only. `corrects_activity_id` forms the correction chain
(D-LOCK-2). CheckConstraint enforces `correction_reason IS NOT NULL` when
`corrects_activity_id IS NOT NULL`.

### 3.2 ActivityLog

```
activity_logs
├── id                UUID PK
├── port_call_id      UUID FK → port_calls.id (NOT NULL)
├── logged_by_user_id UUID FK → users.id (NOT NULL)
├── narrative         Text (NOT NULL)
└── logged_at         DateTime UTC (immutable, = created_at)
```

No `updated_at`. Append-only. No correction chain in V1 (D-LOCK-3).

### 3.3 OperationalReport

```
operational_reports
├── id                    UUID PK
├── voyage_id             UUID FK → voyages.id nullable
├── port_call_id          UUID FK → port_calls.id nullable
│   CHECK: exactly one of voyage_id / port_call_id is NOT NULL (D-LOCK-5)
├── report_type           String + CheckConstraint
│   (Noon / Arrival / Departure / Bunkering / Statement of Facts)
├── status                String + CheckConstraint
│   (Pending / Queried / Accepted / Rejected)
├── submitted_by_user_id  UUID FK → users.id (NOT NULL)
├── submitted_at          DateTime UTC
├── received_at           DateTime UTC nullable
├── position_lat          Numeric(9,6) nullable
├── position_lon          Numeric(9,6) nullable
├── speed_24h             Numeric(5,2) nullable
├── distance_to_go        Numeric(7,2) nullable
├── eta_next_port         DateTime UTC nullable
├── bunker_rob_total_mt   Numeric(8,3) nullable
├── raw_content_ref       Text nullable
├── supersedes_report_id  UUID FK → operational_reports.id nullable (self-ref)
├── created_at            DateTime UTC
└── updated_at            DateTime UTC
```

`updated_at` is present because Pending reports can be edited. Once Accepted or
Rejected the service blocks further updates.

## 4. Core Flows

### 4.1 Add port activity event

```
1. POST /api/v1/port-calls/{id}/events
   ← require_role(Operations | Admin)
2. Validate port call exists (port_call public surface)
3. Validate event_type in allowed set
4. If corrects_activity_id set: validate original row exists + belongs to
   same port call; require correction_reason
5. Insert PortActivity row (no UPDATE path exists)
6. Return 201 PortActivityResponseDTO
```

### 4.2 Submit and transition operational report

```
1. POST /api/v1/voyages/{id}/reports  (Noon)
   POST /api/v1/port-calls/{id}/reports  (Arrival / Departure / SOF / Bunkering)
   ← require_role(Operations | Admin)
2. Validate voyage/port_call exists; infer anchor from route
3. Validate report_type matches anchor (Noon → voyage_id only)
4. Insert OperationalReport at status=Pending
5. Return 201 OperationalReportResponseDTO

6. POST /api/v1/reports/{id}/transition  {status: "Accepted"}
   ← require_role(Operations | Admin)
7. Validate transition in LEGAL_TRANSITIONS
8. If transitioning to Accepted/Rejected: lock record (no further PATCH)
9. Return 200 OperationalReportResponseDTO
```

### 4.3 Correct an accepted report (supersession)

```
1. POST /api/v1/voyages/{id}/reports (or port-calls/{id}/reports)
   body includes supersedes_report_id pointing to the accepted report
   ← require_role(Operations | Admin)
2. Validate superseded report exists and is Accepted
3. Insert new OperationalReport at status=Pending with supersedes_report_id set
4. New report goes through normal lifecycle independently
5. Original accepted report is never mutated
```

## 5. State Machine — OperationalReport

```python
LEGAL_TRANSITIONS = {
    "Pending":  {"Queried", "Accepted", "Rejected"},
    "Queried":  {"Accepted", "Rejected"},
    "Accepted": set(),
    "Rejected": set(),
}
```

(D-LOCK-6)

## 6. API Surface

```
# Port Activity
POST  /api/v1/port-calls/{id}/events
GET   /api/v1/port-calls/{id}/events

# Activity Log
POST  /api/v1/port-calls/{id}/activity-log
GET   /api/v1/port-calls/{id}/activity-log

# Operational Reports
POST  /api/v1/voyages/{id}/reports
GET   /api/v1/voyages/{id}/reports
POST  /api/v1/port-calls/{id}/reports
GET   /api/v1/port-calls/{id}/reports
GET   /api/v1/reports/{id}
PATCH /api/v1/reports/{id}
POST  /api/v1/reports/{id}/transition
```

(D-LOCK-10)

## 7. Frontend Integration

Two panels added inside the existing Voyage Workspace (Block 4). No new routes.

**EventLog panel** (scoped to selected port call):
- Chronological list: event type chip + timestamp + recorded_by + notes
- ActivityLog sub-section: narrative remarks in chronological order
- Add-event form: event_type select, datetime-local input, notes textarea
- No edit or delete controls on any row

**Reports panel**:
- List of reports (voyage-level + all port-call reports for the voyage)
- Status chip, type badge, submitted_at, submitted_by
- Create form for new reports (report_type select, relevant fields per type)
- Edit form for Pending reports only
- Transition control gated by Operations/Admin role
- No edit/delete after Accepted or Rejected

## 8. Migration

Single Alembic migration creates:
- `port_activities` table with self-FK + CheckConstraints
- `activity_logs` table
- `operational_reports` table with self-FK + XOR CHECK + CheckConstraints
- Indexes: port_activities(port_call_id), port_activities(event_timestamp),
  activity_logs(port_call_id), operational_reports(voyage_id),
  operational_reports(port_call_id), operational_reports(status)

Must run clean on SQLite (batch mode) and Postgres 18.
