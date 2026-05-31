# Block 6 — Operational Reporting · Runbook

How to operate the operational_reporting module: PortActivity events, ActivityLog
narrative, and OperationalReport (Noon / Arrival / Departure / SOF / Bunkering).
Append-only by design. See `architecture.md`, `specifications.md`,
`locked_decisions.md` (D-LOCK-1..11) for the why.

## 1. Local dev startup

Backend from repository root:
```bash
uv run uvicorn src.app:create_app --factory --reload
```
Frontend in a second terminal:
```bash
cd frontend
corepack pnpm run dev
```
Open the app:
```text
http://localhost:5173
```
Log in, open a voyage workspace, then click a port call card to scope the panels:
```text
http://localhost:5173/voyages/<voyage_id>/workspace
```
The **EventLog** panel (left, below Port Calls) and **Reports** panel (right
column) are both inside the Voyage Workspace. Clicking a port-call card selects
it and scopes both panels to that port call; the first/only port call is
auto-selected. Noon reports are voyage-level and appear regardless of selection.

## 2. Seeding (curl, real session cookie + Operations/Admin role)

All mutations require the `Operations` or `Admin` role (D-LOCK-9). Reads only
require authentication. Use one shell session.

```bash
API="http://localhost:8000/api/v1"
COOKIE_JAR="./cookies.txt"
```
Login (local dev seed user `operator`/`password` has the Admin role):
```bash
curl -i -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"operator","password":"password"}' \
  -c "$COOKIE_JAR"
```
Verify session and role:
```bash
curl -X GET "$API/auth/me" -b "$COOKIE_JAR"
```
You need an existing voyage with a port call (see the Block 5 runbook to create
one). Capture `<voyage_id>` and `<port_call_id>`.

### 2.1 Add a port activity event
```bash
curl -X POST "$API/port-calls/<port_call_id>/events" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "event_type": "Berthed",
    "event_timestamp": "2026-06-02T08:30:00Z",
    "notes": "All fast starboard side to"
  }'
```
`recorded_by_user_id` is taken from the session — do not send it. List events
(chronological):
```bash
curl -X GET "$API/port-calls/<port_call_id>/events" -b "$COOKIE_JAR"
```

### 2.2 Add an activity-log narrative entry
```bash
curl -X POST "$API/port-calls/<port_call_id>/activity-log" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{ "narrative": "Master reports tank inspection passed." }'
```
List entries:
```bash
curl -X GET "$API/port-calls/<port_call_id>/activity-log" -b "$COOKIE_JAR"
```

### 2.3 Create an Arrival report (port-call-anchored)
Anchor is inferred from the route — do NOT send `voyage_id`/`port_call_id` in the
body.
```bash
curl -X POST "$API/port-calls/<port_call_id>/reports" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{ "report_type": "Arrival", "submitted_at": "2026-06-02T09:00:00Z" }'
```

### 2.4 Create a Noon report (voyage-anchored)
```bash
curl -X POST "$API/voyages/<voyage_id>/reports" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "report_type": "Noon",
    "submitted_at": "2026-06-01T12:00:00Z",
    "position_lat": "51.922500",
    "position_lon": "4.479170",
    "speed_24h": "12.40",
    "distance_to_go": "320.50",
    "eta_next_port": "2026-06-02T08:00:00Z",
    "bunker_rob_total_mt": "850.250"
  }'
```

### 2.5 List reports
```bash
# All reports for a voyage = direct voyage reports + all its port-call reports
curl -X GET "$API/voyages/<voyage_id>/reports" -b "$COOKIE_JAR"
# Reports for a single port call
curl -X GET "$API/port-calls/<port_call_id>/reports" -b "$COOKIE_JAR"
# A single report
curl -X GET "$API/reports/<report_id>" -b "$COOKIE_JAR"
```

## 3. The 21 event types (D-LOCK-4)

Single source of truth: the event-type constant in
`src/modules/operational_reporting` (backend) and
`frontend/src/lib/operationalReportingConstants.ts` (frontend). Stored as a
String column with a 21-value CheckConstraint — an invalid value returns 422.

```
Arrived · Anchored · Berthed · All Fast ·
Commenced Loading · Completed Loading ·
Commenced Discharging · Completed Discharging ·
Hoses Connected · Hoses Disconnected · Departed ·
NOR Tendered · NOR Re-tendered · NOR Accepted ·
Free Pratique Granted ·
Tugs Engaged · Tugs Released ·
Bunkering Commenced · Bunkering Completed ·
Delay Commenced · Delay Ended
```

## 4. Append-only — what it means in practice (D-LOCK-2/3)

PortActivity and ActivityLog rows are **never updated or deleted**.

- There are no UPDATE/DELETE endpoints. PUT/PATCH/DELETE on an event or
  activity-log row returns **405** (raised as `AppendOnlyViolationError`).
- The services expose only create + list — no mutation method exists.
- No `updated_at` column on these tables; silent mutation is detectable.
- In the UI there are **no edit or delete controls** on any event or narrative
  row.

