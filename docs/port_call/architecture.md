# Block 5 — Port Call · Architecture

References: [ADR-0001] modular monolith · [ADR-0002] FastAPI · [ADR-0003] SQLAlchemy · [ADR-0004] dual-DB · [ADR-0010] Tach · [ADR-0011] real-DB tests · [ADR-0016] auth. Implementation decisions in `docs/port_call/locked_decisions.md` (D-LOCK-1 through D-LOCK-10).

## 1. System Overview

Block 5 adds the `port_call` module — the first new backend domain module since Block 3.

```
┌──────────────────────────────────────────────────────────┐
│  FastAPI process (uvicorn)                               │
│  ├── module: master_data       ← Block 2                 │
│  ├── module: voyage_spine      ← Block 3 + 4             │
│  ├── module: auth              ← Block 3.5               │
│  └── module: port_call         ← THIS BLOCK             │
│        PortCall, AgentAppointment                        │
└─────────────────────┬────────────────────────────────────┘
                      │ SQLAlchemy 2.0 async
                      ▼
             ┌──────────────┐
             │  DB           │  port_calls, agent_appointments
             └──────────────┘
```

**Tach dependency direction (D-LOCK-1):**
```
port_call ──> voyage_spine (public surface)
port_call ──> master_data  (public surface)
voyage_spine ──X──> port_call   (forbidden)
```
PortCall holds scalar FKs to `voyages.id` and `itinerary_lines.id`. No `Voyage.port_calls` relationship in voyage_spine (no ORM back-import). Navigation from voyage → port calls is a repository query on the port_call side.

## 2. Module Layout

```
src/modules/port_call/
├── api/
│   ├── port_calls.py            ← voyage-nested + top-level member routes
│   └── agent_appointments.py    ← nested under port call + cancel
├── services/
│   ├── port_call_service.py     ← state machine, invariants, timestamp coherence
│   └── agent_appointment_service.py ← appointment lifecycle, replacement
├── repositories/
│   ├── port_call_repository.py
│   └── agent_appointment_repository.py
├── models/
│   ├── port_call.py
│   └── agent_appointment.py
├── exceptions.py
└── __init__.py                  ← public surface
```

Layer responsibilities identical to voyage_spine. The service layer owns: status transitions (incl. skip rules and correction path), timestamp coherence invariants, cross-module validation, and the agent-replacement flow.

## 3. Core Flows

### 3.1 Create port call

```
1. POST /api/v1/voyages/{vid}/port-calls — PortCallCreateDTO
2. Service:
   a. Verify voyage exists (voyage_spine public surface)
   b. Verify port_ref is Active (master_data public surface)
   c. If itinerary_line_ref set: verify it belongs to voyage {vid}
   d. Snapshot timezone_name from the Port; compute timezone_offset_minutes
   e. status = "Planned"; persist
3. 201 Created
```

### 3.2 Status transition (D-LOCK-2, D-LOCK-4)

```
1. POST /api/v1/port-calls/{id}/transition — { to, at? }
2. Service consults LEGAL_TRANSITIONS (skips allowed):
   Planned                  → {Arrived at Pilot Station, At Anchor, Berthed}
   Arrived at Pilot Station  → {At Anchor, Berthed}
   At Anchor                 → {Berthed}
   Berthed                   → {Cargo Ops Completed, Departed}
   Cargo Ops Completed       → {Departed}
   Departed                  → ∅
3. Illegal transition → IllegalPortCallTransitionError → 409
4. Legal: set status; stamp the matching actual timestamp (at or now):
   Arrived at Pilot Station → ata
   At Anchor                → anchored_datetime
   Berthed                  → atb
   Cargo Ops Completed      → cargo_ops_completed_datetime
   Departed                 → atd
   (cargo_ops_started_datetime set when cargo work begins; operator-entered)
5. Re-check timestamp coherence (D-LOCK-5); reject if violated
6. 200 OK
```

### 3.3 Correction path (D-LOCK-3)

```
1. PATCH /api/v1/port-calls/{id} — { status?, correction_reason, ...fields }
2. If status changes backward → requires correction_reason AND role ∈ {Admin, Operations}
3. Does NOT auto-clear actual timestamps; operator edits them explicitly if needed
4. 200 OK (403 if role insufficient; 422 if reason missing on a backward change)
```

### 3.4 Agent appointment + replacement (D-LOCK-7)

```
Nominate:
1. POST /api/v1/port-calls/{id}/agent-appointments — { agent_ref, appointed_date }
2. Verify agent is Active Counterparty with Agent role (master_data)
3. Guard: reject if a non-cancelled appointment already exists for this port call
4. status = "Nominated"; persist; 201

Appoint:
- POST .../agent-appointments then PATCH status Nominated → Appointed (service state machine)

Replace:
1. POST a new appointment while one is active →
   service cancels the current active appointment, then creates the new row
2. Old row status = Cancelled (agent_id untouched); new row Active
3. At most one non-cancelled row per port call (partial unique index)

Active appointment is DERIVED: latest non-cancelled appointment for the port call.
PortCall has NO agent_appointment_ref column.
```

