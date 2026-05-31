# Block 8 — Bunker Request · Project Description

## What this block is

Block 8 builds the **Bunker Request** layer: the operational record of a fuel
request raised against a voyage or port call. Shore operators raise a bunker
request (specifying fuel type, quantity, grade, and supplier), track it through
a simple status workflow, and flag it as blocked when something prevents supply.

This is a trimmed V1 scope — request, status, blocker, and basic supply context
only. Full bunker management (delivered volumes, temperatures, procurement
workflow) is out of V1 scope. (`V1_ROADMAP.md §Block 8`)

## Why it exists

Bunker (fuel) supply is a critical operational dependency. A request not tracked
means operators chase suppliers by email with no visibility. This block gives
shore Ops a single status record per bunker request: raised → stemmed → supplied,
or blocked with a note explaining why. Enough for the MLP; full procurement lives
in a later version.

## What it delivers

**BunkerRequest**
- `voyage_id` (required), `port_call_id` (optional — if supply is at a specific
  port call).
- `fuel_type`: `HFO / VLSFO / MGO / LSMGO / HSFO / ULSD / LNG / Biofuel`.
- `quantity_required_mt`, `specification_grade` (ISO 8217), `max_sulphur_content`.
- `status`: `Raised → In Progress → Stemmed → Supplied` (forward only) or
  `Blocked` (from Raised/In Progress/Stemmed — a side-state, not terminal).
- `blocker_note` (mandatory when status is Blocked).
- `raised_by` (User ref), `raised_at`.
- `supplier_id` (Counterparty ref, optional), `eta_supply`.

**Frontend**
- A Bunker Requests panel inside the Voyage Workspace (no new route).
- List of requests with status chips; create form; transition controls.

## What it is NOT

- Not full bunker procurement — no delivered volume, no temperature, no invoice,
  no price management. (`V1_ROADMAP.md §Block 8`)
- Not a multi-leg fuel planning tool.
- No file attachments.
- No charts, no maps.

## Success criteria

- Operator creates a bunker request on a voyage → it appears with status Raised.
- Operator transitions it through the workflow (Raised → In Progress → Stemmed →
  Supplied).
- Operator marks it Blocked with a note; note is mandatory.
- `make lint`, `make typecheck`, `tach check`, `make test` pass; coverage ≥ 95%
  on `src/modules/bunker_request/`.
- Migration clean on SQLite and Postgres 18.
- Frontend gates pass. `openapi/openapi.json` regenerated and committed.

## Constraints

- TDD. Real-DB backend tests. [ADR-0011]
- `mypy --strict`. No `any`. [ADR-0002]
- Tach: new `bunker_request` module, outward deps only (`voyage_spine`,
  `port_call`, `master_data`, `auth`). [ADR-0010]
- No future-proofing: no delivered-volume fields, no procurement workflow.
  [CLAUDE.md §1]
