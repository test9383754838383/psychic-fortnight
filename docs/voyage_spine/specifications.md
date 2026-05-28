# Block 3 — Voyage Spine · Specifications

ADR-linked. Stack-level decisions in `docs/architecture/locked_summary.md`. Tactical implementation decisions in `docs/voyage_spine/locked_decisions.md` (D-LOCK-1 through D-LOCK-4). This file owns the **block-specific** surface: API contract, D-entries, rejected alternatives, risks.

## 0. Context and Constraints

Block 3 is the operational backbone of V1 and the first frontend project. Backend API + frontend scaffold. No feature UI in this block.

**Non-negotiables (inherit from Block 2; unchanged):** TDD, real-DB tests [ADR-0011], mypy `--strict`, Tach boundaries [ADR-0010], 12-Factor, local-first, simplicity-first.

## 1. Stack (as used by this block)

**Backend** (unchanged from Block 2):
- Python 3.12 + FastAPI + `advanced-alchemy[fastapi]` + Pydantic v2. [ADR-0002]
- SQLAlchemy 2.0 + Alembic batch mode. [ADR-0003]
- `sqlalchemy.ext.orderinglist` for ItineraryLine. (D-LOCK-1)
- SQLite (dev/CI) / Postgres 18 (prod). [ADR-0004]
- Session auth stub. [ADR-0007]
- Tach. [ADR-0010]
- pytest + real-DB harness from Block 2. [ADR-0011]

**Frontend** (new in this block):
- React + Vite 8.x + TypeScript 6.x strict. [ADR-0005] + OPEN_DECISIONS §15
- TanStack Router (lockfile + `npm audit` CI gate per OPEN_DECISIONS §15).
- TanStack Query (server state).
- openapi-typescript + openapi-fetch (typed API client from OpenAPI).
- Vitest + React Testing Library + Playwright.
- ESLint + typescript-eslint + Prettier + eslint-plugin-boundaries.
- pnpm as package manager.

### Project layout additions

```
src/modules/voyage_spine/        ← backend module, mirrors master_data
tests/modules/voyage_spine/      ← backend tests
frontend/                        ← NEW: React project root
├── src/{api, auth, routes, lib}/
├── package.json, pnpm-lock.yaml
├── vite.config.ts, tsconfig.json
└── .eslintrc.cjs, .prettierrc
openapi/openapi.json             ← regenerated (now includes voyage endpoints)
```

### API surface (Block 3 additions)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/voyages` | Create voyage |
| `GET` | `/api/v1/voyages` | List (filter by vessel_ref, status, charterer_ref, date range) |
| `GET` | `/api/v1/voyages/{id}` | Get one |
| `PATCH` | `/api/v1/voyages/{id}` | Update non-status fields (incl. nested `terms`) |
| `POST` | `/api/v1/voyages/{id}/transition` | Transition status |
| `POST` | `/api/v1/voyages/{id}/itinerary` | Insert itinerary line at given `sequence_no` |
| `GET` | `/api/v1/voyages/{id}/itinerary` | List ordered itinerary |
| `PATCH` | `/api/v1/voyages/{id}/itinerary/{line_id}` | Update line (incl. reorder via sequence_no change) |
| `DELETE` | `/api/v1/voyages/{id}/itinerary/{line_id}` | Delete line |

Pagination D-3 / D-4 (defaults 50, max 500) inherited from Block 2 D-entries.

### Schema rationale (deltas vs Block 2)

- UUIDv4 PKs, app-side. UTC timestamps via `TimestampMixin`. Enums via String + CheckConstraint. Same as Block 2.
- `terms_*` flat columns on `voyages` table (D-LOCK-2). DTO nests them.
- `UNIQUE (voyage_id, sequence_no)` on `itinerary_lines` enforces sequence integrity at the DB level as a backstop to the in-memory `ordering_list` discipline.
- `CheckConstraint` `planned_etd >= planned_eta` on `itinerary_lines`.
- Self-FK on `voyages.previous_voyage_ref` (nullable).

## 2. D-entries (tunable values)

Inherit D-1 through D-9 from Block 2 specifications.md §2 unchanged. New for Block 3:

| Key | Default | Where | Why |
|---|---|---|---|
| `D-10` Max itinerary lines per voyage | 50 | `services/voyage_service.py` | Soft cap to prevent runaway operator entries; can be raised by config. |
| `D-11` Voyage `status` enum members | `Scheduled / Commenced / Completed / Closed / Cancelled` | `services/voyage_service.py` + DB CheckConstraint | Matches V1_ROADMAP Block 3 spec. |
| `D-12` `port_function` enum members | `Load / Discharge / Bunker / Canal / Transit / Repairs / Other` | `services/voyage_service.py` + DB CheckConstraint | Matches V1_ROADMAP. |
| `D-13` `cp_type` enum members | `CVC / TC / VC` | DB CheckConstraint | Matches V1_ROADMAP. |
| `D-14` Frontend dev port | 5173 | `vite.config.ts` | Vite default; documented for parity with backend 8000. |
| `D-15` Frontend test runtime ceiling | 30s | Vitest config + CI assert | Mirrors backend D-1. |

## 3. Authentication and Authorization

Block 3 uses Block 2's stub. CI grep gate from Block 2 still in force.

Frontend `auth/` shell exposes `useCurrentUser()` and `<RequireAuth>` route wrapper but reads a placeholder session for now. Block 3.5 plugs real session endpoints behind the same interface — no consumer-side changes.

## 4. Testing Strategy

