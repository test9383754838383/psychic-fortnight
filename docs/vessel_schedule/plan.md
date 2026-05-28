# Block 4 — Vessel Schedule · Terminal Prompts

**Total terminals:** M0 + 2 milestone terminals.
M0 is the coordinator — no code, stays open the whole time.
M1 and M2 are each a fresh coding terminal.
Working directory for all terminals: `ERP_Operations/`.

## Milestone split rationale

- **M1 owns the backend.** Two read-only endpoints (`/schedule`, `/voyages/{id}/workspace`) added to `voyage_spine`, plus the three indexes. Backend-only. Establishes the schedule read-projection pattern and the OpenAPI contract the frontend consumes.
- **M2 owns the frontend.** Two pages (Vessel Schedule, Voyage Workspace), the ECharts Gantt, the filter bar, navigation, and all frontend + e2e tests. Consumes the M1 OpenAPI contract via codegen.

M2 cannot start until M1's OpenAPI schema is committed — the frontend types are generated from it. Two milestones is the right shape. ([ADR-0012])

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator for Block 4 — Vessel Schedule of the Vessel & Voyage Operations Control System. You do not write code. Your only job is to guide me through building this block one milestone at a time.

Read these files now, in order:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0012-per-block-four-doc-workflow.md
- docs/adr/0016-session-auth-implementation.md
- docs/adr/0017-echarts-supersedes-bryntum.md
- OPEN_DECISIONS.md
- docs/voyage_spine/runbook.md
- docs/auth_rbac/runbook.md
- docs/vessel_schedule/project_description.md
- docs/vessel_schedule/architecture.md
- docs/vessel_schedule/specifications.md
- docs/vessel_schedule/locked_decisions.md
- docs/vessel_schedule/plan.md

These are the full spec and your coordination map. When you are done, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1 → M2 in sequence:
- Tell me which milestone is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then move to the next milestone

If I report a problem or blocker in any terminal, help me diagnose it. Do not move forward until the current milestone's done condition is fully met.

TDD rule for every milestone: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Real-DB tests only on the backend. No mocked persistence. No fakes. No in-memory stubs for SQLAlchemy. On the frontend, do not pixel-test the ECharts canvas — mock the instance and test data mapping + lifecycle.

Do not write code. Do not suggest code. Coordinate only.

