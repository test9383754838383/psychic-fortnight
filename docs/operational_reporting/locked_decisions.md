# Block 6 — Operational Reporting · Locked Decisions

Tactical implementation decisions locked before spec drafting. Verified by
Prompt B (full-stack architecture review, 2026-05-29). Founder approved all
gates 2026-05-29.

---

## D-LOCK-1 — New `operational_reporting` Tach module

**Decision:** PortActivity, ActivityLog, and OperationalReport live in a new
`src/modules/operational_reporting/` Tach module.

**Dependency direction (Tach):**
- `operational_reporting → port_call` (public surface only, scalar FKs)
- `operational_reporting → voyage_spine` (public surface only, scalar FKs)
- `operational_reporting → master_data` (public surface only, scalar FKs)
- `operational_reporting → auth` (public surface only, scalar user IDs)
- `port_call` must NOT import `operational_reporting`
- `voyage_spine` must NOT import `operational_reporting`

**Constraint:** No ORM relationship from PortCall or Voyage back into
operational_reporting. Navigation from port call to its events/logs/reports
is done by repository query from the operational_reporting side only.

---

## D-LOCK-2 — PortActivity is append-only with self-FK correction chain

**Decision:** PortActivity rows are never updated or deleted. Corrections are
a new row with:
- `corrects_activity_id` — nullable self-FK pointing to the row being corrected
- `correction_reason` — required when `corrects_activity_id` is set

The original row stays visible permanently. UI shows the latest corrected view
but the full chain is always in the database.

Append-only enforced at three layers:
1. No UPDATE/DELETE endpoints in the API
2. Service/repository guards that raise on any mutation attempt
3. DB-level: no `updated_at` column on PortActivity (makes silent mutation
   detectable); PostgreSQL trigger or REVOKE considered for prod hardening

**Why:** SOF is a legally admissible record used in demurrage arbitration.
Soft-delete (is_active flag) is still a mutation. The append-only chain is
the only correct pattern.

---

## D-LOCK-3 — ActivityLog is append-only (no correction chain required in V1)

**Decision:** ActivityLog narrative entries are never updated or deleted.
No `corrects_log_id` self-FK in V1 — if a narrative entry is wrong, the
operator appends a new entry clarifying the error. V1 does not need a formal
correction chain for free-text remarks.

Same three-layer enforcement as D-LOCK-2.

**Why:** Narrative remarks are dispute-defence text. Immutability is required.
A formal correction chain is deferred until a real workflow asks for it.

---

## D-LOCK-4 — event_type stored as String + CheckConstraint (21 values)

**Decision:** Same pattern as port_call status. No separate lookup table.
A Python constants module is the single source of truth for the 21 values:

```
Arrived / Anchored / Berthed / All Fast /
Commenced Loading / Completed Loading /
Commenced Discharging / Completed Discharging /
Hoses Connected / Hoses Disconnected / Departed /
NOR Tendered / NOR Re-tendered / NOR Accepted /
Free Pratique Granted /
Tugs Engaged / Tugs Released /
Bunkering Commenced / Bunkering Completed /
Delay Commenced / Delay Ended
```

**Why:** SQLite + Postgres both support CHECK constraints on string columns.
Consistent with the pattern used across voyage_spine and port_call.

---

## D-LOCK-5 — OperationalReport has voyage_id XOR port_call_id

**Decision:** `OperationalReport` carries two nullable FK columns with a DB
CHECK constraint enforcing exactly one is set:

```sql
CHECK (
    (voyage_id IS NOT NULL AND port_call_id IS NULL)
    OR
    (voyage_id IS NULL AND port_call_id IS NOT NULL)
)
```

Report type determines which anchor is used:
- Noon → voyage-level (`voyage_id` set, `port_call_id` NULL)
- Arrival / Departure / SOF / Bunkering → port-call-level (`port_call_id` set,
  `voyage_id` NULL)

`GET /api/v1/voyages/{id}/reports` returns direct voyage reports plus all
reports attached to that voyage's port calls (joined via port_call).

**Why:** Noon reports are voyage-level telemetry. SOF/Arrival/Departure are
port-call execution records. Forcing both into one anchor loses the correct
relational grouping (Prompt B open question 4).

---

## D-LOCK-6 — OperationalReport status: explicit-dict state machine

**Decision:**

```python
LEGAL_TRANSITIONS = {
    "Pending":  {"Queried", "Accepted", "Rejected"},
    "Queried":  {"Accepted", "Rejected"},
    "Accepted": set(),
    "Rejected": set(),
}
```

