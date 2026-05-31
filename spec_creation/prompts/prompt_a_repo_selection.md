# Block 5 — Prompt A: Baseline Repository Selection

## Role

You are a senior technical researcher.

Your job is to find 1-2 existing, proven repositories or documented solutions that best match the Port Call feature described below.

No hallucination is allowed. Every recommendation must include real, verifiable links.

If no candidate passes hard filters, return `NO_FIT`.

## Project Context

A production-grade modular monolith ERP for the Operations Department of a ship-management company. Shore-based operators only. Single-tenant. On-prem deployable in Docker. No SaaS services.

Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + Alembic (batch mode). SQLite dev/CI, Postgres 18 prod. Real session auth + RBAC in place (Block 3.5).

Frontend: React 19 + Vite 8 + TypeScript 6 strict + TanStack Router + TanStack Query + openapi-fetch + Apache ECharts. Frontend shell, auth, and the Vessel Schedule + Voyage Workspace pages are live (Blocks 3–4).

Existing domain: Vessel, Port, Counterparty (Block 2); Voyage + ItineraryLine (Block 3). Block 5 adds Port Call execution data hanging off voyages and itinerary lines.

## Workflow Context — What Block 5 Must Deliver

Block 5 models the **execution** of a port visit: the actual arrival/departure events and operational milestones that occur when a vessel reaches a port on its itinerary. Planned data (planned ETA/ETD) already lives on ItineraryLine; Block 5 adds the actuals.

Step-by-step:

1. **PortCall entity** — child of a Voyage, linked to a Port and (optionally) the originating ItineraryLine. Fields: `voyage_ref`, `port_ref`, `itinerary_line_ref`; `status` (`Planned / Arrived at Pilot Station / At Anchor / Berthed / Cargo Ops Completed / Departed`); `eta`/`etd` (revised estimates); `ata` (actual arrival), `atb` (actual berthing), `atd` (actual departure); `timezone_offset`; `nor_tendered_datetime`, `nor_accepted_datetime`; `free_pratique_granted` (bool + datetime), `customs_cleared` (bool + datetime); `agent_appointment_ref`; `ops_notes`.
2. **PortCall status state machine** — six ordered states. Forward progression with the events that set the matching actual timestamp (e.g. transition to Berthed sets `atb`). Define legal transitions.
3. **AgentAppointment entity** — child of a PortCall. Fields: `port_call_ref`, `agent` (Counterparty ref with Agent role), `appointed_date`, `status` (`Nominated / Appointed / Cancelled`). "Replaced" is NOT a status — replacing an agent creates a new AgentAppointment record; the old one is Cancelled.
4. **CRUD API** — create/read/update PortCall under a voyage; transition status; list port calls for a voyage; CRUD AgentAppointment under a port call.
5. **Cross-module validation** — `port_ref` must be an Active Port; `agent` must be an Active Counterparty with the Agent role; `voyage_ref` must exist; `itinerary_line_ref`, if set, must belong to the same voyage.
6. **Service-layer invariants** — status transition matrix, actual-timestamp coherence (ata ≤ atb ≤ atd), NOR accepted requires NOR tendered, etc.
7. **Frontend: Port Call section** — within the Voyage Workspace (Block 4), a panel listing the voyage's port calls with status, key timestamps, and agent. Create/edit a port call. Transition status. Manage agent appointment.
8. **OpenAPI codegen** — backend schema regenerated; frontend types generated.
9. **Tests** — backend real-DB pytest (state machine, invariants, cross-module refs, agent replacement flow). Frontend Vitest + RTL + Playwright e2e.
10. **CI** — existing jobs cover new code; e2e updated.

## Scope

In scope:
- Maritime port call / port operations data models and state machines
- FastAPI + SQLAlchemy patterns for parent-child entities with status workflows
- Operational event/milestone tracking implementations

Out of scope:
- AIS / real-time vessel position tracking
- Port disbursement account (DA) / expense lifecycle (explicitly deferred in V1)
- Berth scheduling / berth management
- Laytime / demurrage calculation
- Any commercial-license dependency

## Hard Constraints

1. Actively maintained as of 2026.
2. Permissive license for commercial on-prem use (MIT, Apache-2.0, BSD).
3. Test evidence present.
4. Production-grade signals.
5. Compatible with the locked stack: Python 3.12, FastAPI, SQLAlchemy 2.0 async, Pydantic v2, React 19.
6. No commercial dependency.

## Evaluation Criteria (priority order)

1. Simplicity
2. Functionality (covers the 10-step workflow)
3. Test maturity
4. Production readiness
5. Budget flexibility (tiebreaker)

## Research Instructions

1. Search: maritime port call tracking, port operations management open source, ship agency / agent appointment systems, FastAPI state machine entity patterns, DCSA port call / Just-In-Time Port Call standards.
2. Primary sources only (GitHub, PyPI, npm, official standards docs).
3. No partial matches without explicit fit percentage.
4. If no OSS repo covers this workflow on the locked stack, return `NO_FIT` and state exactly which of the 10 steps would need custom code. Note any standard (e.g. DCSA) useful as a data-model blueprint even if not usable as code.

## Required Output Format

### A) Candidate Table
Name, URL, license, last active signal, fit % to the 10-step workflow, coverage map (native vs missing), test evidence, production evidence, complexity risk.

### B) Scoring
1-10: simplicity, functionality, test maturity, production readiness, budget flexibility.

### C) Gap-to-Build List
For each candidate, exactly which of the 10 steps must be built on top.

### D) Final Decision
`RECOMMEND: <candidate>` with rationale, or `NO_FIT` with exact failure reasons.
