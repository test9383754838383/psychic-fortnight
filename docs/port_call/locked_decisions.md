# Block 5 — Port Call · Locked Decisions

Tactical implementation decisions locked before spec drafting. Verified by Prompt A (NO_FIT, 2026-05-29) and Prompt B (full-stack architecture review, 2026-05-29). Founder approved all gates 2026-05-29.

DCSA Port Call Standard v2.0 is the vocabulary/event-semantics guardrail only — not an implementation model. The project keeps a simplified internal ops model.

---

## D-LOCK-1 — New `port_call` Tach module

**Decision:** PortCall + AgentAppointment live in a new `src/modules/port_call/` Tach module. Not folded into voyage_spine.

**Why:** New domain entities with their own lifecycle, status transitions, and a child entity (AgentAppointment) — not a read projection like the schedule endpoints. Mirrors the module-per-domain pattern.

**Dependency direction (Tach):**
- `port_call → voyage_spine` (public surface only)
- `port_call → master_data` (public surface only)
- `voyage_spine` must NOT import `port_call`.

**Constraint:** No bidirectional ORM coupling. Do not add `Voyage.port_calls = relationship(...)` in voyage_spine. PortCall holds scalar FKs (`voyage_id`, `itinerary_line_id`); navigation from voyage to its port calls is done by repository query from the port_call side.

---

## D-LOCK-2 — Service-layer explicit-dict state machine, skips allowed

**Decision:** PortCall status uses a service-layer explicit-dict state machine (same pattern as voyage_spine). No library. Forward skips are legal:

```python
LEGAL_TRANSITIONS = {
    "Planned":                  {"Arrived at Pilot Station", "At Anchor", "Berthed"},
    "Arrived at Pilot Station": {"At Anchor", "Berthed"},
    "At Anchor":                {"Berthed"},
    "Berthed":                  {"Cargo Ops Completed", "Departed"},
    "Cargo Ops Completed":      {"Departed"},
    "Departed":                 set(),
}
```

**Why:** Real ports don't always anchor; a vessel may go straight to berth. Strict linear was wrong (Prompt B Layer 2).

---

## D-LOCK-3 — Backward moves via a dedicated correction path

**Decision:** Backward status changes are NOT normal transitions. They go through a correction path: `PATCH /api/v1/port-calls/{id}` with a required `correction_reason`, restricted to `Admin` / `Operations` role. Correction does NOT auto-wipe actual timestamps.

**Why:** Operators make data-entry mistakes that need correcting, but a correction is an auditable, privileged act — not a normal forward-lifecycle transition.

---

## D-LOCK-4 — Timestamp set completed; transition sets matching actual

**Decision:** Every state has a matching actual-timestamp field. Add to the roadmap set:
- `anchored_datetime` (At Anchor)
- `cargo_ops_started_datetime` (Berthed → cargo work begins)
- `cargo_ops_completed_datetime` (Cargo Ops Completed)

Full actuals: `ata` (Arrived at Pilot Station), `anchored_datetime`, `atb` (Berthed), `cargo_ops_started_datetime`, `cargo_ops_completed_datetime`, `atd` (Departed).

On transition, the service sets the matching timestamp (to `now` or an operator-supplied datetime).

**Why:** Without these fields, "transition sets the matching actual" is impossible for At Anchor and Cargo Ops Completed (Prompt B Layer 3 — must-fix before build).

---

## D-LOCK-5 — Timestamp coherence: hard vs soft

**Hard invariants (service errors, 422):**
- Among present actuals only: `ata ≤ anchored_datetime ≤ atb ≤ cargo_ops_started_datetime ≤ cargo_ops_completed_datetime ≤ atd`. Skipped states have null timestamps and are not compared.
- `nor_accepted_datetime` requires `nor_tendered_datetime`, and `nor_accepted_datetime ≥ nor_tendered_datetime`.
- `free_pratique_granted_datetime` cannot be set when `free_pratique_granted` is false.
- `customs_cleared_datetime` cannot be set when `customs_cleared` is false.

**Soft (allowed, no block):**
- `free_pratique_granted = true` with no datetime yet.
- `customs_cleared = true` with no datetime yet.
- ETA after ATA, ETD before ATB, clearance time before arrival.

