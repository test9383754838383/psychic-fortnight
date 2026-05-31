# Block 8 — Bunker Request · Specifications

No new technology. All references to existing ADRs.

## 1. Tech stack

| Concern | Choice | Source |
|---|---|---|
| Module | New `bunker_request` module | [ADR-0001] |
| Backend | Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2 | [ADR-0002] |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic | [ADR-0003] |
| DB | SQLite (dev/CI) · Postgres 18 (prod) | [ADR-0004] |
| Boundary | Tach: bunker_request → voyage_spine, port_call, master_data, auth | [ADR-0010] |
| Auth | Session-based; authenticated user | [ADR-0016] |
| Tests | pytest real-DB; Vitest + RTL; Playwright | [ADR-0011] |
| Frontend | React + Vite + TS strict; openapi codegen; TanStack Query | [ADR-0005] |

No new dependencies.

## 2. API surface

```
POST /api/v1/voyages/{id}/bunker-requests      create
GET  /api/v1/voyages/{id}/bunker-requests      list for voyage
GET  /api/v1/bunker-requests/{id}              get one
PATCH /api/v1/bunker-requests/{id}             edit pre-supplied fields
POST /api/v1/bunker-requests/{id}/transition   status transition
```

### DTOs

```jsonc
// BunkerRequestCreateDTO
{ "fuel_type": "HFO|VLSFO|MGO|LSMGO|HSFO|ULSD|LNG|Biofuel",
  "quantity_required_mt": 450.0,
  "specification_grade": "ISO 8217 RMG 380",   // optional
  "max_sulphur_content": 0.5,                   // optional
  "port_call_id": "uuid?",
  "supplier_id": "uuid?",
  "eta_supply": "datetime?" }

// BunkerRequestTransitionDTO
{ "status": "In Progress|Stemmed|Supplied|Blocked",
  "blocker_note": "string — mandatory when status=Blocked" }

// BunkerRequestReadDTO  (full record)
{ "id", "voyage_id", "port_call_id?", "fuel_type", "quantity_required_mt",
  "specification_grade?", "max_sulphur_content?", "status", "blocker_note?",
  "raised_by", "raised_at", "supplier_id?", "eta_supply?" }
```

### Error mapping

| Condition | HTTP |
|---|---|
| Unknown fuel_type | 422 |
| Transition to Blocked with no blocker_note | 422 |
| Illegal FSM transition | 409 |
| Edit on Supplied (terminal) | 409 |
| Not found | 404 |
| Unauthenticated | 401 |

## 3. D-entries

| ID | Decision | Default | Rationale |
|---|---|---|---|
| D-ENTRY-1 | Unblock target | operator supplies target status in transition body | Explicit is safer than inferring pre_blocked_status. |
| D-ENTRY-2 | Multiple bunker requests per voyage | allowed | Different fuel types / ports; no uniqueness constraint. |
| D-ENTRY-3 | PATCH on Blocked status | allowed pre-supplied fields (quantity, supplier, eta) | Operator may need to update while blocked. |

## 4. Rejected alternatives

| Rejected | Why |
|---|---|
| Delivered volume / temperature fields | Out of V1 scope (CLAUDE.md §1, V1_ROADMAP §Block 8). |
| Auto-transition on supplier confirmation | No external integration in V1; manual only. |
| Role gate on transitions | No trusted-data gate needed; operator is accountable. |

## 5. Definition of done

All `project_description.md §Success criteria`, plus openapi regenerated, coverage
≥ 95%, CI green incl. Postgres 18 migration, `docs/bunker_request/runbook.md`
written.
