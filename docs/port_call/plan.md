# Block 5 — Port Call · Terminal Prompts

**Total terminals:** M0 + 2 milestone terminals.
M0 is the coordinator — no code, stays open the whole time.
M1 and M2 are each a fresh coding terminal.
Working directory for all terminals: `ERP_Operations/`.

## Milestone split rationale

- **M1 owns the backend.** New `port_call` module: PortCall + AgentAppointment models, migration, repositories, two services (state machine, invariants, agent lifecycle), API, tests. Mirrors the Block 3 vertical slice.
- **M2 owns the frontend.** The Port Call panel inside the existing Voyage Workspace: list, grouped form, transition control, agent management, plus tests. Consumes M1's OpenAPI contract.

M2 cannot start until M1's OpenAPI schema is committed (frontend types are generated from it). Two milestones is the right shape. ([ADR-0012])

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator for Block 5 — Port Call of the Vessel & Voyage Operations Control System. You do not write code. Your only job is to guide me through building this block one milestone at a time.

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
- docs/voyage_spine/runbook.md
- docs/vessel_schedule/runbook.md
- docs/auth_rbac/runbook.md
- docs/port_call/project_description.md
- docs/port_call/architecture.md
- docs/port_call/specifications.md
- docs/port_call/locked_decisions.md
- docs/port_call/plan.md

These are the full spec and your coordination map. When you are done, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1 → M2 in sequence:
- Tell me which milestone is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then move to the next milestone

If I report a problem or blocker in any terminal, help me diagnose it. Do not move forward until the current milestone's done condition is fully met.

TDD rule for every milestone: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Real-DB tests only on the backend. No mocked persistence. No fakes. No in-memory stubs for SQLAlchemy.

Critical boundary rule: port_call may import only from voyage_spine and master_data PUBLIC surfaces. voyage_spine must never import port_call. No ORM relationship from Voyage into PortCall — scalar FKs only.

Do not write code. Do not suggest code. Coordinate only.

