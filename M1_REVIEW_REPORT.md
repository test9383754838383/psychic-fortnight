# M1 Voyage Core — Code Review Report

**Branch:** `feat/voyages-m1`  
**PR:** #26 (open, not merged — awaiting founder approval)  
**Date:** 2026-06-03  
**Reviewer target:** Principal AI coder — please audit and return an action plan.

---

## 1. What M1 Is

M1 = first vertical slice of the Voyages module elevation (prototype → production).  
Scope was locked against Veson IMOS screenshots and approved by the founder before build started.

Three end-user moments the slice delivers:
1. **"Show me my current voyages"** — `/voyages` list, defaults to active working set (Forecast/Scheduled/Commenced), three view tabs.
2. **"Set up / correct a voyage"** — Properties panel (ops coordinator, LOB, trade area, flags), New Voyage modal.
3. **"Advance it as reality changes"** — status state machine including new FORECAST status.

---

## 2. Commits on Branch (5 total)

```
55e3b64  feat(frontend): add view tabs — CURRENT VOYAGE LIST / ALL VOYAGES / TCO VOYAGES
2e1b2f5  test(e2e): M1 Voyages — Playwright spec
37394a4  feat(frontend): fix list columns + Voyage Manager page with icon rail
f9f4995  feat(frontend): list, Properties panel, New Voyage modal, nav enabled
5c8e8a8  feat(voyage_spine): M1 backend — Forecast status, ops coordinator, trade area, LOB, flags
```

---

## 3. Files Changed (18 files, +1840 / -5 lines)

### Backend
| File | Change |
|---|---|
| `src/modules/voyage_spine/models/voyage.py` | +`FORECAST` to `VoyageStatus` enum; +7 columns: `ops_coordinator_user_id` (String, indexed), `trade_area`, `lob`, `is_pool`, `is_ice_class`, `is_clean`, `is_coated` |
| `src/modules/voyage_spine/services/voyage_service.py` | Extended `VoyageCreateData`/`VoyageUpdateData` TypedDicts; `create()` accepts optional `status` (defaults SCHEDULED); `list()` gains `ops_coordinator_user_id` + `trade_area` filters; transition matrix gains `FORECAST → {SCHEDULED, CANCELLED}` |
| `src/modules/voyage_spine/api/voyages.py` | `VoyageCreateDTO`/`VoyageUpdateDTO`/`VoyageResponseDTO` carry M1 fields; `list_voyages` endpoint gets `ops_coordinator_user_id` + `trade_area` query params |
| `alembic/versions/5419853becf2_voyages_m1_core_fields.py` | Hand-written migration (autogenerate produced garbage due to SQLite/model GUID mismatch); drops old CheckConstraint, recreates with FORECAST; adds 7 columns with correct defaults |
| `openapi/openapi.json` | Regenerated |

### Frontend
| File | Change |
|---|---|
| `frontend/src/components/VoyagesList/VoyagesList.tsx` | Full rewrite — Veson-matching columns (Voyage No. link, Voyage Completing, Voyage Commencing, GMT+/-, Vessel Name), 3 view tabs, toolbar (search/+/export/refresh/+ADD VIEW), `onVoyageClick` prop, vessels fetch for name display |
| `frontend/src/routes/VoyageManagerPage.tsx` | New — `VoyageManagerContent` (exported, testable, takes `voyageId`+`onBack` props); `PropertiesPanel` with status transitions + flags + LOB + trade area + ops coordinator + save; right-side icon rail (48px); `StatusChip`, `FlagBadge` |
| `frontend/src/routes/voyages.$voyageId.tsx` | New — route definition at `/voyages/$voyageId`; thin wrapper calls `voyageManagerRoute.useParams()`, passes to `VoyageManagerContent` |
| `frontend/src/routes/VoyagesPage.tsx` | +`onVoyageClick` prop passed to `VoyagesList` (navigates to `/voyages/$voyageId`) |
| `frontend/src/routes/voyages.tsx` | Route + search schema (status, vessel_id, ops_coordinator, trade_area, search) |
| `frontend/src/routes/router.tsx` | +`voyageManagerRoute` wired into tree |
| `frontend/src/components/AppShell/AppShell.tsx` | Voyages nav enabled; `/voyages/:id` → "Voyage Manager" in topbar, `/voyages/:id/workspace` → "Voyage Workspace" |
| `frontend/src/api/schema.ts` | Regenerated from OpenAPI |