When M2 is green, remind me to write docs/vessel_schedule/runbook.md before declaring the block done (per [ADR-0012]).
```

---

## M1 — Schedule + Workspace API (backend read projection)

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0016-session-auth-implementation.md
- docs/voyage_spine/runbook.md
- docs/vessel_schedule/project_description.md
- docs/vessel_schedule/architecture.md
- docs/vessel_schedule/specifications.md
- docs/vessel_schedule/locked_decisions.md

Block 3 shipped the voyage_spine module (Voyage, ItineraryLine, repositories, service, API). Block 3.5 shipped real session auth. Reuse the Block 3 vertical-slice patterns. The Voyage and ItineraryLine models already exist — do not recreate them.

Implement M1 — Schedule + Workspace API.

## 1. Schemas

`src/modules/voyage_spine/schemas/schedule.py`:
- `VoyageBarDTO` — voyage_id, voyage_no, status, commencing_datetime, expected_completing_datetime, current_next_port_code, charterer, port_sequence (list of { port_code, planned_eta, planned_etd }).
- `VesselScheduleItemDTO` — vessel_id, vessel_name, voyages (list of VoyageBarDTO).
- `VesselScheduleResponse` — vessels (list of VesselScheduleItemDTO).

`src/modules/voyage_spine/schemas/workspace.py`:
- `VoyageWorkspaceResponse` per architecture §2: voyage header (voyage_id, voyage_no, status, vessel {id, name}, charterer, cp_type, cp_date, cp_document_ref, commencing/expected_completing datetimes), itinerary (ordered list of { sequence_no, port_code, planned_eta, planned_etd }), voyage_instructions, ops_notes.

All Pydantic v2.

## 2. Services

`services/schedule_query.py` — `ScheduleQueryService.get_schedule(date_from, date_to, vessel_ids, status, search, session)`:
- Overlap predicate: `commencing_datetime <= date_to AND expected_completing_datetime >= date_from`.
- Only vessels with `status == 'Active'`.
- Apply optional filters (vessel_ids IN, status IN, voyage_no ILIKE search).
- Eager-load itinerary lines via `selectinload(Voyage.itinerary_lines)` — no N+1.
- Derive `current_next_port_code`: for Scheduled → first itinerary port; for Commenced → next un-passed port; else first or None. Pure read logic.
- Group voyages under their vessel. Resolve charterer name and port codes via master_data public surface.
- Validate window ≤ 365 days (D-25) → raise a domain error mapped to 422.

`services/workspace_query.py` — `WorkspaceQueryService.get_workspace(voyage_id, session)`:
- Load voyage with vessel, itinerary (ordered by sequence_no), terms fields.
- Raise `VoyageNotFoundError` if missing → 404.

## 3. API

`api/schedule_routes.py` — `GET /api/v1/schedule`. Query params per specifications §1. Depends on `get_current_user`. Returns `VesselScheduleResponse`.

`api/workspace_routes.py` — `GET /api/v1/voyages/{id}/workspace`. Depends on `get_current_user`. Returns `VoyageWorkspaceResponse`. 404 on unknown voyage.

Register both routers. Confirm they are under the existing voyage_spine router prefix scheme.

## 4. Migration (indexes only)

Generate an Alembic migration adding three indexes (D-LOCK-7):
- `ix_voyages_window (commencing_datetime, expected_completing_datetime)`
- `ix_voyages_vessel_window (vessel_id, commencing_datetime, expected_completing_datetime)`
- `ix_voyages_status (status)`

No new tables, no new columns. Verify it runs on SQLite (batch mode) and Postgres.

## 5. Tests

Under `tests/modules/voyage_spine/`:
- `test_schedule_query.py` — overlap cases (inside / spanning / each boundary / outside-excluded), filter combinations, active-only vessels, current_next_port_code derivation (Scheduled / Commenced / no-itinerary), empty result, window > 365 days rejected.
- `test_schedule_api.py` — 200, 422 (missing/invalid dates, oversized window), 401 unauthenticated.
- `test_workspace_query.py` — full assembly, ordered itinerary.
- `test_workspace_api.py` — 200, 404 unknown, 401 unauthenticated.
- A no-N+1 assertion (query count bounded) for the schedule endpoint.

Reuse VesselFactory, PortFactory, VoyageFactory, ItineraryLineFactory. Real SQLite only.

## 6. CI + OpenAPI

- Existing CI jobs cover the new code automatically. Confirm tach check, mypy, pytest all pass.
- Regenerate `openapi/openapi.json` and commit it — M2 generates frontend types from this file.

## 7. TDD discipline

RED → GREEN → REFACTOR. Commit at each GREEN. Real-DB tests only.

## Done when

- Both endpoints work end-to-end via curl/HTTPie against a running dev server with a real session cookie.
- `make test` under 30s, all green. `make lint`, `make typecheck`, `tach check` pass.
- Coverage on the new schedule/workspace code ≥95% line.
- Migration adds the three indexes; runs clean on SQLite and Postgres.
- `openapi/openapi.json` regenerated and committed with the two new endpoints.
- CI green on all jobs.

Ask me before making any decision not covered by the specs.
```

---

## M2 — Vessel Schedule + Voyage Workspace (frontend)

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0016-session-auth-implementation.md
- docs/adr/0017-echarts-supersedes-bryntum.md
- OPEN_DECISIONS.md (§15)
- docs/vessel_schedule/project_description.md
- docs/vessel_schedule/architecture.md
- docs/vessel_schedule/specifications.md
- docs/vessel_schedule/locked_decisions.md
- frontend/README.md
- frontend/src/auth/AuthContext.tsx

M1 is complete: GET /api/v1/schedule and GET /api/v1/voyages/{id}/workspace ship; openapi/openapi.json includes them. The frontend shell, auth context, router, and codegen pipeline already exist (Block 3 M2).

Implement M2 — Vessel Schedule + Voyage Workspace.

**Hard scope: two pages only.** Vessel Schedule (home) and Voyage Workspace. Read-only. No editing UI.

## 1. Dependencies

Add to frontend/package.json (pin exact versions, commit pnpm-lock.yaml):
- `echarts` 6.x
- `react-day-picker` 10.x
- `downshift` 9.x
- `zod` (if not already present) for route search schema.

## 2. Codegen

Run `pnpm run codegen` to regenerate `src/api/schema.ts` with the schedule + workspace types. Confirm typecheck passes against the new types.

## 3. Pure logic (test first)

- `src/lib/scheduleChartColors.ts` — status → color map (D-26).
- `src/lib/scheduleChartOption.ts` — pure function: VesselScheduleResponse → ECharts option (custom series, renderItem drawing rect + text + dormant alert-dot circle, dataZoom, tooltip formatter). No React, no side effects. Fully unit-tested.

## 4. ECharts Gantt component