When M2 is green, remind me to write docs/port_call/runbook.md before declaring the block done (per [ADR-0012]).
```

---

## M1 — Port Call API (backend module)

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
- docs/voyage_spine/runbook.md
- docs/port_call/project_description.md
- docs/port_call/architecture.md
- docs/port_call/specifications.md
- docs/port_call/locked_decisions.md

Blocks 2–4 are shipped and green. The voyage_spine module (Voyage, ItineraryLine) and master_data (Vessel, Port, Counterparty + roles) exist with public surfaces. Reuse the Block 3 vertical-slice pattern verbatim (model → repository → service → API → tests).

Implement M1 — Port Call API.

## 1. Module scaffold

Create `src/modules/port_call/` with subpackages `api/`, `services/`, `repositories/`, `models/`, plus `exceptions.py` and `__init__.py`. Mirror the voyage_spine layout.

Update `tach.toml`: declare `src.modules.port_call`. It may import only from `src.modules.voyage_spine` and `src.modules.master_data` PUBLIC surfaces. Forbid external imports of `port_call.repositories.*` and `port_call.models.*`. Confirm voyage_spine does NOT depend on port_call.

If voyage_spine / master_data public surfaces lack the validators this block needs (voyage exists, itinerary_line belongs to voyage, port is Active, counterparty is Active + has Agent role), add minimal public validators to those modules' `__init__.py` — do not reach into their internals from port_call.

## 2. Models and migration

- `models/port_call.py` — `PortCall` per architecture §4.1. UUIDv4 PK. Scalar FKs: `voyage_id` → voyages.id (required), `port_id` → ports.id (required), `itinerary_line_id` → itinerary_lines.id (nullable). NO ORM relationship back into voyage_spine. `status` String + CheckConstraint (D-28, default `Planned`). All actual-timestamp columns including `anchored_datetime`, `cargo_ops_started_datetime`, `cargo_ops_completed_datetime` (D-LOCK-4). `timezone_name` (str), `timezone_offset_minutes` (int nullable). NOR + clearance columns. TimestampMixin. No `agent_appointment_ref` column (D-LOCK-7).
- `models/agent_appointment.py` — `AgentAppointment` per architecture §4.2. FK `port_call_id` → port_calls.id `ondelete='CASCADE'`. `agent_ref` → counterparties.id. `status` String + CheckConstraint (D-29). `agent_appointment_ref` str nullable.
- Alembic migration: both tables with FKs and check constraints, PLUS a partial unique index on `agent_appointments (port_call_id) WHERE status != 'Cancelled'`. Verify it runs on SQLite (batch mode) and Postgres 18, and that the partial index works on both.

## 3. Repositories

- `repositories/port_call_repository.py` — `PortCallRepository(SQLAlchemyAsyncRepository[PortCall])`.
- `repositories/agent_appointment_repository.py` — `AgentAppointmentRepository(SQLAlchemyAsyncRepository[AgentAppointment])`. Include a query for the active (latest non-cancelled) appointment per port call.

## 4. Services

`services/port_call_service.py` — `PortCallService` with `create`, `get`, `list_for_voyage`, `update`, `transition_status`.
- Cross-module validation via public surfaces (D-LOCK-8): voyage exists; port Active; itinerary_line (if set) belongs to the voyage.
- On create: snapshot `timezone_name` from the Port; compute `timezone_offset_minutes`; convert any operator local datetimes to UTC via zoneinfo (D-LOCK-6).
- `transition_status`: explicit-dict LEGAL_TRANSITIONS with skips (D-LOCK-2). Stamp the matching actual timestamp (supplied or now). Re-check coherence (D-LOCK-5).
- `update`: a backward status change requires `correction_reason` AND caller role ∈ {Admin, Operations} (D-LOCK-3, D-30); does not auto-clear timestamps.
- Coherence invariants (D-LOCK-5): present-only monotonic actuals; NOR accepted requires tendered and ≥ tendered; clearance datetime cannot be set when its bool is False (hard); bool True without datetime allowed (soft).
- D-31 max port calls per voyage.

`services/agent_appointment_service.py` — `AgentAppointmentService` with `nominate`, `appoint`, `cancel`, `replace`, `list_for_port_call`, `get_active`.
- Validate agent is Active Counterparty with Agent role.
- Lifecycle state machine: Nominated → {Appointed, Cancelled}; Appointed → {Cancelled}; Cancelled terminal.
- `replace`: cancel the active appointment then create a new one in one transaction (D-LOCK-7).
- Reject creating a second non-cancelled appointment (DB partial index is the hard backstop).

Typed domain exceptions: `IllegalPortCallTransitionError`, `TimestampCoherenceError`, `MissingMasterDataReferenceError`, `AgentRoleError`, `DuplicateActiveAppointmentError`, `CorrectionReasonRequiredError`, `IllegalAgentAppointmentTransitionError`, `PortCallCapExceededError`.

## 5. API

`api/port_calls.py` and `api/agent_appointments.py` — endpoints per specifications §1 (nested-collection + top-level member shape, D-LOCK-9). Pydantic v2 DTOs. All depend on `get_current_user`; the correction path additionally depends on `require_role` ∈ {Admin, Operations}.

`exceptions.py` — HTTP mappings: 409 (illegal transition, duplicate active appointment), 422 (coherence, agent role, missing correction reason), 404 (missing entity), 400 (cross-module ref failure), 403 (correction without role).

`__init__.py` — re-export routers and public types (`PortCallStatus`, `AgentAppointmentStatus`).

## 6. Tests

Under `tests/modules/port_call/` per specifications §4:
- `conftest.py` — `PortCallFactory`, `AgentAppointmentFactory`; reuse VesselFactory, PortFactory, CounterpartyFactory, VoyageFactory, ItineraryLineFactory.
- `test_port_call_transitions.py`, `test_port_call_correction.py`, `test_timestamp_coherence.py`, `test_cross_module_refs.py`, `test_agent_appointment.py`, `test_port_call_api.py`, `test_timezone_snapshot.py`.

Real SQLite only. No persistence mocking. Parametrize the valid-transition set; targeted invalid cases — do not build an exhaustive matrix.

## 7. CI + OpenAPI

- Existing CI jobs cover the new module. Confirm tach check passes with the new module and the one-directional dependency.
- Verify the partial unique index migration runs on the Postgres CI gate.
- Regenerate `openapi/openapi.json` and commit it — M2 generates types from this.

## 8. TDD discipline

RED → GREEN → REFACTOR. Commit at each GREEN. Real-DB tests only.

## Done when

- All port-call and agent-appointment endpoints work end-to-end via curl/HTTPie against a running dev server with a real session cookie.
- `make test` under 30s, all green. `make lint`, `make typecheck`, `tach check` pass.
- Coverage on `src/modules/port_call/` ≥95% line.
- Migration creates both tables, all constraints, and the partial unique index; runs clean on SQLite and Postgres.
- `openapi/openapi.json` regenerated and committed with all new endpoints.
- CI green on all jobs.

Ask me before making any decision not covered by the specs.
```