**Why:** Block only physically/logically impossible relationships. Operators receive late, incomplete, corrected real-world data (Prompt B Layer 3).

---

## D-LOCK-6 — Timezone: IANA name snapshot + offset + UTC

**Decision:** PortCall stores:
- `timezone_name: str` — IANA tz (e.g. `Asia/Singapore`), snapshotted from the Port at PortCall creation.
- `timezone_offset_minutes: int | None` — computed for display/audit.
- All datetime columns stored in UTC.

Operator-entered local datetimes are converted to UTC using `timezone_name` via `zoneinfo`.

**Why:** Offset-only storage breaks across DST and jurisdiction rule changes. IANA name handles both (Prompt B Layer 7). Overrides the offset-only preliminary decision.

---

## D-LOCK-7 — AgentAppointment: own state machine, active is derived

**Decision:**
- AgentAppointment has its own service-layer state machine: `Nominated → {Appointed, Cancelled}`, `Appointed → {Cancelled}`, `Cancelled` terminal.
- Replacement = cancel the active appointment + create a new row. Never mutate an existing appointment's `agent_id`.
- **Active appointment is derived**: the latest non-cancelled appointment for the port call. There is NO `port_call.agent_appointment_ref` FK pointing to the active row.
- DB guard: at most one non-cancelled appointment per `port_call_id` (partial unique index where status != 'Cancelled', tested on both SQLite and Postgres).
- Any external agent reference number lives on `AgentAppointment.agent_appointment_ref` (string), not on PortCall.

**Why:** A stored pointer to the active appointment requires perpetual pointer-consistency maintenance. Deriving it from history is simpler and keeps the audit trail intact (Prompt B Layer 5).

---

## D-LOCK-8 — Cross-module validation via public surfaces only

**Decision:** All FK validation goes through public surfaces:
- `master_data` — Active Port; Active Counterparty with `Agent` role.
- `voyage_spine` — Voyage exists; ItineraryLine belongs to the same voyage.

PortCall services never import voyage_spine or master_data ORM models — only public validators and scalar IDs.

**Why:** Keeps Tach boundaries clean; no deep coupling (Prompt B Layer 6).

---

## D-LOCK-9 — API shape: nested collection + top-level member routes

**Decision:**
```
GET  /api/v1/voyages/{voyage_id}/port-calls       list under voyage
POST /api/v1/voyages/{voyage_id}/port-calls       create under voyage
GET  /api/v1/port-calls/{id}                       get one
PATCH /api/v1/port-calls/{id}                      update (incl. correction path)
POST /api/v1/port-calls/{id}/transition            status transition
GET  /api/v1/port-calls/{id}/agent-appointments    list appointments
POST /api/v1/port-calls/{id}/agent-appointments    create (nominate)
POST /api/v1/agent-appointments/{id}/cancel        cancel one
```

**Why:** Nested collection expresses voyage ownership for list/create; top-level member routes keep direct operations from going three levels deep (Prompt B Layer 10).

---

## D-LOCK-10 — Frontend: tables/forms in Voyage Workspace, no charting

**Decision:** Port Call UI is a panel inside the Voyage Workspace (Block 4): a port-call list/table, a grouped edit form (Planning / Actuals / NOR & Clearance / Agent / Notes), a status chip + transition control, and an agent-appointment section. No ECharts. Reuse `downshift` (agent select) from Block 4.

Datetime entry: native `input[type=datetime-local]` with a visible port-timezone label; server-side conversion to UTC via `timezone_name` is mandatory (the native control carries no timezone). Datetime fields grouped by operational phase, not one giant flat form.

**Why:** Port Call is form/table workflow, not a chart. `datetime-local` has no timezone semantics, so the server owns conversion (Prompt B Layer 8).

---

## Deferred (not in V1 scope)

Per CLAUDE.md §8, not built unless the roadmap states them:
- `berth_name` / `terminal_name` / `port_visit_reference` (Prompt B suggested; not in V1_ROADMAP Block 5).
- Fuller Statement-of-Facts event model (pilot boarded, all fast, gangway down, etc.) — revisit at Block 6 (Operational Reporting) per Prompt B.
