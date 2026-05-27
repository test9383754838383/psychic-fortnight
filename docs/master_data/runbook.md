# Block 2 — Master Data · Runbook

**Status:** STUB. Written *after* M2 is green and before Block 2 is declared done. Per [ADR-0012], a block without a complete runbook is not "done."

When M2 lands, replace this stub with concrete content covering:

## 1. How to run locally

- One-command boot (`make dev`), DB file path, default port.
- How to seed minimum test data via the API.
- How to inspect the OpenAPI schema (`/docs`, `/openapi.json`).

## 2. How to run the tests

- `make test` for the full suite.
- `make test -- tests/modules/master_data/test_vessel_api.py::test_create` for a single test.
- How to enable verbose / `-s` mode.

## 3. How to add a new migration

- `make migration name="add_thing"` → review the generated revision → `make migrate`.
- Reminder: SQLite uses batch mode automatically; nothing extra needed for ALTER TABLE.
- Reminder: CI replays the full history against Postgres — if it fails there, fix the migration, never the CI.

## 4. Common failure modes

- Duplicate `code` or `unlocode` → 409. Service raises `Duplicate*Error`. Check the existing row before reporting a bug.
- `InvalidUnlocodeError: prefix not in country table` → the UN/LOCODE country dict is out of date. See D-7 (annual review).
- `get_current_user_stub` reference outside `tests/` or `src/dependencies.py` → CI grep job fails. Real auth block hasn't shipped yet; fix the offending file.
- Migration smoke test fails on Postgres → dialect drift. Check for raw SQL or Postgres-only features in the latest revision.

## 5. Operational notes

- All endpoints currently accept the stub user. Do not deploy to production until the real auth block ships.
- No production data has been written from Block 2.
- Soft-delete is the only delete. There is no admin "purge" endpoint; if one is needed, write an ADR first.

## 6. Useful URLs

- Local OpenAPI docs: `http://localhost:8000/docs`
- Local OpenAPI JSON: `http://localhost:8000/openapi.json`
- Committed OpenAPI: `openapi/openapi.json`

## 7. Where to look next

- API surface and DTOs: `docs/master_data/specifications.md`
- Data model and invariants: `docs/master_data/architecture.md`
- Tunable values: `docs/master_data/specifications.md` §2 (D-entries)
