# Block 8 — Bunker Request · Architecture

Plain CRUD + a small status workflow. No new technology. Same module shape as
every prior block.

## 1. System overview

New `bunker_request` module. A `BunkerRequest` belongs to a `Voyage` and
optionally to a `PortCall`. The only logic worth naming is the **status machine**
and the **Blocked-note invariant**.

```
  voyage ──▶ BunkerRequest (Raised|In Progress|Stemmed|Supplied|Blocked)
                  ▲ optional port_call FK
                  ▲ optional supplier FK (Counterparty)
  deps (scalar FK only): voyage_spine · port_call · master_data · auth
```

## 2. Layers

```
src/modules/bunker_request/
  api/          FastAPI router + DTOs
  service/      BunkerRequestService (create, transition, blocker validation)
  repository/   advanced-alchemy repo
  models/       SQLAlchemy ORM model
  constants.py  FUEL_TYPES, LEGAL_TRANSITIONS, status/fuel enums
```

## 3. Data model

```
BunkerRequest
  id
  voyage_id          FK (required)
  port_call_id       FK (optional)
  fuel_type          String + CheckConstraint (8 values)
  quantity_required_mt  Numeric
  specification_grade   String (optional)
  max_sulphur_content   Numeric (optional)
  status             String + CheckConstraint (5 values)
  blocker_note       String (nullable — mandatory when status=Blocked)
  raised_by          uuid FK (User)
  raised_at          datetime
  supplier_id        uuid FK (Counterparty, optional)
  eta_supply         datetime (optional)
```

Scalar FKs only — no ORM relationships reaching back into this module.

## 4. Status machine

```
Raised ──▶ In Progress ──▶ Stemmed ──▶ Supplied  (terminal)
  │              │             │
  └──────────────┴─────────────┴──▶ Blocked  (can unblock back to prior state)
```

- `Supplied` is terminal.
- `Blocked` is a side-state: any non-terminal status can transition to Blocked.
- Unblocking transitions Blocked back to the last non-Blocked status (stored as
  `pre_blocked_status` on the model, or operator supplies the target — fixed in
  specifications.md).
- `blocker_note` is mandatory when transitioning to Blocked; 422 if absent.

Implemented as an explicit-dict `LEGAL_TRANSITIONS`, same pattern as every
prior block.

## 5. Auth

All endpoints require `get_current_user`. No extra role gate in V1 — any
authenticated operator may raise/transition bunker requests.

## 6. Test architecture

Real-DB tests [ADR-0011]: create; full FSM forward; blocked/unblock; blocker-note
mandatory; terminal-state immutability; cross-module FK validation; auth required.
Frontend: Vitest + RTL; Playwright e2e create → transition → Supplied.

## 7. Milestones

M1 backend · M2 frontend. Detail in `plan.md`.
