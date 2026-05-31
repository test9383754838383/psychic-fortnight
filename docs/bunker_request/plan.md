# Block 8 — Bunker Request · Plan

M0 coordinator + two milestone terminals. No LLM, same module shape as prior
blocks. Binding contract: this spec set.

---

## M0 — Coordinator prompt

```
You are the M0 coordinator for Block 8 — Bunker Request of the Vessel & Voyage
Operations Control System. You coordinate; you do not write code.

Read first, in full:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/bunker_request/project_description.md
- docs/bunker_request/architecture.md
- docs/bunker_request/specifications.md
- docs/checklists/runbook.md   (most recent completed module — same shape)

Drive M1 → M2 in order. Independently verify each milestone — run gates yourself
(make lint, make typecheck, make tach-check, make test; frontend:
pnpm typecheck/lint/test/test:e2e/audit + npx eslint --no-inline-config).
Land via branch + PR (never push main directly). Merge only on founder's say-so.
Co-author: "Claude Opus 4.8 <noreply@anthropic.com>".

Non-negotiables: TDD, real-DB tests, mypy --strict, no `any`, no eslint-disable,
Tach boundaries, ≥95% coverage on src/modules/bunker_request/, SQLite + Postgres
18 migration. E2e backend must start with TESTING=true (disables login rate
limiter for serial e2e runs — see docs/checklists/runbook.md §8).

When both milestones green and merged, write docs/bunker_request/runbook.md and
close the block (update PROJECT_CONTEXT.md). Next is Block 9 (Delay Tracking).
```

---

## M1 — Backend

```
Implement the BunkerRequest backend — module src/modules/bunker_request/. TDD,
real-DB tests. Read CLAUDE.md, docs/bunker_request/architecture.md, and
docs/bunker_request/specifications.md before writing.

Build, behind failing tests first:

1. src/modules/bunker_request/models/ — SQLAlchemy 2.0 async:
   BunkerRequest with all fields per architecture.md §3. fuel_type and status
   as String+CheckConstraint. Scalar FKs only (voyage_id required,
   port_call_id/supplier_id optional). Alembic migration; clean on SQLite AND
   Postgres 18.

2. src/modules/bunker_request/constants.py — FUEL_TYPES (8 values), status
   enum, LEGAL_TRANSITIONS per architecture.md §4:
   Raised->{In Progress, Blocked};
   In Progress->{Stemmed, Blocked};
   Stemmed->{Supplied, Blocked};
   Supplied->{};
   Blocked->{Raised, In Progress, Stemmed}  (unblock: operator supplies target).

3. src/modules/bunker_request/repository/ — advanced-alchemy repo.

4. src/modules/bunker_request/service/ — BunkerRequestService:
   - create(voyage_id, dto, user): BunkerRequest(status=Raised, raised_by,
     raised_at=now).
   - transition(id, target, blocker_note, user): validate LEGAL_TRANSITIONS
     (409 on illegal); if target=Blocked and no blocker_note → 422; if
     target=Supplied (terminal) → immutable after; set blocker_note on
     Blocked, clear it on unblock.
   - update(id, dto): reject if Supplied (409).

5. src/modules/bunker_request/api/ — router + DTOs per specifications.md §2.
   All routes require get_current_user.

6. Register module; Tach config (bunker_request → voyage_spine, port_call,
   master_data, auth). Regenerate + commit openapi/openapi.json.

Tests: create; full FSM forward (Raised→In Progress→Stemmed→Supplied);
Blocked from each non-terminal; unblock; blocker_note mandatory on Blocked
(422 without); terminal immutability; cross-module FK; auth required.
Coverage ≥95%.

Gates: make lint, make typecheck, make tach-check, make test; Postgres 18
migration. Report with actual gate output.
```

---

## M2 — Frontend

```
Implement the Bunker Request frontend panel for Block 8. React + Vite + TS
strict. TDD. No `any`, no eslint-disable. Regenerate typed client from
openapi/openapi.json.

Read CLAUDE.md, docs/bunker_request/specifications.md §2 before writing.

Build, behind failing tests first:

1. A Bunker Requests panel in the Voyage Workspace (no new route):
   - List of requests with fuel_type, quantity, status chip, supplier, eta.
   - Create form: fuel_type select, quantity, grade, sulphur, optional
     port_call/supplier/eta.
   - Transition controls: forward buttons + Blocked toggle with mandatory
     blocker_note input. Supplied = terminal, no further controls.
   - TanStack Query; refetch on transition.

2. No charts, no maps.

Tests: Vitest + RTL for list, create, transition, blocked-note required,
terminal state (MSW). Playwright e2e: create → In Progress → Stemmed →
Supplied → controls locked. Start e2e backend with TESTING=true.

Gates: pnpm typecheck, lint, test, test:e2e (--workers=1),
npx eslint --no-inline-config, pnpm audit. Report with actual gate output.
```