**Corrections to an event** are a new row, not an edit:
```bash
curl -X POST "$API/port-calls/<port_call_id>/events" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "event_type": "Berthed",
    "event_timestamp": "2026-06-02T08:45:00Z",
    "corrects_activity_id": "<original_event_id>",
    "correction_reason": "Original berthing time was 15 min early"
  }'
```
`correction_reason` is required when `corrects_activity_id` is set (DB
CheckConstraint + service guard); omitting it returns 422. The original row stays
visible permanently; the chain is preserved via the `corrects_activity_id`
self-FK. ActivityLog has **no** correction chain in V1 — to clarify a wrong
narrative entry, append a new one.

## 5. Report status lifecycle (D-LOCK-6)

```python
LEGAL_TRANSITIONS = {
    "Pending":  {"Queried", "Accepted", "Rejected"},
    "Queried":  {"Accepted", "Rejected"},
    "Accepted": set(),   # terminal
    "Rejected": set(),   # terminal
}
```
- `Pending → Accepted` direct skip is allowed (no forced Queried step).
- `Accepted` and `Rejected` are terminal — no further transition, and `PATCH`
  is blocked once terminal.
- Transition body field is `status`:
```bash
curl -X POST "$API/reports/<report_id>/transition" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{ "status": "Accepted" }'
```
- `PATCH /reports/<id>` edits fields **only while Pending**:
```bash
curl -X PATCH "$API/reports/<report_id>" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{ "speed_24h": "11.80" }'
```
Role gating (UI): transition buttons and the Add/Edit controls render only for
Operations/Admin; Viewer sees a read-only view. The backend enforces the same
with `require_role`.

## 6. Accepted-in-error → supersession (D-LOCK-7)

There is **no Accepted → Rejected transition**. Accepted reports are the source
of truth for reconciliation and are never mutated. To correct one, create a new
report that supersedes it:
```bash
curl -X POST "$API/voyages/<voyage_id>/reports" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{ "report_type": "Noon", "supersedes_report_id": "<accepted_report_id>" }'
```
The referenced report must exist and be **Accepted** (else 422). The new report
starts at Pending and runs the normal lifecycle independently. The original
accepted row is untouched.

## 7. Anchoring rule — voyage vs port call (D-LOCK-5)

Each report is anchored to **exactly one** of a voyage or a port call, enforced
by a DB XOR CHECK on `operational_reports` and validated in the service:

- **Noon** → voyage-level. Create via `POST /voyages/{id}/reports`.
- **Arrival / Departure / Statement of Facts / Bunkering** → port-call-level.
  Create via `POST /port-calls/{id}/reports`.

The anchor is inferred from the route; the report body carries neither
`voyage_id` nor `port_call_id`. Posting a report type to the wrong anchor (e.g.
Noon to a port-call route) returns 422 (type/anchor mismatch).
`GET /voyages/{id}/reports` returns the voyage's direct reports **plus** all
reports on that voyage's port calls.

## 8. Common failure modes

| Symptom | Cause |
|---|---|
| `409 illegal transition` | status move not in `LEGAL_TRANSITIONS` |
| `409 terminal-state edit` | PATCH/transition on an Accepted or Rejected report |
| `422 anchor XOR violation` | report not anchored to exactly one of voyage/port call |
| `422 type/anchor mismatch` | e.g. Noon on a port-call route, or SOF on a voyage route |
| `422 missing correction reason` | `corrects_activity_id` set without `correction_reason` |
| `422 invalid superseded report` | `supersedes_report_id` missing or not Accepted |
| `422 invalid event_type` | value not in the 21-value set |
| `403 mutation without role` | caller lacks Operations/Admin |
| `404 missing entity` | port call / voyage / report id not found |
| `405 append-only resource` | attempted UPDATE/DELETE on an event or activity-log row |

Dialect note: the XOR CHECK and both self-FKs (`corrects_activity_id`,
`supersedes_report_id`) are validated on SQLite (batch mode) and Postgres 18 by
the CI migration smoke test.

## 9. Operational notes / out of scope (V1)

- No Laytime calculation — event timestamps are captured, not computed against.
- No demurrage claim workflow — records feed future claim tooling only.
- No formatted SOF PDF export — the data is captured, the document is not.
- `raw_content_ref` is an opaque string reference; no file/blob storage.
- `bunker_rob_total_mt` is a single total (V1 single-fuel compromise); no
  multi-fuel ROB breakdown.
- No AIS, no map, no charting.

## 10. Useful URLs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Vite dev workspace route: `http://localhost:5173/voyages/<voyage_id>/workspace`

## 11. Tests

```bash
# Backend (real-DB, parallel; mirrors CI)
uv run pytest -n auto tests/modules/operational_reporting

# Frontend unit
cd frontend && corepack pnpm run test

# Frontend e2e (run serially as CI does; backend must be up on :8000)
cd frontend && corepack pnpm exec playwright test --workers=1
```
Note: the e2e specs self-seed via `scripts/seed_e2e_user.py` +
`scripts/seed_e2e_data.py` in `beforeAll`. Run e2e with `--workers=1` locally —
the seeds are not safe to run concurrently across parallel workers (CI sets
`workers: 1`).
