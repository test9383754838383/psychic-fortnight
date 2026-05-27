# Block 2 — Master Data · Specifications

ADR-linked. Stack-level decisions are not re-litigated here — see `docs/architecture/locked_summary.md` and the cited ADRs. This file owns the **block-specific** surface: API contract, D-entries, rejected alternatives, risks.

## 0. Context and Constraints

Block 2 is the foundational data layer of the V1 modular monolith. API + DB only. No UI, no LLM, no background jobs.

**Non-negotiables (from `CLAUDE.md` + ADRs):**

- TDD, RED → GREEN → REFACTOR. No production code without a failing test.
- Real-DB integration tests only. [ADR-0011]
- Strict typing: `mypy --strict`. No `any`. No unjustified type ignores.
- Modular monolith. Tach-enforced boundaries from day one. [ADR-0001], [ADR-0010]
- 12-Factor App. All config via env vars. Stateless processes. Logs to stdout.
- Local-first. One command boots the stack. Zero external dependencies for dev. [ADR-0004]
- Simplicity-first, delete-first. No future-proofing.

## 1. Stack (as used by this block)

Stack-wide choices are locked in ADRs. This block uses:

- Python 3.12 + FastAPI + `advanced-alchemy[fastapi]` + Pydantic v2. [ADR-0002]
- SQLAlchemy 2.0 + Alembic with batch mode. [ADR-0003]
- SQLite (dev/CI) / Postgres 16 (prod). [ADR-0004]
- Session auth stub for now. [ADR-0007]
- Tach for boundary enforcement. [ADR-0010]
- Real-DB tests via pytest + pytest-asyncio + FactoryBoy. [ADR-0011]

**Not used in Block 2:** React (no UI), Bryntum (no UI), Huey/Redis (no jobs), Instructor/Pydantic-LLM (no LLM), Ollama (no LLM), GreenMail (no email).

### Project layout (root)

```
src/
├── app.py                    ← FastAPI factory, router registration
├── config.py                 ← Env-loaded settings (pydantic-settings)
├── dependencies.py           ← Shared DI (DB session, current_user stub)
├── exceptions.py             ← Domain → HTTP mapping
└── modules/
    └── master_data/          ← THIS BLOCK
        ├── api/
        ├── services/
        ├── repositories/
        ├── models/
        ├── reference/
        ├── exceptions.py
        └── __init__.py
tests/
└── modules/
    └── master_data/
alembic/
├── env.py
└── versions/
openapi/
└── openapi.json
tach.toml
pyproject.toml
docker-compose.yml
Makefile
```

### API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/vessels` | Create vessel |
| `GET` | `/api/v1/vessels` | List (filter by status, vessel_type, flag) |
| `GET` | `/api/v1/vessels/{id}` | Get one |
| `PATCH` | `/api/v1/vessels/{id}` | Update |
| `POST` | `/api/v1/vessels/{id}/deactivate` | Soft-delete |
| `POST` | `/api/v1/ports` | Create port |
| `GET` | `/api/v1/ports` | List (filter by status, country) |
| `GET` | `/api/v1/ports/{id}` | Get one |
| `PATCH` | `/api/v1/ports/{id}` | Update |
| `POST` | `/api/v1/ports/{id}/deactivate` | Soft-delete |
| `POST` | `/api/v1/counterparties` | Create counterparty |
| `GET` | `/api/v1/counterparties` | List (filter by role, status) |
| `GET` | `/api/v1/counterparties/{id}` | Get one |
| `PATCH` | `/api/v1/counterparties/{id}` | Update |
| `POST` | `/api/v1/counterparties/{id}/roles` | Attach role |
| `DELETE` | `/api/v1/counterparties/{id}/roles/{role}` | Detach role |
| `POST` | `/api/v1/counterparties/{id}/deactivate` | Soft-delete |

### Schema rationale

- UUIDv4 PKs, generated app-side. Portable across SQLite and Postgres without driver-specific extensions.
- All timestamps stored UTC, `DateTime(timezone=True)`.
- Enums as `String` + `CheckConstraint`. Portable; no Postgres-only `CREATE TYPE`.
- `created_at` / `updated_at` audit columns via a `TimestampMixin`.
- JSON columns use SQLAlchemy `JSON` type. Read whole / written whole. Never queried inside in Block 2.
- Country derived from UNLOCODE prefix at write time using a vendored static dict at `src/modules/master_data/reference/unlocode_country.py` (~250 ISO-3166 alpha-2 keys). Out-of-prefix codes raise `InvalidUnlocodeError`.

## 2. D-entries (tunable values)

Values that can change without an architectural conversation. Keep them in code/config; don't litter them across docs.