**Backend (same as Block 2):** pytest, real-DB SQLite + ephemeral Postgres CI gate, FactoryBoy for fixtures, no mocked persistence.

New test coverage required:

- Voyage CRUD happy path + invariants (duplicate `voyage_no`, missing vessel_ref, missing charterer_ref, illegal status transitions, manual override of completing datetime).
- ItineraryLine ordering: insert at start / middle / end, delete from any position, reorder by changing `sequence_no`, sequence-no uniqueness, cascade delete from voyage.
- `expected_completing_datetime` recompute on every itinerary mutation; recompute suppressed when manual override set.
- Cross-module: voyage rejection when vessel_ref / port_ref points to a non-existent or `Inactive` master-data row.
- OpenAPI conformance: every endpoint shape regenerates `openapi/openapi.json` identically.

**Frontend (new):**
- Vitest for unit + component tests.
- React Testing Library for component behavior.
- Playwright for one happy-path smoke (boots app, hits placeholder root, asserts auth context initialized, asserts API client calls return typed responses).
- `tsc --noEmit` in CI as the contract gate: any backend OpenAPI change breaks frontend type check.

**Forbidden (unchanged from Block 2):** mocked persistence; fake repositories; tests that skip the database.

## 5. Deployment and Infra

Block 3 doesn't ship to production on its own. Deltas to `docker-compose.yml`:

- App container produces both API and (at build time) the static frontend bundle.
- Vite dev server is dev-only; production serves the built bundle from `/` via FastAPI static files (or Caddy from [ADR-0015] when the deployment block lands).
- No new services. Redis is not added (per [ADR-0013] APScheduler is in-process; no broker needed).

## 6. Rejected Alternatives (block-specific)

| Item | Rejected | Reason |
|---|---|---|
| `VoyageOperatingTerms` storage | SQLAlchemy `Composite` mapping | Adds a concept Block 2 didn't use, for one field group on one model. D-LOCK-2 keeps flat columns. |
| `VoyageOperatingTerms` storage | Separate `voyage_operating_terms` table with 1:1 FK | Forces JOIN on every voyage read. V1_ROADMAP explicitly: reference fields on Voyage, not a separate entity. |
| `expected_completing_datetime` mechanism | SQLAlchemy event hooks / `MutableComposite` tracking | Hides business logic in model-side magic; harder to test. D-LOCK-3 keeps recompute in the service layer. |
| Status state machine | `transitions` / `python-statemachine` library | Adds dependency for ~10 lines of code. D-LOCK-4 keeps explicit dict in the service. |
| ItineraryLine ordering | Hand-rolled service-layer renumbering on every mutation | Race-condition surface, ~50 lines of code, no test maturity. D-LOCK-1 uses `orderinglist`. |
| Frontend Gantt baseline (forward-look) | Building a custom CSS/SVG Gantt | Bryntum locked per [ADR-0006] for Block 4; Block 3 frontend stays scaffold-only with no feature pages. |
| Frontend feature pages in Block 3 M2 | Shipping any feature UI | Explicit hard line in `project_description.md`. Block 4 owns the first feature. |
| TanStack Router despite May 2026 supply-chain incident | Switching to React Router 7 | Official postmortem all-clear May 15 2026; lockfile + npm audit CI gate mitigates residual risk. (OPEN_DECISIONS §15) |
| Bulk operations API (`POST /voyages/batch`) | Not in V1 | OPEN_DECISIONS §4 default: never unless reversed. |

## 7. Risks

| Risk | Confidence | Impact | Mitigation |
|---|---|---|---|
| `ordering_list` race conditions under concurrent itinerary mutations | Low (single-tenant, 5–20 operators, atomic flushes) | High (corrupted sequence) | Tests cover insert-mid / reorder / delete; DB-level `UNIQUE (voyage_id, sequence_no)` is the hard backstop; rely on session transaction isolation. |
| `expected_completing_datetime` drift after operator manual edits on itinerary lines | Medium | Medium | Recompute runs on every line CRUD; tests assert idempotence; manual-override flag is the explicit escape hatch. |
| Cross-module reference rot (vessel renamed in Block 2, charterer deactivated) | Medium | Low | Service validates ref existence on write; reads through master_data public surface use current state; no caching. |
| Frontend `tsc` lag in CI as codebase grows | Low (scaffold only) | Low | Vite + TS strict are fast on a small project; budget revisited at Block 5+ when features land. |
| TanStack Router future supply-chain incident | Low (recurrence) | Medium | Lockfile + `npm audit` CI gate; revisit if a second incident occurs. |
| Postgres 18 + SQLite dialect drift on new features in this block | Medium | High | CI migration smoke against ephemeral Postgres 18 container; Testcontainers per OPEN_DECISIONS §14. |

## 8. Open Decisions Impacting This Block

| OPEN_DECISIONS item | Block 3 impact |
|---|---|
| §2 Multi-tenancy | None; single-tenant assumption holds. |
| §6 Port distance / routing engine | Block 3 stores no distance data; `expected_completing_datetime` is from itinerary ETDs, not computed distance. |
| §7 CounterpartyRole→Port hard FK | Block 3 doesn't touch this; soft list per Block 2 stays. |
| §11 Logging library | Resolved (structlog locked); applied to backend module from day one in this block. |
| §13 argon2-cffi + first-party sessions | Forward-look to Block 3.5; frontend auth shell built against the interface, not the implementation. |
| §15 Frontend toolchain | Fully consumed by Block 3 M2. |
| §16 Tach Beta classifier | Acknowledged; revisit only if a real instability surfaces. |
