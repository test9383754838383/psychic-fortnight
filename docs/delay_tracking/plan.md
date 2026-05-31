# Block 9 — Delay Tracking · Plan

M0 coordinator + two milestone terminals. No LLM. Binding contract: this spec
set. Land via branch + PR; merge only on founder's say-so.

Dependency: **M1 → M2.** Start M1 only after Block 8 M1 is merged to main
(avoids alembic/openapi collision).

---

## M0 — Coordinator prompt

```
You are the M0 coordinator for Block 9 — Delay Tracking of the Vessel & Voyage
Operations Control System. You coordinate; you do not write code.

Read first, in full:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/delay_tracking/project_description.md
- docs/delay_tracking/architecture.md
- docs/delay_tracking/specifications.md
- docs/bunker_request/runbook.md  (most recent completed module — same shape)

IMPORTANT: Do not start M1 until Block 8 M1 is merged to main. Both blocks
touch alembic/versions/ and openapi/openapi.json; serialise to avoid conflicts.

Drive M1 → M2 in order. Independently verify each milestone — run gates yourself.
Land via branch + PR. Merge only on founder's say-so.
Co-author: "Claude Opus 4.8 <noreply@anthropic.com>".

Non-negotiables: TDD, real-DB tests, mypy --strict, no `any`, no eslint-disable,
Tach boundaries, ≥95% coverage on src/modules/delay_tracking/, SQLite + Postgres
18 migration. E2e backend must start with TESTING=true.

When both milestones green and merged, write docs/delay_tracking/runbook.md and
close the block (update PROJECT_CONTEXT.md). Next is Block 10 (Tasks & Alerts).
```

---

## M1 — Backend

```
Implement the Delay Tracking backend — module src/modules/delay_tracking/. TDD,
real-DB tests. Read CLAUDE.md, docs/delay_tracking/architecture.md, and
docs/delay_tracking/specifications.md before writing.

IMPORTANT: Branch off current main AFTER Block 8 M1 is merged.

Build, behind failing tests first:

1. src/modules/delay_tracking/models/ — SQLAlchemy 2.0 async:
   Delay with all fields per architecture.md §3. delay_type and
   fault_attribution as String+CheckConstraint. port_call_id and leg_ref both
   nullable — a CHECK constraint enforces mutual exclusivity (both set → invalid).
   Scalar FKs only. Alembic migration; clean on SQLite AND Postgres 18.

2. src/modules/delay_tracking/constants.py — DELAY_TYPES (12 values),
   FAULT_ATTRIBUTIONS (5 values).

3. src/modules/delay_tracking/repository/ — advanced-alchemy repo.

4. src/modules/delay_tracking/service/ — DelayService:
   - create(voyage_id, dto, user): Delay(recorded_by=user, approved_by=None).
     Validate port_call_id XOR leg_ref (422 if both set).
   - update(id, dto, user): reject if approved_by is set (409 — locked).
   - approve(id, user): set approved_by=user; record becomes immutable.
   - actual_duration property: derived from end-start in hours (None if
     end_datetime not set). NOT stored — computed in read DTO.

5. src/modules/delay_tracking/api/ — router + DTOs per specifications.md §2.
   All routes require get_current_user. actual_duration computed in
   DelayReadDTO from model fields, not stored.

6. Register module; Tach config (delay_tracking → voyage_spine, port_call,
   auth). Regenerate + commit openapi/openapi.json.

Tests: create (voyage-level, port-call-level, leg-level); update open delay;
approve locks (edit after → 409); actual_duration derived correctly (null when
open, correct hours when closed); both anchors set → 422; cross-module FK;
auth. Coverage ≥95%.

Gates: make lint, make typecheck, make tach-check, make test; Postgres 18
migration. Report with actual gate output.
```

---

## M2 — Frontend

```
Implement the Delay Tracking frontend panel for Block 9. React + Vite + TS
strict. TDD. No `any`, no eslint-disable. Regenerate typed client from
openapi/openapi.json.

Read CLAUDE.md, docs/delay_tracking/specifications.md §2 before writing.

Build, behind failing tests first:

1. A Delays panel in the Voyage Workspace (no new route):
   - List of delays with type, attribution, start, duration (actual or claimed),
     approved chip.
   - Create form: delay_type, fault_attribution, start_datetime, optional
     end/claimed_duration/description/port_call/leg_ref.
   - Edit form for open (unapproved) delays.
   - Approve button → POST /delays/{id}/approve → record shows locked.
   - TanStack Query; refetch on approve.

2. No charts, no maps.

Tests: Vitest + RTL for list, create, edit, approve, locked state (MSW).
Playwright e2e: create → set end_datetime → approve → record locked.
E2e backend must start with TESTING=true.

Gates: pnpm typecheck, lint, test, test:e2e (--workers=1),
npx eslint --no-inline-config, pnpm audit. Report with actual gate output.
```
