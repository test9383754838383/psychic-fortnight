# Block 7b — Checklists · Architecture

Plain CRUD + a small sign-off lifecycle. No new technology, no LLM. Follows the
same module shape as every prior block.

## 1. System overview

New `checklists` module in the monolith [ADR-0001]. It hangs off the port call:
a `Checklist` belongs to one `PortCall`; a `ChecklistItem` belongs to one
`Checklist`. The only logic worth naming is **completion derivation** — a
checklist is `Completed` exactly when all its items are `Signed Off`.

```
  port call ──▶ Checklist (Open|Completed) ──▶ ChecklistItem[] (Pending|Signed Off, ordered)
                       ▲ completion derived from item states
  deps (scalar FK only): port_call · auth      [Tach-enforced, no reverse imports]
```

## 2. Layers

Standard layering, same as `operational_reporting` / `port_call`:

```
src/modules/checklists/
  api/          FastAPI router + DTOs
  service/      ChecklistService (create, sign-off, completion derivation)
  repository/   advanced-alchemy repos for Checklist, ChecklistItem
  models/       SQLAlchemy ORM models
  constants.py  CHECKLIST_TYPES, default item sets per type, status enums
```

## 3. Data model

```
Checklist                              ChecklistItem
  id                                     id
  port_call_id   FK (scalar)             checklist_id   FK
  checklist_type CHECK(Pre-Arrival|       sequence_no    int (ordered)
                 Pre-Departure)          item_name      str
  status         CHECK(Open|Completed)   status         CHECK(Pending|Signed Off)
  created_at                             signed_off_at  datetime?
                                         signed_off_by  uuid? (User ref, scalar FK)
```

- `checklist_type` and both `status` fields: String + CheckConstraint, no lookup
  tables — same pattern as Block 5/6.
- `port_call_id` and `signed_off_by` are scalar FKs; no ORM relationship reaches
  *into* `checklists` from other modules. Navigation is from the `checklists`
  side only [ADR-0010 boundary].
- Items are ordered by `sequence_no` within a checklist.

## 4. Core flow

### Create a checklist (seeds default items)

```
POST /api/v1/port-calls/{id}/checklists  {checklist_type}
  → ChecklistService.create(port_call_id, checklist_type, user)
      create Checklist(status=Open)
      seed ChecklistItem rows from the fixed default set for that type
        (sequence_no 1..N, status=Pending)
  → 201 ChecklistReadDTO (with ordered items)
```

Default item sets are fixed constants per type (no template configurator —
CLAUDE.md §1). One checklist of each type per port call is the expected use;
duplicates are allowed but not encouraged (no hard uniqueness in V1).

### Sign off an item (in-place; may auto-complete the checklist)

```
POST /api/v1/checklist-items/{id}/sign-off
  → ChecklistService.sign_off(item_id, user)
      set item.status=Signed Off, signed_off_by=user, signed_off_at=now
      if ALL items in the parent checklist are Signed Off:
        set checklist.status=Completed
  → 200 ChecklistItemReadDTO
```

- Sign-off is **in-place mutation**, not append-only. The actor and time are
  recorded on the item.
- Completion is **derived** — the service flips `Completed` only when the last
  item is signed off. There is no manual "complete" endpoint; a checklist with
  any `Pending` item can never be `Completed`.
- Re-signing an already-signed item is idempotent (no error, no change of
  actor/time) — or rejected 409; fixed as a D-entry in `specifications.md`.

### Read

```
GET /api/v1/port-calls/{id}/checklists     list checklists for a port call
GET /api/v1/checklists/{id}                one checklist with ordered items
```

## 5. Auth posture

Session auth [ADR-0016]. All endpoints require `get_current_user`. Any
authenticated user may create checklists and sign off items — sign-off captures
*who* via `signed_off_by`, which is the accountability record. No extra role gate
in V1 (unlike Block 6/7a acceptance, which guards trusted data; a checklist
sign-off is the operator's own attestation).

## 6. Async / learning loop

None. Synchronous CRUD. No background jobs, no LLM, no streaming.

## 7. Test architecture

Real-DB tests only [ADR-0011]:
- create seeds the correct ordered default items per type;
- sign-off sets actor/time and flips item status;
- last sign-off auto-completes the checklist; a pending item keeps it Open;
- ordering by `sequence_no`; cross-module FK validation (port_call, user);
- auth required.
Frontend: Vitest + RTL for the panel and sign-off control; Playwright e2e
create → sign off all → checklist shows Completed.

## 8. Milestones

M1 backend (models + service + API + migration) · M2 frontend (port-call panel).
Two milestones — no LLM boundary to isolate. Detail in `plan.md`.