`src/components/VesselScheduleChart.tsx` (D-LOCK-1):
- Direct ECharts integration: `useRef` for container + instance, `echarts.init` in an init effect, `chart.on("click", ...)` for bar clicks, `chart.dispose()` on unmount.
- Separate effect calls `setOption(buildScheduleOption(data), { notMerge: true })` when `data` changes. Memoize the option.
- Render the DOM overlay hit-targets (D-LOCK-4): one `<button data-testid="voyage-bar-{voyageId}">` per visible voyage, positioned over the canvas, sharing the same click handler.

## 5. Filter bar

`src/components/ScheduleFilterBar.tsx`:
- Date range via `react-day-picker` mode="range" (D-LOCK-2).
- Vessel multi-select + status multi-select via `downshift` (D-LOCK-3).
- Debounced search input.
- Controlled — emits a filter object; does not own the source of truth (URL does).

## 6. Schedule page

`src/routes/schedule.tsx`:
- Route search schema via Zod (D-LOCK-6): dateFrom, dateTo, vesselIds[], statuses[], search. Defaults today ±30 days (D-24).
- TanStack Query `["schedule", filters]` → GET /api/v1/schedule, `credentials: "include"`.
- Renders ScheduleFilterBar + VesselScheduleChart.
- Filter changes call `router.navigate({ search })`; query refetches.
- Bar click → `router.navigate({ to: "/voyages/$voyageId/workspace", params })`.
- Inside the `_authenticated` layout (RequireAuth).

## 7. Workspace page

`src/routes/voyages.$voyageId.workspace.tsx`:
- TanStack Query → GET /api/v1/voyages/{id}/workspace, `credentials: "include"`.
- `VoyageWorkspaceHeader.tsx` — voyage_no, vessel, status badge, charterer, cp_type, dates.
- `ItineraryTable.tsx` — ordered ports with planned ETA/ETD and status.
- Instructions / ops notes panels (read-only).
- Skeleton loader during isLoading; error boundary on failure.
- "Back to Schedule" button → `router.navigate({ to: "/schedule" })` preserving search params.

## 8. Tests

- `scheduleChartOption.test.ts`, `scheduleChartColors.test.ts` — pure mapping (D-LOCK-8).
- `ScheduleFilterBar.test.tsx` — interactions update emitted filter state.
- `VesselScheduleChart.test.tsx` — mock `echarts.init`; assert setOption / on("click") / dispose.
- `ItineraryTable.test.tsx` — ordered rendering.
- `e2e/schedule.spec.ts` (Playwright) — login → /schedule → apply filter → click [data-testid="voyage-bar-{id}"] → workspace shows correct voyage_no → back → filters preserved.

Do not pixel-test the canvas.

## 9. CI

- Frontend job already runs codegen, typecheck, lint, test, e2e, audit. Confirm the new e2e flow is covered and `pnpm audit --audit-level=high` passes with the three new deps.

## 10. TDD discipline

Tests before components. RED → GREEN → REFACTOR. Commit at each GREEN.

## Done when

- `pnpm run dev` → /schedule renders the Gantt with vessels and voyage bars from the live backend.
- Filters narrow the bars; tooltip shows charterer/ports/ETA/ETD; clicking a bar opens the workspace.
- Workspace shows header + ordered itinerary + notes; back preserves filters.
- `pnpm run build`, `typecheck`, `lint`, `test`, `test:e2e`, `pnpm audit --audit-level=high` all pass.
- CI green on all jobs end-to-end.
- frontend/README.md updated: new routes, the ECharts Gantt approach, the DOM-overlay test pattern.

Ask me before making any decision not covered by the specs.
```

---

## After M2 green

Per [ADR-0012], write `docs/vessel_schedule/runbook.md` before declaring Block 4 done. The runbook should cover:

- How to run backend + frontend locally and reach the schedule (`make dev` + `pnpm run dev`, log in, open /schedule).
- Seeding data that produces a visible schedule: active vessels, voyages spanning the default window, itinerary lines.
- How the schedule overlap query works and how to widen/narrow the window.
- How to regenerate the OpenAPI schema and frontend types after a backend change.
- Common failure modes: empty schedule (no voyages in window / no active vessels), ECharts not rendering (container height zero), Playwright bar-click failing (overlay not positioned), codegen drift, timezone confusion on the date window.
- Operational notes: read-only (no editing yet); alert dot dormant until Block 10; no port-call data yet (Block 5).
- Useful URLs (Swagger, OpenAPI JSON, Vite dev /schedule).

Then I (the orchestrator) audit the block, verify diffs and CI evidence for the exact commit, and update `PROJECT_CONTEXT.md` to "Block 4 complete, Block 5 next."
