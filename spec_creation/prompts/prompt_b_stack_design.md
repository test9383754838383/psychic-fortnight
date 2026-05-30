# Block 5 — Prompt B: Full Stack Verification (Port Call)

## Role

You are a senior technical architect and independent reviewer.

Your job is to verify the complete technical approach for Block 5 — Port Call of this project. You are an external researcher. You have no prior knowledge of what was decided. You start from the requirements, not from conclusions.

No hallucination is allowed. Every recommendation must be real, verifiable, and current as of 2026.

If any preliminary decision is wrong, outdated, or has a better alternative, say so explicitly. Do not rubber-stamp.

---

## Project Context

Production-grade modular monolith ERP for the Operations Department of a ship-management company. Shore-based operators only. Single-tenant. On-prem deployable in Docker. No SaaS.

Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + Alembic (batch mode). SQLite dev/CI, Postgres 18 prod. Real session auth + RBAC (Block 3.5).

Frontend: React 19 + Vite 8 + TypeScript 6 strict + TanStack Router + TanStack Query + openapi-fetch + Apache ECharts. Vessel Schedule + Voyage Workspace pages live (Block 4).

Existing domain: Vessel/Port/Counterparty (Block 2), Voyage/ItineraryLine (Block 3). Tach enforces module boundaries. pytest real-DB tests only. TDD. mypy --strict.

**Established patterns from Block 3 (voyage_spine) — Block 5 should reuse these:**
- Vertical slice: model → repository → service → API → tests.
- Service-layer explicit-dict state machine (used for Voyage status).
- Service-layer recompute of derived fields.
- Cross-module reference validation via master_data public surface only.
- Enums as String + CheckConstraint. UUIDv4 PKs. TimestampMixin.
- `sqlalchemy.ext.orderinglist` for ordered child collections (used for ItineraryLine).

---

## What Block 5 Must Deliver

1. **PortCall** — child of Voyage, FK to Port, optional FK to ItineraryLine. Fields: status (6 states), eta/etd (revised), ata/atb/atd (actuals), timezone_offset, nor_tendered_datetime, nor_accepted_datetime, free_pratique_granted (bool+datetime), customs_cleared (bool+datetime), agent_appointment_ref, ops_notes.
2. **PortCall status state machine** — `Planned → Arrived at Pilot Station → At Anchor → Berthed → Cargo Ops Completed → Departed`. Transition sets the matching actual timestamp.
3. **AgentAppointment** — child of PortCall. agent (Counterparty with Agent role), appointed_date, status (`Nominated / Appointed / Cancelled`). Replacing an agent = Cancel old + create new record; "Replaced" is not a status.
4. **CRUD + transition API** — PortCall under a voyage; AgentAppointment under a port call.
5. **Cross-module validation** — Active Port; agent is Active Counterparty with Agent role; itinerary_line_ref belongs to the same voyage.
6. **Service invariants** — transition matrix; actual-timestamp coherence (ata ≤ atb ≤ atd); NOR accepted requires NOR tendered.
7. **Frontend** — Port Call panel inside the Voyage Workspace: list port calls, create/edit, transition status, manage agent appointment.
8. **OpenAPI codegen** — backend schema → frontend types.
9. **Tests** — backend real-DB (state machine, invariants, cross-module, agent replacement). Frontend Vitest + RTL + Playwright.
10. **CI** — existing jobs cover new code; e2e updated.

---

## Preliminary Decisions (challenge these if wrong)

| # | Decision | Claimed Rationale |
|---|---|---|
| 1 | **New `port_call` Tach module** (not folded into voyage_spine) | PortCall + AgentAppointment are new domain entities with their own lifecycle, not a read projection. Mirrors the module-per-domain pattern. |
| 2 | **Service-layer explicit-dict state machine** for the 6 PortCall states | Same pattern as voyage_spine. No state-machine library. ~15 lines. |
| 3 | **Linear forward-only transitions** for PortCall status | Planned→Pilot→Anchor→Berthed→CargoOps→Departed. Question: must every state be sequential, or can states be skipped (e.g. no anchorage, straight to Berthed)? |
| 4 | **Transition sets the matching actual timestamp** in the service | e.g. →Berthed sets atb=now (or a supplied datetime). |
| 5 | **AgentAppointment replacement = Cancel + new row** | Preserves history. No update-in-place of the agent. |
| 6 | **`free_pratique_granted` / `customs_cleared` as flat bool + datetime columns** | Same flat-columns approach as voyage_spine terms_* (rejected Composite). |
| 7 | **PortCall is NOT ordered via orderinglist** | Unlike ItineraryLine, port calls are keyed to itinerary lines / created ad hoc; no sequence_no integrity requirement. Confirm. |
| 8 | **timezone_offset stored as a fixed offset** (minutes from UTC), datetimes stored UTC | Consistent with project UTC policy. Confirm representation (minutes int vs IANA tz string). |
| 9 | **No new frontend charting** — Port Call panel is tables/forms inside Voyage Workspace | ECharts is for the schedule Gantt only. Port Call is form/table UI. |
| 10 | **Reuse downshift / react-day-picker** from Block 4 for agent select / datetime entry | Already locked, no new UI deps. |