### 3.5 Validation failure path

```
Pydantic 422 on malformed payload, OR
Service raises typed domain exception →
  IllegalPortCallTransitionError (409),
  TimestampCoherenceError (422),
  MissingMasterDataReferenceError (400/404),
  AgentRoleError (422),
  DuplicateActiveAppointmentError (409),
  CorrectionReasonRequiredError (422)
Transaction rolled back; no partial writes.
```

## 4. Data Model

### 4.1 PortCall

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | UUIDv4 app-side |
| `voyage_id` | UUID, FK → voyages.id | required (scalar FK, no ORM relationship in voyage_spine) |
| `port_id` | UUID, FK → ports.id | required; must be Active at create |
| `itinerary_line_id` | UUID, FK → itinerary_lines.id, nullable | must belong to voyage_id if set |
| `status` | str enum, default `Planned` | String + CheckConstraint (6 states) |
| `eta` | datetime UTC, nullable | revised estimate |
| `etd` | datetime UTC, nullable | revised estimate |
| `ata` | datetime UTC, nullable | Arrived at Pilot Station |
| `anchored_datetime` | datetime UTC, nullable | At Anchor (D-LOCK-4) |
| `atb` | datetime UTC, nullable | Berthed |
| `cargo_ops_started_datetime` | datetime UTC, nullable | operator-entered (D-LOCK-4) |
| `cargo_ops_completed_datetime` | datetime UTC, nullable | Cargo Ops Completed (D-LOCK-4) |
| `atd` | datetime UTC, nullable | Departed |
| `timezone_name` | str | IANA snapshot from Port (D-LOCK-6) |
| `timezone_offset_minutes` | int, nullable | computed for display/audit |
| `nor_tendered_datetime` | datetime UTC, nullable | |
| `nor_accepted_datetime` | datetime UTC, nullable | requires tendered; ≥ tendered |
| `free_pratique_granted` | bool, default False | |
| `free_pratique_granted_datetime` | datetime UTC, nullable | cannot be set when bool False |
| `customs_cleared` | bool, default False | |
| `customs_cleared_datetime` | datetime UTC, nullable | cannot be set when bool False |
| `ops_notes` | text, nullable | |
| `created_at` / `updated_at` | datetime UTC | TimestampMixin |

No `agent_appointment_ref` column (active appointment derived — D-LOCK-7).

**Coherence (present actuals only):** `ata ≤ anchored_datetime ≤ atb ≤ cargo_ops_started_datetime ≤ cargo_ops_completed_datetime ≤ atd`.

### 4.2 AgentAppointment

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `port_call_id` | UUID, FK → port_calls.id, `ondelete='CASCADE'` | |
| `agent_ref` | UUID, FK → counterparties.id | Active Counterparty with Agent role |
| `appointed_date` | date | |
| `status` | str enum | `Nominated / Appointed / Cancelled` (String + CheckConstraint) |
| `agent_appointment_ref` | str, nullable | external reference number, if any |
| `created_at` / `updated_at` | datetime UTC | TimestampMixin |

**DB guard:** partial unique index — at most one row per `port_call_id` where `status != 'Cancelled'`. Verified on SQLite and Postgres.

### 4.3 Relationship diagram

```
Voyage (B3) ──< PortCall ──< AgentAppointment ──> Counterparty (B2, Agent role)
  │                │
  │                └──> Port (B2)
  └ (scalar FK)    └──> ItineraryLine (B3, optional)
```

All cross-entity links from PortCall are scalar FKs validated through public surfaces — no ORM relationships crossing module boundaries.

## 5. Auth

All `/port-calls/*` and `/agent-appointments/*` endpoints depend on `get_current_user` (Block 3.5). The correction path (backward status change via PATCH) additionally requires `require_role` membership in `{Admin, Operations}`.

## 6. Frontend (D-LOCK-10)

Port Call panel inside the Voyage Workspace (`/voyages/$voyageId/workspace`):

```
Voyage Workspace
└── Port Calls panel
    ├── port-call list/table (status chip, eta/etd, ata/atb/atd, agent)
    ├── create / edit form, grouped:
    │     Planning · Actuals · NOR & Clearance · Agent · Notes
    ├── status transition control (legal next-states only)
    └── agent appointment section (nominate / appoint / replace; shows active + history)
```

- `downshift` for agent selection (reused from Block 4).
- Datetime entry: native `input[type=datetime-local]` + visible port-timezone label. Server converts to UTC via `timezone_name` (the control carries no tz).
- No ECharts.

## 7. Patterns Established / Reused

1. **New domain module under Tach with one-directional cross-module deps** — template for Block 6+.
2. **State machine with skips + privileged correction path** — reusable wherever a lifecycle allows non-linear progress with auditable corrections.
3. **Derived "active record" from a history table** — reusable for any replace-creates-new-row pattern.
4. **IANA timezone snapshot + UTC storage** — the project's timezone pattern, established here.
5. **Asymmetric bool/datetime invariant** (datetime-without-bool hard, bool-without-datetime soft) — reusable for milestone flags.
