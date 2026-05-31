# Block 7b — Checklists · Plan

M0 coordinator + two milestone terminals (M1 backend, M2 frontend). No LLM, so no
third milestone. Binding contract: this spec set + `docs/checklists/`. Each
milestone is a fresh, self-contained terminal; founder reviews between them; land
via branch + PR; merge only on founder's say-so.

Dependency order: **M1 → M2.** M2 consumes the API from M1.

---

## M0 — Coordinator prompt

```
You are the M0 coordinator for Block 7b — Checklists of the Vessel & Voyage
Operations Control System. You coordinate; you do not write code.

Read first, in full:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/checklists/project_description.md
- docs/checklists/architecture.md
- docs/checklists/specifications.md
- docs/port_call/runbook.md   (the parent module's pattern)
- docs/forms/runbook.md       (the most recent module — same module shape)

Drive M1 → M2, one fresh terminal each, in order. For each milestone: hand the
coder the prompt below; when they report done, INDEPENDENTLY VERIFY — run the
gates yourself (make lint, make typecheck, make tach-check, make test; for M2 the
frontend gates incl. `npx eslint --no-inline-config`) and confirm the contract
(D-ENTRY-1..4, derived completion, no role gate). Land via branch + PR (never
push main directly — harness blocks it). Merge only on founder's explicit say-so.
Co-author trailer: "Claude Opus 4.8 <noreply@anthropic.com>".

Non-negotiables: TDD, real-DB tests, mypy --strict, no `any`, no eslint-disable,
Tach boundaries, ≥95% coverage on src/modules/checklists/, SQLite + Postgres 18
migration. No future-proofing (no template configurator — fixed default item
sets).

When both green and merged, write docs/checklists/runbook.md and close the block
(update PROJECT_CONTEXT.md). Block 7 (Forms & Checklists) is then fully done;
next is Block 8 (Bunker Request).
```

---

## M1 — Backend (models + service + API)

```
Implement the Checklists backend — module src/modules/checklists/. TDD, real-DB
tests (ADR-0011). Read CLAUDE.md, docs/checklists/architecture.md, and
docs/checklists/specifications.md before writing.

Build, behind failing tests first:

1. src/modules/checklists/models/ — SQLAlchemy 2.0 async:
   - Checklist: port_call_id (scalar FK), checklist_type String+CheckConstraint
     (Pre-Arrival|Pre-Departure), status String+CheckConstraint(Open|Completed),
     created_at.
   - ChecklistItem: checklist_id FK, sequence_no int, item_name str,
     status String+CheckConstraint(Pending|Signed Off), signed_off_at datetime?,
     signed_off_by uuid? (scalar User FK).
   Scalar FKs only — no ORM relationship into checklists from other modules
   (ADR-0010). Alembic migration; clean on SQLite AND Postgres 18.

2. src/modules/checklists/constants.py — CHECKLIST_TYPES, status enums, and the
   fixed DEFAULT_ITEMS map (Pre-Arrival / Pre-Departure lists per
   specifications.md §3). No template configurator.

3. src/modules/checklists/repository/ — advanced-alchemy repos.

4. src/modules/checklists/service/checklist_service.py —
   - create(port_call_id, checklist_type, user): create Checklist(Open) + seed
     ChecklistItem rows from DEFAULT_ITEMS (sequence_no 1..N, Pending).
   - sign_off(item_id, user): set item Signed Off + signed_off_by + signed_off_at;
     if ALL items in the parent checklist are Signed Off, set checklist Completed.
     Re-signing an already-signed item is an idempotent no-op preserving the
     original actor/time (D-ENTRY-3). No manual complete endpoint — completion is
     derived only.
   - read helpers (list by port call, get one with ordered items).

5. src/modules/checklists/api/ — router + DTOs per specifications.md §2
   (ChecklistCreateDTO, ChecklistReadDTO, ChecklistItemReadDTO). All routes
   require get_current_user; no extra role gate. Error mapping per §2.

6. Register module; Tach config (checklists → port_call, auth only). Regenerate +
   commit openapi/openapi.json.

Tests (real DB): create seeds correct ordered default items per type; sign-off
sets actor/time + flips status; last sign-off auto-completes; a pending item
keeps Open; re-sign idempotent; ordering by sequence_no; cross-module FK
validation; auth required. Coverage ≥95%.

Gates: make lint, make typecheck, make tach-check, make test; verify Postgres 18
migration. Report with actual gate output.
```

---

## M2 — Frontend (port-call checklist panel)

```
Implement the Checklists frontend panel for Block 7b. React + Vite + TS strict.
TDD (Vitest + RTL); Playwright e2e. No `any`, no eslint-disable. Regenerate the
typed client from the committed openapi/openapi.json — do not hand-write types.

Read CLAUDE.md, docs/checklists/architecture.md, and
docs/checklists/specifications.md §2 before writing.

Build, behind failing tests first:

1. A Checklist panel inside the existing Port Call / Voyage Workspace view (no
   new top-level route). It shows:
   - a control to create a Pre-Arrival or Pre-Departure checklist
     (POST /port-calls/{id}/checklists),
   - each checklist with its items in sequence_no order, an overall status chip
     (Open/Completed), and per-item status + signed-off-by/at,
   - a sign-off button per Pending item (POST /checklist-items/{id}/sign-off).
   Use TanStack Query; refetch on sign-off so the checklist auto-completes in
   the UI when the last item is signed.

2. No charts, no maps.

Tests: Vitest + RTL for the panel, create, sign-off, and the
auto-complete-on-last-item behaviour (MSW handlers; no live backend).
Playwright e2e: create a Pre-Arrival checklist → sign off all items →
checklist shows Completed. CI runs Playwright workers:1; run locally with
--workers=1 (OPEN_DECISIONS §17).

Gates: pnpm run typecheck, lint, test, test:e2e (--workers=1),
npx eslint --no-inline-config, pnpm audit --audit-level=high.
Report with actual gate output.
```

---

## After M2

When M1–M2 green and merged: write `docs/checklists/runbook.md` (startup, create
+ sign-off curl examples, completion derivation, default item sets, test
commands), then close the block — update `PROJECT_CONTEXT.md`. Block 7 is then
fully complete; next is Block 8 (Bunker Request).
```