### Tests
| File | What it covers |
|---|---|
| `tests/modules/voyage_spine/test_voyage_m1_fields.py` | 6 service-level tests: FORECAST status value, create with all M1 fields, field defaults, update, FORECAST→SCHEDULED transition, list filter by ops_coordinator |
| `tests/modules/voyage_spine/test_voyage_m1_api.py` | 3 API round-trip tests: create with M1 fields, patch M1 fields, list filter |
| `frontend/src/__tests__/components/VoyagesPage.test.tsx` | 7 tests: heading, voyage numbers, vessel name + date, onVoyageClick callback, New Voyage modal, 3 tab rendering, ALL VOYAGES tab switch |
| `frontend/src/__tests__/components/VoyageManager.test.tsx` | 5 tests: voyage no in header, vessel name in header, Properties panel ops coordinator pre-fill, onBack callback, PATCH on save |
| `frontend/e2e/voyages.spec.ts` | 2 Playwright tests: list→Voyage Manager→Properties save; New Voyage creation appears in list |

---

## 4. Test Counts

| Suite | Count | State |
|---|---|---|
| Backend (pytest, full suite) | 477 passed, 1 skipped | ✅ green |
| Frontend unit (vitest) | 104 passed | ✅ green |
| TypeScript typecheck | — | ✅ clean (strict, noUncheckedIndexedAccess, noUnusedLocals) |
| E2E (Playwright) | 2 tests | written, not yet run against live stack |

---

## 5. Locked Scope Cuts (intentional, founder-approved)

The following appear in the Veson reference but were explicitly cut from M1:

| Cut item | Reason |
|---|---|
| Bulk-select + Close button | Deferred in locked spec |
| Bunker Calc Method, Voy Template, Daily Admin Fee, Revision No. | Chartering/finance depth — not M1 |
| Company name, Ref Company fields in Properties | Same |
| Team, Chtr Coord, Finance in Users section | Ops Coordinator only for M1 |
| GMT offset values (show "—") | No GMT offset data model yet |
| TCO VOYAGES tab filtering | No voyage-type discriminator field at M1; tab renders but shows same as ALL VOYAGES |
| Cargo / Opr Type columns | No Cargo data model at M1 |

---

## 6. Known Design Decisions to Review

1. **`ops_coordinator_user_id` is a plain String** — not a FK to the users table. Intentional for M1 simplicity (mirrors `vessel.ops_manager_user_id`). Will need elevation to a Users FK + picker in a later milestone.

2. **Trade area and LOB are plain String columns** — no lookup tables. Fixed dropdown values enforced frontend-only, not backend-validated. The backend will accept any string. Add a CheckConstraint or lookup table in a later milestone if discipline is needed.

3. **Alembic migration is hand-written** — autogenerate produced invalid output (detected spurious GUID type changes across all tables due to SQLite/model mismatch in the test DB). The hand-written migration is clean and tested. This pattern should be documented for future migrations.

4. **`VoyageManagerContent` vs `VoyageManagerPage` split** — the content component takes `voyageId: string` + `onBack: () => void` props to stay testable without TanStack Router context. The thin page wrapper in `voyages.$voyageId.tsx` calls `voyageManagerRoute.useParams()` and `useNavigate()`. This avoids the circular-import + test-crasher pattern that hit `VoyagesPage.tsx` earlier.

5. **PropertiesPanel `ops_coordinator_user_id` is a free-text input** — no user lookup. User types a string. Needs elevation to autocomplete/picker when the Users module is built.

6. **Status filter removed from URL params** — tabs own status filtering (local state). The `status` key remains in `VoyagesFilters` and `voyagesSearchSchema` for backwards compat but is no longer used in list filtering. This is a minor debt item.

7. **`is_pool` / `is_ice_class` / `is_clean` / `is_coated` PATCH bug risk** — in `update_voyage` the check is `if data.is_pool is not None` which means you cannot explicitly set a flag back to `False` via PATCH if the field is required. Actually `False is not None` evaluates to `True`, so this is fine. But worth confirming in review.

---

## 7. What's NOT in This Branch (M2+ scope)

- Itinerary lines management (ports, ETAs, ETDs) — M2
- Port Activities / Port Calls linked to voyage — M3
- P&L / Revenue panel — future
- Cargo details (Cargo, Opr Type columns visible in Veson) — future
- Full Users integration (picker, FK) — future
- GMT offset fields — future
- TCO VOYAGES real filter — future

---

## 8. How to Verify

```bash
# Backend
cd /path/to/repo
TESTING=true PYTHONPATH=. uv run pytest tests/ -q
# Expected: 477 passed, 1 skipped

# Frontend unit + typecheck
cd frontend
pnpm typecheck
pnpm exec vitest run
# Expected: 104 passed, typecheck clean

# E2E (requires local dev stack running)
pnpm exec playwright test voyages
```

---

## 9. Action Plan Request

Please review the above and return an action plan covering:
- Any bugs, correctness issues, or type safety gaps
- Any test coverage gaps
- Any architectural concerns (especially the design decisions in §6)
- Anything blocking merge to `main`
- Any quick wins to fix before M2 starts