| Key | Default | Where it lives | Why |
|---|---|---|---|
| `D-1` Full-suite test runtime ceiling | 30s | CI assert | Detects creeping slow tests early. |
| `D-2` Coverage floor for `src/modules/master_data/` | 95% line | CI gate | Foundation block; lower would mean untested invariants. |
| `D-3` Pagination default page size | 50 | `api/` query params | Reasonable for vessel/port lists; tune after operator feedback. |
| `D-4` Pagination max page size | 500 | `api/` query params | Hard cap; prevents accidental full-table dumps. |
| `D-5` IMO format | 7 digits, optional checksum validation | `services/vessel_service.py` | Standard IMO number length. Checksum can be turned on as a follow-up. |
| `D-6` UNLOCODE format | 5 chars, `[A-Z]{2}[A-Z0-9]{3}` | `services/port_service.py` | Per UN/LOCODE spec. |
| `D-7` UN/LOCODE country prefix dict review cadence | annual | docstring on `unlocode_country.py` | UN updates the list periodically. |
| `D-8` Soft-delete pattern | status flip to `Inactive` | every service `deactivate()` | No hard delete; preserves referential history. |
| `D-9` Session secret rotation policy | manual env var update | `config.py` | Real auth block can lock a rotation strategy later. |

## 3. Authentication and Authorization

Block 2 implementation: stub only ([ADR-0007]). `get_current_user_stub()` returns a fixed test user identity. All endpoints require the stub; none enforce roles.

CI grep job fails if `get_current_user_stub` appears anywhere outside `tests/` or `src/dependencies.py`. This guard survives the swap to real auth.

## 4. Testing Strategy

Per [ADR-0011]:

| Concern | Choice |
|---|---|
| Test runner | pytest + pytest-asyncio |
| Real-DB fixture | In-memory SQLite (`sqlite+aiosqlite:///:memory:`), schema built via Alembic, transactional rollback per test |
| Fixture data | FactoryBoy `SQLAlchemyModelFactory` |
| HTTP client | FastAPI `TestClient` (sync) or `httpx.AsyncClient` (async) |
| Parallelism | `pytest-xdist` in CI |
| Migration smoke | CI job replays full Alembic history against an ephemeral Postgres 16 container on every PR |

**Test layers:**

1. **Service-layer tests** — `VesselService.create` etc. directly against a real SQLite session. Cover invariants, domain exceptions, transaction rollback.
2. **API integration tests** — endpoints end-to-end via TestClient. Cover status codes, response shape, validation errors, OpenAPI conformance.
3. **Migration smoke test** — Alembic `upgrade head → downgrade base → upgrade head` on both SQLite and Postgres.

**Forbidden:**

- `unittest.mock.patch` on any persistence-layer code.
- Fake repositories or in-memory dict stand-ins for SQLAlchemy.
- Tests that skip the database.

## 5. Deployment and Infra

Block 2 doesn't ship to production on its own. Its presence in `docker-compose.yml`:

```
services:
  app:        ← FastAPI (uvicorn)
  postgres:   ← Postgres 16 (prod) / unused in dev
```

No Redis, no Huey worker, no mail server. Those arrive with later blocks.

## 6. Rejected Alternatives (block-specific)

Stack-wide rejections are in the ADRs. Block-specific rejections:

| Item | Rejected | Reason |
|---|---|---|
| ID type | Auto-increment int | Drifts between SQLite and Postgres; not portable across environments. |
| Enum storage | Postgres native `CREATE TYPE` | Not portable to SQLite. [ADR-0004] |
| Test DB | Testcontainers + Postgres for every test | Orders of magnitude slower than in-memory SQLite. Postgres reserved for migration smoke. |
| `CounterpartyRole.ports_serviced` | Hard FK to `Port` | Deferred — soft list is simpler now. Tracked OPEN_DECISIONS §7. |
| Soft-delete | Hard delete | Loses referential history; downstream blocks can't rebuild context. |

## 7. Risks

| Risk | Confidence | Impact | Mitigation |
|---|---|---|---|
| **SQLite ↔ Postgres dialect drift in migrations.** A developer writes raw SQL or a Postgres-only feature that passes SQLite locally and breaks production. | High | High | CI replays full Alembic history against ephemeral Postgres container on every PR. Hard fail. [ADR-0011] |
| **JSON column behaviour diverges.** SQLite stores JSON as TEXT; Postgres uses JSONB. Filter/query operations may not be portable. | Medium | Medium | Block 2 never queries inside JSON. Read whole, write whole. [ADR-0004] |
| **Tach false positives slow developers.** Boundary rules block legitimate imports. | Medium | Low | Start permissive; tighten incrementally as patterns emerge. [ADR-0010] |
| **Auth stub leaks into production code paths.** | Medium | High | Stub lives in `src/dependencies.py`; CI grep forbids `get_current_user_stub` references elsewhere. |
| **UN/LOCODE country dict stale.** New UNLOCODE country prefix added by UN; lookups fail. | Medium | Medium | Annual review (D-7); out-of-prefix codes raise typed exception, not silent fallback. |

## 8. Open Decisions Impacting This Block

| OPEN_DECISIONS item | Block 2 impact |
|---|---|
| §2 Multi-tenancy | None in Block 2 (single-tenant assumption holds). Becomes blocking before any prod cutover. |
| §3 Real auth + RBAC | Block 2 ships stub; the auth block is the prerequisite for prod. |
| §7 CounterpartyRole→Port hard FK | Block 2 lives with soft list. Promote when a later block needs referential integrity. |
