# Block 3 — Voyage Spine · Architecture

References: [ADR-0001] modular monolith · [ADR-0002] FastAPI · [ADR-0003] SQLAlchemy · [ADR-0004] dual-DB · [ADR-0005] React+Vite+TS · [ADR-0007] session auth stub · [ADR-0010] Tach · [ADR-0011] real-DB tests. Implementation decisions already locked in `docs/voyage_spine/locked_decisions.md` (D-LOCK-1 through D-LOCK-4) are referenced inline.

## 1. System Overview

Block 3 adds the second backend module and the first frontend project to the modular monolith.

```
┌──────────────────────────────────────────────────────────┐
│  FastAPI process (uvicorn)                               │
│  ├── module: master_data       ← Block 2                 │
│  ├── module: voyage_spine      ← THIS BLOCK              │
│  ├── module: (future) port_call                          │
│  └── ...                                                 │
└────────────────────┬─────────────────────────────────────┘
                     │ SQLAlchemy 2.0 (async)
                     ▼
              ┌──────────────┐
              │  SQLite file │  (dev/CI)
              │  → Postgres  │  (prod)
              └──────────────┘

┌──────────────────────────────────────────────────────────┐
│  Frontend (Vite dev server / static build)               │  ← M2 birth
│  React + TypeScript strict; placeholder root route only  │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTP/JSON (typed via OpenAPI codegen)
                     ▼
              FastAPI /api/v1/*
```

No outbound calls, no inbound webhooks, no queue. HTTP only.

`voyage_spine` may import from `master_data`'s public surface (`src/modules/master_data/__init__.py`) only — never `master_data.repositories.*` or `master_data.models.*`. Tach enforces.

## 2. Application Layers

Same hexagonal-lite layering as Block 2:

```
src/modules/voyage_spine/
├── api/
│   └── voyages.py            ← /api/v1/voyages and nested /itinerary
├── services/
│   └── voyage_service.py     ← invariants, state machine, recompute
├── repositories/
│   ├── voyage_repository.py
│   └── itinerary_line_repository.py
├── models/
│   ├── voyage.py             ← Voyage + flat terms_* columns
│   └── itinerary_line.py     ← ordered child via orderinglist
├── exceptions.py
└── __init__.py               ← public surface
```

Layer responsibilities identical to Block 2. The service layer owns: invariants, state-machine transitions, sequence-number coherence (via `orderinglist`), and recompute of `expected_completing_datetime`.

```
frontend/
├── src/
│   ├── api/                  ← generated OpenAPI types + openapi-fetch client
│   ├── auth/                 ← auth context shell (stub-wired in Block 3, real in Block 3.5)
│   ├── routes/               ← TanStack Router route tree; placeholder root only
│   ├── lib/                  ← query client setup, error boundary
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json             ← strict + noUncheckedIndexedAccess
├── package.json
└── .eslintrc.cjs             ← ESLint + typescript-eslint + Prettier + boundaries
```

Backend module boundary: Tach. Frontend module boundary: `eslint-plugin-boundaries`. Both enforced in CI.

## 3. Core Flows

### 3.1 Voyage create (happy path)

```
1. POST /api/v1/voyages — Pydantic VoyageCreateDTO validates shape, types, enum membership
2. Router calls VoyageService.create(dto, session)
3. Service:
   a. Verifies vessel_ref exists (calls into master_data public surface)
   b. If charterer_ref set: verifies counterparty exists and has a role permitting it
   c. Verifies previous_voyage_ref existence if set
   d. Constructs Voyage model with status = "Scheduled", terms_* flat columns from dto.terms
   e. VoyageRepository.add(model); commit
4. Router serializes to VoyageResponseDTO with nested terms block
5. 201 Created
```

### 3.2 Itinerary line insert (ordered child mutation)

```
1. POST /api/v1/voyages/{id}/itinerary — accepts sequence_no (insert position) and line fields
2. Service loads Voyage with itinerary_lines collection (ordering_list-managed)
3. Service verifies: port_ref exists; port_function valid; planned_etd ≥ planned_eta
4. Service inserts at the requested position: voyage.itinerary_lines.insert(idx, new_line)
   — orderinglist auto-renumbers all subsequent sequence_no values in memory
5. Service recomputes voyage.expected_completing_datetime (unless manual override set)
   — D-LOCK-3: recompute = max(planned_etd) across itinerary_lines
6. Single session flush; atomic.
7. 201 Created with the inserted line.
```

Reorder, update, delete follow the same pattern: mutate the collection, recompute, flush.

### 3.3 Status transition

```
1. POST /api/v1/voyages/{id}/transition — body: { to: "<new status>" }
2. Service consults transition matrix (D-LOCK-4):
   Scheduled  → {Commenced, Cancelled}
   Commenced  → {Completed, Cancelled}
   Completed  → {Closed}
   Closed     → ∅
   Cancelled  → ∅
3. Illegal transition → IllegalVoyageStatusTransitionError → HTTP 409
4. Legal transition → mutate status, set commenced_at / completed_at / closed_at / cancelled_at timestamp as applicable
5. 200 OK
```