---

## Required Verification Layers

### Layer 1 — Module boundary (new `port_call` module vs fold into voyage_spine)
Verify: is a new Tach module correct, or should PortCall live in voyage_spine like the schedule endpoints did? PortCall is a new entity with its own lifecycle and a child entity (AgentAppointment) — argue for/against a dedicated module. Consider cross-module FK to Voyage and ItineraryLine (both owned by voyage_spine) and whether that creates a Tach dependency direction problem.

### Layer 2 — State machine design
Verify the 6-state machine. Should it be strictly linear, or allow skips (no anchorage → straight Berthed)? Should backward transitions ever be allowed (correction of an erroneous advance)? What is the cleanest legal-transition representation given the voyage_spine precedent? Confirm no library is warranted.

### Layer 3 — Actual-timestamp model & coherence invariants
Verify: ata/atb/atd plus eta/etd plus NOR timestamps plus free_pratique/customs datetimes. What coherence invariants are actually enforceable and worth enforcing (ata ≤ atb ≤ atd; nor_accepted ≥ nor_tendered; free_pratique datetime present iff bool true)? Which should be hard service errors vs soft (operator may enter out-of-order real-world data)? Recommend the right strictness for a real ops tool.

### Layer 4 — DCSA Port Call vocabulary alignment
Verify against DCSA Port Call Standard v2.0: are the 6 chosen states and the timestamp set consistent with DCSA port-call event semantics (NOR, pilotage, berthing, cargo ops, departure)? Flag any field the project names differently from DCSA, and any DCSA event the project is missing that an ops department would actually need. Do not propose adopting DCSA wholesale — only flag genuine gaps.

### Layer 5 — AgentAppointment lifecycle
Verify: Nominated/Appointed/Cancelled + replacement-creates-new-row. Is a status state machine needed here too (Nominated→Appointed, →Cancelled)? How should `port_call.agent_appointment_ref` relate to multiple historical appointments — does it point to the single Active appointment, or is "active appointment" derived? Recommend the cleanest model.

### Layer 6 — Cross-module validation & Tach direction
Verify: port_call validating Port (master_data) and Agent counterparty+role (master_data) and Voyage/ItineraryLine (voyage_spine) — all via public surfaces. Confirm this does not violate Tach. Should port_call import from voyage_spine's public surface, or should the FK validation be structured differently?

### Layer 7 — timezone_offset representation
Decide: store `timezone_offset` as integer minutes-from-UTC, or an IANA tz string (e.g. "Asia/Singapore"), or both? Port already has a `timezone` field (Block 2). Should PortCall derive offset from the Port's timezone, or store its own (handling DST at the time of the call)? Recommend.

### Layer 8 — Frontend Port Call panel
Verify: tables + forms inside the Voyage Workspace is the right UX, no new charting. Confirm reuse of downshift (agent select) and react-day-picker / a datetime input for timestamps. Any concern with editing many datetime fields in a form (validation, UX)? Recommend a datetime input approach (native input[type=datetime-local] vs a library) given the locked stack.

### Layer 9 — Testing strategy
Verify: real-DB backend tests for the state machine, invariants, cross-module refs, and the agent replacement flow are achievable under the 30s ceiling. Any concern with the combinatorial size of the state-machine test matrix? Frontend: how to test the status-transition UI and agent management without over-mocking.

### Layer 10 — API shape
Verify the endpoint design: `POST /api/v1/voyages/{vid}/port-calls`, `GET .../port-calls`, `PATCH .../port-calls/{id}`, `POST .../port-calls/{id}/transition`, and nested `.../port-calls/{id}/agent-appointments`. Is nesting under voyage correct, or should port-calls be top-level (`/api/v1/port-calls`)? Recommend the cleaner REST shape.

---

## Required Output Format

### A) Layer-by-Layer Verdict
For each of the 10 layers: confirm or override, recommendation with rationale, alternatives + rejection reason, any concern.

### B) Full Stack / Decisions Table
One table: layer/decision → choice → one-line justification → any flag.

### C) Decision Gates
Anything requiring founder approval before build (e.g. linear vs skip-allowed state machine, timezone representation, invariant strictness).

### D) Risk Flags
Domain-modeling, data-integrity, test, and Tach-boundary risks; anything to revisit before Block 6.

### E) Prompt A Result Appendix

Prompt A result for Block 5:
- Decision: NO_FIT.
- Candidates rejected: DCSA Port Call Standard + Conformance-Gateway (Java/Spring/Angular standard + conformance framework, not a deployable module — but the authoritative data/event blueprint), Port Activity App (stale PHP/JS, 2020–2022), SPOCP port-call-api (Java/Spring, weak tests).
- Gap list: all 10 steps built custom on the locked stack. Use DCSA Port Call Standard v2.0 for vocabulary and event semantics only — verify the project's 6 states and timestamp set against it (Layer 4).
