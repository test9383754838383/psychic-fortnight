# Block 9 — Delay Tracking · Project Description

## What this block is

Block 9 builds the **Delay Tracking** layer: a structured record of every delay
event on a voyage or port call, with enough attribution and duration data to
support commercial dispute handling later. Shore operators record delays as they
happen; a supervisor approves the record, which locks it.

V1 is operational-first: capture the delay, type it, attribute fault, record
start/end, and lock it on approval. The commercial calculation layer (laytime,
demurrage) is out of V1 scope. (`V1_ROADMAP.md §Block 9`)

## Why it exists

Delays are the primary source of commercial disputes in voyage operations. Without
a structured record, operators reconstruct events from emails after the fact.
This block creates the data substrate — typed, attributed, approval-locked — that
feeds later dispute defence and laytime calculation.

## What it delivers

**Delay**
- `voyage_id` (required).
- `port_call_id` (optional, for port delays) XOR `leg_ref` (optional, for
  sea-passage delays) — mutually exclusive, both nullable (voyage-level delays
  carry neither).
- `delay_type` (12 values): `Weather / Mechanical / Port Congestion / Awaiting
  Berth / Awaiting Orders / Cargo Operations / Bunkering Delay / Strike /
  Deviation / Piracy/Security / Quarantine/Disease / Other`.
- `fault_attribution` (5 values): `Vessel / Charterer / Port / Weather /
  Force Majeure`.
- `start_datetime`, `end_datetime` (nullable until resolved).
- `actual_duration` — derived from start/end, not stored.
- `claimed_duration` — manual override (operator's commercial claim).
- `description` — free text.
- `recorded_by` (User ref), `approved_by` (User ref — set on approval, locks
  the record).

**Frontend**
- A Delay panel inside the Voyage Workspace (no new route). List + create form +
  approve control.

## What it is NOT

- Not a laytime calculator. Duration data is captured; the calculation engine
  is out of V1.
- Not a demurrage claim workflow.
- `leg_ref` is a placeholder FK — `Leg` as a distinct entity is not in V1 scope.
  Sea-passage delays carry a nullable `leg_ref` string reference only.
- No charts, no maps.

## Success criteria

- Operator creates a delay on a voyage (port delay with `port_call_id`, or
  voyage-level with neither anchor).
- Operator sets `end_datetime`; `actual_duration` is returned derived.
- Supervisor approves the record → `approved_by` is set → record is immutable.
- Non-approved records can be edited; approved records return 409 on edit.
- `make lint`, `make typecheck`, `tach check`, `make test` pass; coverage ≥ 95%
  on `src/modules/delay_tracking/`.
- Migration clean on SQLite and Postgres 18.
- Frontend gates pass. `openapi/openapi.json` regenerated and committed.

## Constraints

- TDD. Real-DB backend tests. [ADR-0011]
- `mypy --strict`. No `any`. [ADR-0002]
- Tach: new `delay_tracking` module, outward deps only (`voyage_spine`,
  `port_call`, `auth`). [ADR-0010]
- Approval lock enforced at service layer — not just API layer.
- No future-proofing: no laytime fields, no claim entity, no leg entity.
  [CLAUDE.md §1]