### 3.4 Validation failure path (any endpoint)

```
1. Pydantic rejects malformed payload → 422 with field-level errors, OR
2. Service raises typed domain exception (e.g. DuplicateVoyageNumberError, InvalidPortFunctionError,
   IllegalVoyageStatusTransitionError, MissingMasterDataReferenceError)
3. FastAPI exception handler maps → 4xx with stable error code + message
4. Transaction rolled back; no partial writes
```

No retries, no fallbacks.

## 4. Data Model

### 4.1 Voyage

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | UUIDv4 app-side |
| `voyage_no` | `str` UNIQUE | operator identifier |
| `vessel_ref` | UUID, FK → `vessels.id` | required |
| `charterer_ref` | UUID, FK → `counterparties.id`, nullable | role validation in service |
| `terms_charterer_name` | `str`, nullable | D-LOCK-2: flat persistence |
| `terms_cp_type` | `str` enum (`CVC / TC / VC`), nullable | String + CheckConstraint |
| `terms_cp_date` | date, nullable | |
| `terms_cp_document_ref` | `str`, nullable | |
| `status` | `str` enum, default `Scheduled` | String + CheckConstraint |
| `commencing_datetime` | datetime UTC | required |
| `expected_completing_datetime` | datetime UTC, nullable | D-LOCK-3 auto-recompute |
| `expected_completing_manual_override` | bool, default `False` | suppresses recompute when True |
| `previous_voyage_ref` | UUID, FK → `voyages.id`, nullable | self-FK |
| `voyage_instructions` | text, nullable | text or file ref string |
| `ops_notes` | text, nullable | |
| `commenced_at` | datetime UTC, nullable | set on transition to Commenced |
| `completed_at` | datetime UTC, nullable | set on transition to Completed |
| `closed_at` | datetime UTC, nullable | set on transition to Closed |
| `cancelled_at` | datetime UTC, nullable | set on transition to Cancelled |
| `created_at` / `updated_at` | datetime UTC | `TimestampMixin` |

DTO surfaces `terms_*` as nested `terms: { charterer_name, cp_type, cp_date, cp_document_ref }`. Service flattens on write, nests on read.

### 4.2 ItineraryLine

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `voyage_id` | UUID, FK → `voyages.id`, `ondelete='CASCADE'` | |
| `sequence_no` | int | D-LOCK-1: managed by `orderinglist` |
| `port_ref` | UUID, FK → `ports.id` | required |
| `port_function` | `str` enum | `Load / Discharge / Bunker / Canal / Transit / Repairs / Other` |
| `planned_eta` | datetime UTC | required |
| `planned_etd` | datetime UTC | required; CheckConstraint `>= planned_eta` |
| `created_at` / `updated_at` | datetime UTC | |
| UNIQUE (`voyage_id`, `sequence_no`) | | sequence integrity invariant at DB level |

ORM relationship on `Voyage`:

```python
itinerary_lines: Mapped[list["ItineraryLine"]] = relationship(
    "ItineraryLine",
    order_by="ItineraryLine.sequence_no",
    collection_class=ordering_list("sequence_no"),
    cascade="all, delete-orphan",
)
```

### 4.3 Relationship diagram

```
Vessel (Block 2) ──< Voyage ──< ItineraryLine ──> Port (Block 2)
                       │
                       └─> Counterparty (Block 2, optional charterer)
                       │
                       └─> Voyage (self-FK, optional previous_voyage_ref)
```

## 5. Auth and Authorization

Block 3 uses the `get_current_user_stub` from Block 2 ([ADR-0007]). All `/api/v1/voyages/*` endpoints depend on `get_current_user`. No role enforcement yet. Block 3.5 swaps in the real implementation across all blocks atomically.

Frontend auth context (M2) reads a session cookie if present and exposes `currentUser` to route guards. The shell is wired to the stub for Block 3; Block 3.5 replaces only the network calls behind it.

## 6. Streaming / Async

Not applicable. All endpoints request/response JSON. No WebSockets, no SSE, no background jobs in Block 3.

## 7. Patterns Established for Later Blocks

1. **Backend module ⊕ Tach contract.** `voyage_spine` is the first non-Block-2 module. Its `tach.toml` entry is the template every later module copies.
2. **Cross-module reference via public surface only.** `voyage_spine` reads vessel / port / counterparty existence via `master_data.__init__`'s exported types. Repositories and models stay private.
3. **Ordered nested REST collection.** `/voyages/{id}/itinerary` is the reference pattern for any later block needing ordered children under a parent (none currently planned, but the pattern is on the shelf).
4. **Embedded value object (flat persistence + nested DTO).** Pattern reused anywhere a value-object cluster lives on a parent without warranting its own table.
5. **Service-layer state machine.** Pattern reused by `PortCall.status`, `Form.status`, `Alert` lifecycle in later blocks.
6. **Service-layer derived field with manual override.** Pattern reused anywhere a value is computed from children but may need operator override.
7. **Frontend project scaffold.** Every later UI block plugs into the shell born here — no later block re-scaffolds.
