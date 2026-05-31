# Block 9 — Delay Tracking · Architecture

CRUD + an approval lock. No new technology. Same module shape as every prior
block.

## 1. System overview

New `delay_tracking` module. A `Delay` belongs to a `Voyage` and optionally to a
`PortCall` (port delay) or carries a `leg_ref` string (sea-passage delay).
The only logic worth naming is the **approval lock** — once `approved_by` is set,
the record is immutable — and the **`actual_duration` derivation**.

```
  voyage ──▶ Delay (open | approved-locked)
                ├── port_call_id?  (XOR leg_ref?)
                └── approved_by?  (locks on set)
  deps: voyage_spine · port_call · auth  [Tach, no reverse imports]
```

## 2. Layers

```
src/modules/delay_tracking/
  api/          FastAPI router + DTOs
  service/      DelayService (create, update, approve, duration derivation)
  repository/   advanced-alchemy repo
  models/       SQLAlchemy ORM model
  constants.py  DELAY_TYPES (12), FAULT_ATTRIBUTIONS (5)
```

## 3. Data model

```
Delay
  id
  voyage_id          FK (required)
  port_call_id       FK (optional)   ─┐ both nullable; mutually exclusive
  leg_ref            String (optional) ─┘ (no Leg entity in V1)
  delay_type         String + CheckConstraint (12 values)
  fault_attribution  String + CheckConstraint (5 values)
  start_datetime     datetime
  end_datetime       datetime (nullable — open delay)
  claimed_duration   Numeric (hours, optional — manual commercial override)
  description        String
  recorded_by        uuid FK (User)
  approved_by        uuid FK (User, nullable — set on approval, locks record)
```

- `actual_duration` is **derived** (not stored): `end_datetime - start_datetime`
  in hours, returned in the read DTO when `end_datetime` is set. Null if open.
- `port_call_id` XOR `leg_ref` — both nullable means a voyage-level delay carries
  neither. A CHECK constraint enforces mutual exclusivity when both are set.
- Scalar FKs only; no ORM relationships reaching back into this module.

## 4. Approval lock

```
POST /api/v1/delays/{id}/approve
  → set approved_by = current_user, approved_at = now
  → record is now immutable (all edits → 409)
```

- Any authenticated user may approve in V1 (no extra role gate — operator
  discipline; can be tightened later).
- Approval is irreversible in V1. No un-approve.

## 5. Auth

All endpoints require `get_current_user`. No role gate.

## 6. Test architecture

Real-DB tests [ADR-0011]: create; update open delay; approve locks record; edit
after approval → 409; `actual_duration` derived correctly; port/voyage/leg
anchor variants; cross-module FK; auth required.
Frontend: Vitest + RTL; Playwright e2e create → set end → approve → locked.

## 7. Milestones

M1 backend · M2 frontend. Detail in `plan.md`.
