# Block 9 — Delay Tracking · Specifications

No new technology. All references to existing ADRs.

## 1. Tech stack

| Concern | Choice | Source |
|---|---|---|
| Module | New `delay_tracking` module | [ADR-0001] |
| Backend | Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2 | [ADR-0002] |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic | [ADR-0003] |
| DB | SQLite (dev/CI) · Postgres 18 (prod) | [ADR-0004] |
| Boundary | Tach: delay_tracking → voyage_spine, port_call, auth | [ADR-0010] |
| Auth | Session-based; authenticated user | [ADR-0016] |
| Tests | pytest real-DB; Vitest + RTL; Playwright | [ADR-0011] |
| Frontend | React + Vite + TS strict; openapi codegen; TanStack Query | [ADR-0005] |

No new dependencies.

## 2. API surface

```
POST /api/v1/voyages/{id}/delays        create
GET  /api/v1/voyages/{id}/delays        list for voyage
GET  /api/v1/delays/{id}               get one
PATCH /api/v1/delays/{id}              edit (pre-approval only)
POST /api/v1/delays/{id}/approve       approve + lock
```

### DTOs

```jsonc
// DelayCreateDTO
{ "delay_type": "Weather|Mechanical|Port Congestion|Awaiting Berth|Awaiting Orders|Cargo Operations|Bunkering Delay|Strike|Deviation|Piracy/Security|Quarantine/Disease|Other",
  "fault_attribution": "Vessel|Charterer|Port|Weather|Force Majeure",
  "start_datetime": "datetime",
  "end_datetime": "datetime?",
  "claimed_duration": 4.5,        // hours, optional
  "description": "string",
  "port_call_id": "uuid?",        // XOR leg_ref
  "leg_ref": "string?" }          // XOR port_call_id

// DelayUpdateDTO  (all optional)
{ "delay_type", "fault_attribution", "start_datetime", "end_datetime",
  "claimed_duration", "description", "port_call_id", "leg_ref" }

// DelayReadDTO
{ "id", "voyage_id", "port_call_id?", "leg_ref?",
  "delay_type", "fault_attribution",
  "start_datetime", "end_datetime?",
  "actual_duration",   // derived float (hours) or null if end not set
  "claimed_duration?", "description",
  "recorded_by", "approved_by?" }
```

Approve endpoint takes no body — actor is the session user.

### Error mapping

| Condition | HTTP |
|---|---|
| Unknown delay_type or fault_attribution | 422 |
| Both port_call_id and leg_ref set | 422 |
| Edit on approved record | 409 |
| Not found | 404 |
| Unauthenticated | 401 |

## 3. D-entries

| ID | Decision | Default | Rationale |
|---|---|---|---|
| D-ENTRY-1 | `leg_ref` type | nullable String | No `Leg` entity in V1; opaque reference only. |
| D-ENTRY-2 | `actual_duration` precision | hours, 2 decimal places | Sufficient for operational use. |
| D-ENTRY-3 | Multiple delays per voyage/port call | allowed | Real operations have overlapping delays. |
| D-ENTRY-4 | Role gate on approval | none in V1 | Operator discipline; tighten in V2 if needed. |

## 4. Rejected alternatives

| Rejected | Why |
|---|---|
| Laytime / demurrage calculation | Out of V1 scope (V1_ROADMAP §9). |
| Un-approve / reverse approval | Approval is an attestation; irreversible in V1. |
| Leg entity | Not in V1 scope; `leg_ref` string is the seam. |
| Stored `actual_duration` | Derived from start/end; storing it creates a sync problem. |

## 5. Definition of done

All `project_description.md §Success criteria`, plus openapi regenerated,
coverage ≥ 95%, CI green incl. Postgres 18 migration,
`docs/delay_tracking/runbook.md` written.