---

## M2 — Port Call Panel (frontend, inside Voyage Workspace)

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0016-session-auth-implementation.md
- OPEN_DECISIONS.md (§15)
- docs/port_call/project_description.md
- docs/port_call/architecture.md
- docs/port_call/specifications.md
- docs/port_call/locked_decisions.md
- frontend/README.md
- frontend/src/routes/voyages.$voyageId.workspace.tsx

M1 is complete: port-call and agent-appointment endpoints ship; openapi/openapi.json includes them. The Voyage Workspace page exists (Block 4). The frontend shell, auth, downshift, and codegen pipeline are live.

Implement M2 — Port Call Panel.

**Hard scope: one panel inside the existing Voyage Workspace.** No new top-level routes. No charting.

## 1. Codegen

Run `pnpm run codegen` to regenerate `src/api/schema.ts` with port-call + agent-appointment types. Confirm typecheck passes.

## 2. Components

Under `frontend/src/components/PortCallPanel/`:
- `PortCallPanel.tsx` — fetches the voyage's port calls (TanStack Query, `credentials: "include"`), renders a list/table: status chip, eta/etd, ata/atb/atd, active agent.
- `PortCallForm.tsx` — create/edit, grouped sections: Planning · Actuals · NOR & Clearance · Agent · Notes (D-LOCK-10). Datetime entry via native `input[type=datetime-local]` with a visible port-timezone label. Inline validation mirrors the backend coherence rules (present-only monotonic; clearance datetime requires bool).
- `StatusTransitionControl.tsx` — shows only legal next-states for the current status; calls the transition endpoint.
- `AgentAppointmentSection.tsx` — nominate / appoint / replace; shows the active appointment and the history; agent selection via `downshift` (reused from Block 4).

Mount `PortCallPanel` inside `voyages.$voyageId.workspace.tsx`.

## 3. Tests

- Vitest + RTL: PortCallPanel renders list; PortCallForm opens and validates timestamp order inline; transition mutation called; agent replacement updates the displayed active agent.
- Playwright e2e (`e2e/port_call.spec.ts`): create port call → transition to Berthed → replace agent → reload → verify active agent + appointment history.

Do not over-mock — mock only the API boundary in RTL; use the real seeded backend in Playwright.

## 4. CI

- Frontend job already runs codegen, typecheck, lint, test, e2e, audit. Confirm the new e2e flow is covered; no new dependencies to audit (downshift already present).

## 5. TDD discipline

Tests before components. RED → GREEN → REFACTOR. Commit at each GREEN.

## Done when

- `pnpm run dev` → open a voyage's workspace → Port Call panel lists, creates, edits, and transitions port calls against the live backend.
- Agent nominate / appoint / replace works; active agent and history display correctly.
- `pnpm run build`, `typecheck`, `lint`, `test`, `test:e2e`, `pnpm audit --audit-level=high` all pass.
- CI green on all jobs end-to-end.
- frontend/README.md updated: the Port Call panel, the grouped-form pattern, the datetime-local + timezone-label approach.

Ask me before making any decision not covered by the specs.
```

---

## After M2 green

Per [ADR-0012], write `docs/port_call/runbook.md` before declaring Block 5 done. The runbook should cover:

- How to run backend + frontend locally and reach a port call (log in, open a voyage workspace, open the Port Call panel).
- Seeding: a voyage with itinerary, then a port call, then an agent appointment (curl examples with a session cookie).
- The status lifecycle, legal skips, and how the correction path works (who can use it, what it requires).
- The agent replacement flow and how "active appointment" is derived.
- The timezone model: IANA snapshot, datetime-local entry, server-side UTC conversion.
- Common failure modes: illegal transition (409), timestamp coherence violation (422), agent without Agent role (422), duplicate active appointment (409), correction without role/reason (403/422), datetime-local timezone confusion, partial-index dialect surprises.
- Operational notes: no DA/expense lifecycle; no laytime computation; Statement-of-Facts richer events revisited at Block 6.
- Useful URLs (Swagger, OpenAPI JSON, Vite dev workspace).

Then I (the orchestrator) audit the block, verify diffs and CI evidence for the exact commit, and update `PROJECT_CONTEXT.md` to "Block 5 complete, Block 6 next."
