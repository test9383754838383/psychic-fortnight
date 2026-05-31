# Block 7b — Checklists · Project Description

## What this block is

Block 7b builds the **Checklists** layer: ordered, item-by-item sign-off lists
attached to a port call. It is the second half of the roadmap's original Block 7
(`V1_ROADMAP.md §Block 7b`), split off from Forms because it shares no entities,
carries no LLM, and is plain ordered-CRUD with a small sign-off lifecycle.

An operator opens a port call, creates a Pre-Arrival or Pre-Departure checklist,
and signs off each item in turn. When every item is signed off, the checklist is
complete. The point is procedural assurance — a verifiable record that the
required pre-arrival / pre-departure steps were each actioned, by whom, and when.

## Why it exists

Pre-arrival and pre-departure checks are a standard shore-Ops control. Today
they live in spreadsheets or memory; there is no traceable per-item sign-off tied
to the port call. This block makes each step an auditable record
(`signed_off_by` / `signed_off_at`), which matters for procedural compliance and
dispute defence.

## What it delivers

**Checklist**
- `port_call_id` (scalar FK), `checklist_type` (`Pre-Arrival` / `Pre-Departure`),
  `created_at`, `status` (`Open` / `Completed`).
- `Completed` is derived/enforced: a checklist completes only when all its items
  are `Signed Off`.

**ChecklistItem**
- `checklist_id` (FK), `sequence_no` (ordered), `item_name`, `status`
  (`Pending` / `Signed Off`), `signed_off_at`, `signed_off_by` (User ref).
- Ordered by `sequence_no`. Sign-off records who and when.

**Frontend**
- A checklist panel inside the existing Voyage Workspace / Port Call view: list
  of items in order with a sign-off control per item and an overall status chip.
  No new top-level route.

## What it is NOT

- **Not** LLM-driven — no parsing, no Forms overlap. (That is Block 7a.)
- **Not** a template engine. V1 seeds a fixed default item set per checklist
  type; configurable templates are deferred.
- **Not** append-only. Sign-off is in-place mutation of the item
  (`Pending → Signed Off`), with the actor/time recorded.
- **Not** a generic task system — that is Block 10 (Tasks & Alerts).
- No charts, no maps.

## Success criteria

- Operator opens a port call → creates a Pre-Arrival checklist → its default
  items appear in order, all `Pending`.
- Operator signs off an item → it shows `Signed Off` with their name and
  timestamp; `Pending` items remain.
- When the last item is signed off → the checklist auto-completes
  (`status = Completed`).
- A checklist with any `Pending` item cannot be forced `Completed`.
- `make lint`, `make typecheck`, `tach check`, `make test` pass; coverage on
  `src/modules/checklists/` ≥ 95%.
- Migration runs clean on SQLite and Postgres 18.
- Frontend `pnpm run typecheck`, `lint`, `test`, `test:e2e`, `audit` pass.
- `openapi/openapi.json` regenerated and committed.

## Constraints

- TDD. Real-DB backend tests only. [ADR-0011]
- `mypy --strict`. No `any`. [ADR-0002]
- Tach boundaries: new `checklists` module, outward deps only
  (`port_call`, `auth`), no reverse imports. [ADR-0010]
- 12-Factor App.
- No future-proofing: fixed default item sets, no template configurator. [CLAUDE.md §1]
