# Block 7b — Checklists · Specifications

Tech stack is entirely references to existing ADRs — this block adds no new
technology.

## 1. Tech stack (references)

| Concern | Choice | Source |
|---|---|---|
| Module | New `checklists` module | [ADR-0001] |
| Backend | Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2 | [ADR-0002] |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic | [ADR-0003] |
| DB | SQLite (dev/CI) · Postgres 18 (prod) | [ADR-0004] |
| Boundary | Tach — `checklists` → `port_call`, `auth` only | [ADR-0010] |
| Auth | Session-based; authenticated user (no extra role gate) | [ADR-0016] |
| Tests | pytest real-DB; Vitest + RTL; Playwright | [ADR-0011] |
| Frontend | React + Vite + TS strict; openapi codegen; TanStack Query | [ADR-0005] |

No new backend or frontend dependencies.

## 2. API surface

All under `/api/v1`; all require `get_current_user`. DTOs are Pydantic.

```
POST /api/v1/port-calls/{id}/checklists      create (seeds default items)
GET  /api/v1/port-calls/{id}/checklists      list checklists for a port call
GET  /api/v1/checklists/{id}                 one checklist + ordered items
POST /api/v1/checklist-items/{id}/sign-off   sign off one item
```

### DTOs

```jsonc
// ChecklistCreateDTO  (request body for create)
{ "checklist_type": "Pre-Arrival | Pre-Departure" }

// ChecklistReadDTO
{ "id": "uuid", "port_call_id": "uuid",
  "checklist_type": "...", "status": "Open | Completed",
  "created_at": "datetime",
  "items": [ /* ChecklistItemReadDTO, ordered by sequence_no */ ] }

// ChecklistItemReadDTO
{ "id": "uuid", "checklist_id": "uuid", "sequence_no": 1,
  "item_name": "string", "status": "Pending | Signed Off",
  "signed_off_at": "datetime?", "signed_off_by": "uuid?" }
```

Sign-off takes no body — actor is the authenticated user, time is `now`.

### Error mapping

| Condition | HTTP |
|---|---|
| Unknown `checklist_type` | 422 |
| Port call / item not found | 404 |
| Unauthenticated | 401 |
| Re-sign an already-signed item | see D-ENTRY-3 |

No PUT/DELETE. Checklists and items are not editable beyond sign-off (V1).

## 3. Default item sets (seeded on create)

Fixed constants in `constants.py`. Representative V1 defaults (operator-tunable
later, not configurable in V1):

**Pre-Arrival**
1. Pre-arrival notice sent to agent
2. Berth/anchorage confirmed
3. Pilot booked
4. Cargo documents received
5. NOR tender readiness confirmed

**Pre-Departure**
1. Cargo operations completed
2. Statement of Facts signed
3. Outstanding disbursements reviewed
4. Departure clearance obtained
5. Next-port ETA communicated

(Exact wording fixed in M1; the list is a fixed default, not a template engine.)

## 4. D-entries (tunable)

| ID | Decision | Default | Rationale |
|---|---|---|---|
| D-ENTRY-1 | Default item sets | the §3 lists | Fixed constants; no configurator (CLAUDE.md §1). |
| D-ENTRY-2 | Multiple checklists of same type per port call | allowed | No hard uniqueness; simplest. Operator discipline, not DB constraint. |
| D-ENTRY-3 | Re-sign an already-signed item | **idempotent no-op** (200, unchanged actor/time) | Simpler than a 409; sign-off is a one-way latch. Original actor/time preserved. |
| D-ENTRY-4 | Checklist list order | `created_at` | Predictable. |

## 5. Rejected alternatives

| Rejected | Why |
|---|---|
| Configurable checklist templates | Future-proofing; fixed default sets suffice for V1 (CLAUDE.md §1). |
| Append-only sign-off (correction rows) | Overkill — a sign-off is a one-way latch; in-place mutation with actor/time is the audit record. |
| Manual "complete checklist" endpoint | Completion is derived from item states; a manual flag could contradict pending items. |
| Folding checklists into Forms or Tasks | Roadmap explicitly keeps them separate (ordered per-item sign-off). [V1_ROADMAP §7b] |
| Role gate on sign-off | A sign-off is the operator's own attestation; `signed_off_by` is the record. No trusted-data gate needed. |

## 6. Risks & open decisions

| Risk | Mitigation |
|---|---|
| Default items don't match a customer's real procedure | Fixed but easily edited in `constants.py`; configurable templates are a clean later block if needed. |
| Re-sign semantics surprise an operator | D-ENTRY-3 fixed as idempotent; documented in runbook. |

No new `OPEN_DECISIONS` entries.

## 7. Definition of done

All `project_description.md §Success criteria`, plus `openapi/openapi.json`
regenerated, coverage ≥ 95% on `src/modules/checklists/`, CI green incl. Postgres
18 migration, `docs/checklists/runbook.md` written.
