# Block 5 — Port Call · Specifications

ADR-linked. Stack-level decisions in `docs/architecture/locked_summary.md`. Implementation decisions in `docs/port_call/locked_decisions.md` (D-LOCK-1 through D-LOCK-10). This file owns the block-specific surface: API contract, D-entries, testing strategy, rejected alternatives, risks.

## 0. Context and Constraints

Block 5 adds the `port_call` domain module: PortCall + AgentAppointment, capturing the execution of port visits planned in Block 3.

**Non-negotiables (inherited):** TDD, real-DB tests [ADR-0011], mypy `--strict`, Tach boundaries [ADR-0010], 12-Factor, simplicity-first, all datetimes UTC.

## 1. Stack (as used by this block)

**Backend** (unchanged from Block 3):
- Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2. [ADR-0002]
- SQLAlchemy 2.0 async + Alembic batch mode. [ADR-0003]
- SQLite (dev/CI) / Postgres 18 (prod). [ADR-0004]
- Service-layer explicit-dict state machines (voyage_spine pattern).
- `zoneinfo` for IANA timezone → UTC conversion. (D-LOCK-6)

**Frontend** (no new deps):
- Reuse `downshift` (agent select) and existing form patterns. Native `input[type=datetime-local]`. (D-LOCK-10)

### Project layout additions

```
src/modules/port_call/        ← NEW backend module
├── api/{port_calls.py, agent_appointments.py}
├── services/{port_call_service.py, agent_appointment_service.py}
├── repositories/{port_call_repository.py, agent_appointment_repository.py}
├── models/{port_call.py, agent_appointment.py}
├── exceptions.py
└── __init__.py
tests/modules/port_call/       ← NEW backend tests
frontend/src/components/PortCallPanel/  ← NEW (inside Voyage Workspace)
```

### API surface (Block 5 additions)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/voyages/{voyage_id}/port-calls` | Create a port call under a voyage |
| `GET` | `/api/v1/voyages/{voyage_id}/port-calls` | List port calls for a voyage |
| `GET` | `/api/v1/port-calls/{id}` | Get one port call |
| `PATCH` | `/api/v1/port-calls/{id}` | Update fields; backward status change = correction path |
| `POST` | `/api/v1/port-calls/{id}/transition` | Forward status transition |
| `GET` | `/api/v1/port-calls/{id}/agent-appointments` | List appointments (history) |
| `POST` | `/api/v1/port-calls/{id}/agent-appointments` | Nominate an agent |
| `POST` | `/api/v1/agent-appointments/{id}/cancel` | Cancel an appointment |

`PATCH .../agent-appointments/{id}` (status Nominated→Appointed) handled via the appointment update route; replacement is a `POST` of a new appointment that cancels the active one.

### Schema rationale

- UUIDv4 PKs, UTC datetimes, enums via String + CheckConstraint. Same as prior blocks.
- PortCall: scalar FKs only (no ORM relationships into voyage_spine). All six lifecycle states have a matching actual-timestamp column (D-LOCK-4).
- `timezone_name` (IANA) + `timezone_offset_minutes` (D-LOCK-6).
- No `agent_appointment_ref` column on PortCall; active appointment derived (D-LOCK-7).
- AgentAppointment: partial unique index — one non-cancelled row per port call.

## 2. D-entries

Inherit D-1 through D-27 from prior blocks. New for Block 5:

| Key | Default | Where | Why |
|---|---|---|---|
| `D-28` PortCall status enum | `Planned / Arrived at Pilot Station / At Anchor / Berthed / Cargo Ops Completed / Departed` | `port_call_service.py` + CheckConstraint | Matches V1_ROADMAP Block 5 |
| `D-29` AgentAppointment status enum | `Nominated / Appointed / Cancelled` | `agent_appointment_service.py` + CheckConstraint | Matches V1_ROADMAP |
| `D-30` Correction-path roles | `{Admin, Operations}` | `port_call_service.py` | Backward status change is privileged (D-LOCK-3) |
| `D-31` Max port calls per voyage | 50 | `port_call_service.py` | Soft cap mirroring voyage itinerary cap (D-10); prevents runaway entry |

## 3. Authentication and Authorization

All endpoints require `get_current_user`. The correction path (backward status change via PATCH) additionally requires `require_role` ∈ `{Admin, Operations}` (D-30). All other operations are open to any authenticated operator in V1.

## 4. Testing Strategy

