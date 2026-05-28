# Block 4 — Vessel Schedule · Locked Decisions

Tactical implementation decisions locked before spec drafting. Verified by Prompt A (NO_FIT ×2, 2026-05-29) and Prompt B (full-stack verification, 2026-05-29).

---

## D-LOCK-1 — ECharts `custom` series + `renderItem`, direct React integration

**Decision:** The Vessel Schedule Gantt is built with Apache ECharts `custom` series. Each voyage bar is drawn via `renderItem` returning graphic rectangle + text + circle elements. React integration is direct: `useRef` + `useEffect`, `echarts.init()`, `chart.setOption()`, `chart.on("click")`, `chart.dispose()` on unmount. No wrapper library (`echarts-for-react` not used).

**Why:** No native ECharts Gantt series exists (GitHub issue #19579 remains open). `custom` series + `renderItem` is the official documented path. Direct integration is simpler for a custom imperative chart than any wrapper. `echarts-for-react` is not abandoned but adds indirection that provides no value here.

---

## D-LOCK-2 — `react-day-picker@10.x` for date range picker

**Decision:** `react-day-picker` v10, `mode="range"`, controlled component wired to TanStack Router search params.

**Why:** MIT, actively maintained, React 19 compatible, supports range selection, accessible, no UI kit dependency. Tested against same-day range edge cases.

**Rejected:** react-datepicker (accessibility concerns), @mantine/dates (UI kit dependency), Radix (no complete date range picker).

---

## D-LOCK-3 — `downshift@9.x` (`useCombobox` + `useMultipleSelection`) for multi-select

**Decision:** Downshift headless hooks for vessel multi-select and status multi-select. Visual shell built as part of the ERP's own UI.

**Why:** MIT, actively maintained, accessible controlled multi-select, no UI kit dependency. Consistent with the project's custom ERP shell.

**Rejected:** react-select (more opinionated, larger), cmdk (command palette, not a multi-select), Radix Select (single-select only), Mantine MultiSelect (UI kit dependency).

---

## D-LOCK-4 — DOM overlay hit-targets for Playwright e2e clicks on voyage bars

**Decision:** A transparent DOM layer renders one `<button data-testid="voyage-bar-{voyageId}">` per visible voyage bar, positioned over the corresponding ECharts canvas area. Playwright clicks these buttons. ECharts `chart.on("click")` handles real user canvas interaction.

**Why:** Pixel coordinate clicking on ECharts canvas is brittle — breaks on viewport size, zoom state, row height changes. DOM buttons are deterministic, also improve keyboard accessibility.

---

## D-LOCK-5 — Schedule endpoints stay inside `voyage_spine`, no new module

**Decision:** `GET /api/v1/schedule` and `GET /api/v1/voyages/{id}/workspace` are added to the `voyage_spine` module under `api/schedule_routes.py` and `api/workspace_routes.py`. No new Tach module.

**Why:** Both endpoints are read-only projections of data owned by `voyage_spine` (Voyage, Vessel FK, ItineraryLine). No new domain entity. A separate `schedule` module would import voyage internals and violate the purpose of Tach boundaries.

**Revisit:** if Block 5+ makes the schedule a cross-module dashboard (port calls, tasks, alerts, bunkers), extract a `schedule_read_model` module at that point.

---

## D-LOCK-6 — TanStack Router JSON-style search params for filter state

**Decision:** Filter state (date range, vessel IDs array, status array, search string) is persisted in TanStack Router URL search params using the default JSON serialization. Schema validated with Zod at the route level.

**Why:** TanStack Router's JSON-style arrays (`?filters={"vesselIds":["1","2"]}`) are simpler than custom serialization. This is an internal ops tool — operators never manually read URLs. Custom serialization adds code with no operator benefit.

---

## D-LOCK-7 — DB indexes on voyage date columns

**Decision:** Add two indexes in the Block 4 Alembic migration:

```sql
CREATE INDEX ix_voyages_window ON voyages (commencing_datetime, expected_completing_datetime);
CREATE INDEX ix_voyages_vessel_window ON voyages (vessel_id, commencing_datetime, expected_completing_datetime);
CREATE INDEX ix_voyages_status ON voyages (status);
```

**Why:** The schedule overlap query filters on all three columns. At 50 vessels × 20 voyages = ~1,000 rows these indexes are not critical, but they establish the correct pattern for when the dataset grows over years of operation.

---

## D-LOCK-8 — ECharts unit tests: mock the instance, test data mapping

**Decision:** Vitest unit tests do not attempt to render ECharts canvas in jsdom. Tests cover: (a) pure data-mapping functions (`scheduleResponse → chartSeriesData`), (b) option builder (colors, labels, tooltip metadata, alert dot), (c) React component integration with mocked `echarts.init` asserting `setOption`, `on("click")`, and `dispose()` are called correctly.

**Why:** jsdom has no real canvas. Pixel-testing ECharts in Vitest is brittle and gives no business confidence. The valuable coverage is the data transformation logic and lifecycle management.