- Pending → Accepted direct skip is allowed (no forced Queried step).
- Pending → Rejected allowed (obvious duplicate/invalid submissions).
- Accepted and Rejected are terminal. No status mutation after acceptance.

**Why:** Queried means "operator asked for clarification." Forcing clean
reports through Queried is fake workflow. Review happens when an authorized
user transitions Pending → Accepted (Prompt B open question 3).

---

## D-LOCK-7 — Accepted-in-error handled by superseding report row

**Decision:** There is no Accepted → Rejected transition. If a report is
accepted in error, the operator creates a new `OperationalReport` row with
`supersedes_report_id` self-FK pointing to the accepted report. The new row
starts at Pending and goes through the normal lifecycle. The original accepted
row is never mutated.

**Why:** Accepted reports are the source of truth for voyage reconciliation.
Mutating them after acceptance is dangerous. The supersession pattern keeps
the audit trail intact while allowing correction (Prompt B must-fix on D-H).

---

## D-LOCK-8 — Flat nullable columns for structured report fields

**Decision:** The six structured fields are flat nullable columns on
`OperationalReport`:

- `position_lat` Numeric(9,6)
- `position_lon` Numeric(9,6)
- `speed_24h` Numeric(5,2)
- `distance_to_go` Numeric(7,2)
- `eta_next_port` DateTime (UTC)
- `bunker_rob_total_mt` Numeric(8,3) — named explicitly to mark the V1
  single-fuel compromise

No JSONB. No separate tables per report type. Report-type-specific validation
lives in the service layer (e.g. Noon requires position; SOF does not).

**Why:** Six known, typed fields deserve typed columns with proper validation
and indexes. JSONB is for variable/semi-structured data. Separate tables per
report type would complicate queries without adding correctness (Prompt B
open question 5).

---

## D-LOCK-9 — Mutations require Operations or Admin role

**Decision:**
- GET (reads): any authenticated user
- POST / state transitions: Operations or Admin role required

Applies to: creating PortActivity events, adding ActivityLog entries,
submitting OperationalReports, transitioning report status.

**Why:** Operational records have commercial and legal weight. Authenticated-
only creation (preliminary D-N) was too permissive for records that affect
demurrage calculations and SOF admissibility (Prompt B must-fix on D-N).

---

## D-LOCK-10 — API shape

```
POST  /api/v1/port-calls/{id}/events           create port activity event
GET   /api/v1/port-calls/{id}/events           list events (chronological)
POST  /api/v1/port-calls/{id}/activity-log     add narrative entry
GET   /api/v1/port-calls/{id}/activity-log     list narrative entries

POST  /api/v1/voyages/{id}/reports             create voyage-level report (Noon)
GET   /api/v1/voyages/{id}/reports             list all reports for voyage
                                                (direct + port-call reports)
POST  /api/v1/port-calls/{id}/reports          create port-call report
                                                (Arrival / Departure / SOF / Bunkering)
GET   /api/v1/port-calls/{id}/reports          list reports for port call

GET   /api/v1/reports/{id}                     get one report
PATCH /api/v1/reports/{id}                     update fields (Pending only)
POST  /api/v1/reports/{id}/transition          status transition
```

No UPDATE endpoint for events or activity log entries (append-only enforced).

**Why:** SOF / Arrival / Departure are port-call-scoped. Noon is voyage-scoped.
Both anchors need their own collection route (Prompt B must-fix on D-K).

---

## D-LOCK-11 — Frontend: two panels inside Voyage Workspace, no new routes

**Decision:** Block 6 adds two panels inside the existing Voyage Workspace:

1. **EventLog panel** — scoped to the selected port call. Chronological list
   of PortActivity events (type chip, timestamp, recorded_by, notes) plus
   ActivityLog narrative remarks as a sub-section. Add-event form
   (event_type select, datetime-local, notes). No edit or delete controls.

2. **Reports panel** — shows voyage-level + port-call reports with status chip,
   type, submitted_at. Create/edit form for pre-accepted reports. Transition
   control gated by role. No edit/delete controls on accepted reports.

No new top-level routes. No charting, no map, no AIS.

**Why:** Port Call is operational context; the panels belong inside the
Voyage Workspace where the operator already works (Prompt B D-O confirm).

---

## Deferred (not in V1 scope)

- Multi-fuel ROB breakdown (bunker_rob_total_mt covers V1)
- Laytime calculation engine
- Formal demurrage claim workflows
- File/blob storage for raw_content_ref
- DB-level REVOKE UPDATE/DELETE for append-only hardening (considered; deferred
  to production hardening block)
- `corrects_log_id` self-FK on ActivityLog (deferred until a workflow asks)