**Backend (real-DB, parametrized but bounded — Prompt B Layer 9):**
- `test_port_call_transitions.py` — valid transitions (parametrized), skip allowed (Planned→Berthed, Pilot→Berthed), illegal transition rejected (409), transition stamps matching timestamp.
- `test_port_call_correction.py` — backward change requires reason + role; 403 without role; 422 without reason; timestamps not auto-cleared.
- `test_timestamp_coherence.py` — present-only monotonic actuals; out-of-order rejected; skipped states (null) not compared; NOR accepted requires tendered and ≥ tendered; free_pratique/customs datetime-without-bool rejected; bool-without-datetime allowed.
- `test_cross_module_refs.py` — inactive port rejected; agent without Agent role rejected; itinerary_line of a different voyage rejected; missing voyage rejected.
- `test_agent_appointment.py` — nominate; appoint; cancel; replacement cancels old + creates new; duplicate active appointment rejected (409); active appointment derivation returns latest non-cancelled.
- `test_port_call_api.py` — 201/200/404/409/422 paths per endpoint; auth required.
- `test_timezone_snapshot.py` — timezone_name snapshotted from Port; local→UTC conversion correct.

**Frontend (Vitest + RTL):**
- PortCallPanel renders list; opens grouped edit form; validates timestamp order inline; calls transition mutation; agent replacement flow updates active agent.

**Playwright e2e:**
- create port call → transition to Berthed → replace agent → reload → verify active agent + appointment history.

**Forbidden (unchanged):** mocked persistence; fake repositories; skipping the DB. Do not replicate DCSA's exhaustive 4,500-case timestamp conformance matrix — that is for a public standard, not this internal slice.

## 5. Deployment and Infra

No new services. No new backend dependencies beyond stdlib `zoneinfo`. No new frontend dependencies. Alembic migration adds `port_calls` and `agent_appointments` tables plus the partial unique index; verified on SQLite (batch mode) and Postgres 18.

## 6. Rejected Alternatives (block-specific)

| Item | Rejected | Reason |
|---|---|---|
| Baseline repo | DCSA Conformance-Gateway, Port Activity App, SPOCP | Wrong stack / stale / weak tests (Prompt A NO_FIT). DCSA used as vocabulary only |
| State machine | Strict linear transitions | Real ports skip anchorage; must allow forward skips (D-LOCK-2) |
| Backward moves | Normal transitions | Corrections are privileged + audited, not lifecycle moves (D-LOCK-3) |
| Timestamp set | Roadmap's ata/atb/atd only | At Anchor and Cargo Ops Completed had no timestamp; added three fields (D-LOCK-4) |
| Timezone | Offset-only | Breaks on DST/rule changes; IANA name + offset + UTC (D-LOCK-6) |
| Active agent | `port_call.agent_appointment_ref` FK pointer | Pointer-consistency burden; derive from history (D-LOCK-7) |
| State machine lib | `transitions` / `python-statemachine` | ~15 lines of explicit dict; matches voyage_spine |
| `VoyageOperatingTerms`-style Composite | SQLAlchemy Composite for clearance pairs | Flat bool+datetime columns, project precedent |
| Module placement | Fold into voyage_spine | New entities + lifecycle warrant a module (D-LOCK-1) |
| Datetime input | A datetime-picker library | Native `datetime-local` + tz label + server conversion (D-LOCK-10) |
| Statement-of-Facts event log | Full event model now | Out of V1 Block 5 scope; revisit Block 6 |
| Berth/terminal fields | `berth_name`/`terminal_name`/`port_visit_reference` | Not in V1_ROADMAP Block 5; deferred |

## 7. Risks

| Risk | Confidence | Impact | Mitigation |
|---|---|---|---|
| Coherence invariants too strict for messy real data | Medium | Medium | Hard-block only impossible relationships; soft-allow lagging/late data (D-LOCK-5) |
| State-machine test matrix combinatorial blow-up | Low | Low | Parametrized valid set + targeted invalid cases; not exhaustive (Prompt B Layer 9) |
| Partial unique index dialect drift (SQLite vs Postgres) | Medium | High | Test the one-active-appointment guard on both engines in CI |
| Accidental ORM coupling voyage_spine ↔ port_call | Medium | High | Scalar FKs only; no `Voyage.port_calls` relationship; Tach check in CI |
| `datetime-local` timezone confusion | Medium | Medium | Server owns local→UTC via timezone_name; visible tz label; server-side validation |
| Agent replacement race (two actives) | Low | High | DB partial unique index is the hard backstop; service cancels-then-creates in one transaction |
| Timezone snapshot staleness (port tz changes later) | Low | Low | Snapshot is intentional (the tz at the time of the call); documented behaviour |

## 8. Open Decisions Impacting This Block

| OPEN_DECISIONS item | Block 5 impact |
|---|---|
| §2 Multi-tenancy | None; single-tenant holds |
| §5 Audit log | Correction path records `correction_reason` inline; full audit log still its own future block |
| §7 CounterpartyRole→Port hard FK | Agent validation uses the soft Agent-role check from Block 2; unchanged |
| §10 Alert/task dots | NOR/clearance milestones here will feed Block 10 alerts later; no coupling yet |
