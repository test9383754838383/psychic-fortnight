# Block 3 — Voyage Spine

The operational backbone of V1. The first block that orchestrates Master Data into a real business workflow, and the block where the frontend project is born.

## What Is The Project?

Block 3 delivers two outcomes:

1. **The Voyage Spine API.** `Voyage`, `VoyageOperatingTerms` (embedded reference value, not a separate entity), and `ItineraryLine` (ordered, under a voyage). Together they describe what a vessel is doing, for whom, between which ports, and on what timeline.
2. **The frontend project scaffold.** React + Vite + TypeScript strict per [ADR-0005]. Router, global error handling, OpenAPI-generated API client, auth context shell (wired to Block 2's `get_current_user_stub` until Block 3.5 replaces it). No feature screens. The shell every later block plugs into.

The block ships:

- Typed domain models persisted via SQLAlchemy 2.0 against SQLite (dev/CI) and Postgres (prod), reusing the patterns proven in Block 2. [ADR-0003], [ADR-0004]
- Alembic migrations creating `voyages` and `itinerary_lines`, both governed by SQLite batch mode and replayed against ephemeral Postgres in CI. [ADR-0003]
- FastAPI CRUD endpoints under `/api/v1/voyages` and the nested `/api/v1/voyages/{id}/itinerary` collection. [ADR-0002]
- Real-DB integration tests for every endpoint and every domain invariant. No mocks. [ADR-0011]
- A second module under `src/modules/voyage_spine/`, Tach-bounded against Master Data — Voyage Spine may consume the `master_data` public surface only, never reach into its repositories or models. [ADR-0001], [ADR-0010]
- A new `frontend/` workspace at the repo root: Vite, TypeScript strict, React, router (TanStack Router or React Router — D-entry), OpenAPI codegen pipeline, auth context, and global error boundary. No feature pages. [ADR-0005]

**User entry points:**

- HTTP: `/api/v1/voyages`, `/api/v1/voyages/{id}/itinerary`. Authenticated via the Block 2 stub.
- Browser: `npm run dev` boots Vite on `localhost:5173` and serves a placeholder root route. The auth context is initialized, the API client is wired, and the OpenAPI types compile clean — but no feature UI is built yet.

**Validation gate:** Pydantic v2 DTOs enforce request shape; the service layer enforces domain invariants (voyage status transitions, itinerary sequence integrity, port reference validity, charterer reference validity when set). All invariants covered by real-DB tests.

**Output behaviour:** JSON responses, OpenAPI schema regenerated and re-committed to `openapi/openapi.json`, frontend TypeScript types regenerated from that schema.

## Why?

Voyage is the entity around which the entire operations workflow revolves. Every block downstream — Vessel Schedule, Port Call, Forms, Bunker Request, Delays, Tasks, Alerts — reads or writes a `Voyage` or one of its `ItineraryLine` rows. Failure costs being addressed:

- **Late-breaking schema regret.** A wrong itinerary model (ItineraryLine as a flat list vs ordered children with sequence integrity) costs every later block. Block 5 (Port Call) cannot be built until itinerary ordering is correct.
- **Status machine drift.** Voyage status (`Scheduled / Commenced / Completed / Closed / Cancelled`) is the single most-queried field downstream. Getting transitions wrong here pollutes the Gantt, the alerts, and every report.
- **Frontend retrofit tax.** If the React project is born inside Block 4 alongside the Bryntum integration, two unrelated concerns share one milestone and both suffer. Scaffolding it here — with no UI deadline pressure — yields a clean shell ready for feature work.
- **Tach pattern proof.** Block 2 declared one module. Block 3 is the first time two modules coexist. The boundary contract is real now; getting it right keeps the monolith modular.

## What This Project Is Not

- **Not a chartering or CP-management module.** `VoyageOperatingTerms` carries enough reference data (charterer name, CP type, CP date, document ref) to ground operations decisions. No CP logic, no laytime, no commercial computation. [V1_ROADMAP Block 3]
- **Not a Vessel Schedule block.** Voyages exist in this block; rendering them on a Gantt is Block 4.
- **Not a Port Call block.** Execution fields (ATA / ATB / ATD / NOR / Free Pratique) live on `PortCall` in Block 5, never on `ItineraryLine`.
- **Not an auth block.** Block 3 ships against the `get_current_user_stub` from Block 2. Block 3.5 replaces it.
- **Not a feature-UI block.** The frontend scaffold ships zero feature pages. A placeholder root route proves the shell works.
- **Not a routing or distance engine.** Itinerary lines reference ports; computing distances between them is out of scope (OPEN_DECISIONS §6).

## Success Criteria

1. Voyage and ItineraryLine CRUD complete via REST. Create / read / update / soft-close (status transitions) for voyages; ordered insert / reorder / delete for itinerary lines under a voyage.
2. 100% of production code paths covered by real-DB integration tests. The full Block 3 backend suite finishes under 30s against in-memory SQLite. [ADR-0011]
3. Alembic migrations run cleanly on both SQLite and Postgres. CI replays the full history against an ephemeral Postgres container on every PR. [ADR-0004]
4. Tach reports zero boundary violations. `voyage_spine` imports only from `master_data`'s public surface. [ADR-0010]
5. OpenAPI schema regenerated and committed at `openapi/openapi.json`. Frontend TypeScript types regenerated from it and committed.
6. All domain invariants enforced and tested: voyage status transitions, itinerary sequence uniqueness within a voyage, port-ref existence, charterer-ref existence-and-role-validity when set, vessel-ref existence.
7. Frontend scaffold boots cleanly. `npm run dev` serves a placeholder root route; `npm run build` produces a clean production bundle; `npm run typecheck` passes under TS strict; `npm run lint` passes; the auth context is initialized and the API client is wired.
8. `docs/voyage_spine/runbook.md` written and committed before declaring the block done. [ADR-0012]

## Core Constraints

- TDD, RED → GREEN → REFACTOR. No production code without a failing test first. (CLAUDE.md)
- Real-DB tests only on the backend. No mocked persistence. [ADR-0011]
- Strict typing: Python 3.12 + mypy `--strict` on backend; TypeScript `strict: true` plus `noUncheckedIndexedAccess` on frontend.
- Module boundary: backend code under `src/modules/voyage_spine/`; Tach enforces. [ADR-0010]
- Local-first: one command boots backend; one command boots frontend; zero external dependencies for dev.
- 12-Factor: all config via env vars; logs to stdout; stateless processes.
- Simplicity-first, delete-first. No future-proofing. The frontend scaffold ships nothing it does not immediately need.
- No LLM, no background jobs in Block 3.
