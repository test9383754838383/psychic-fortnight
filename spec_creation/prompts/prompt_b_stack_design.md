# Block 4 — Prompt B: Full Stack Verification (Vessel Schedule)

## Role

You are a senior technical architect and independent reviewer.

Your job is to verify the complete technical stack for Block 4 — Vessel Schedule of this project. You are an external researcher. You have no prior knowledge of what was decided. You start from the requirements, not from conclusions.

No hallucination is allowed. Every recommendation must be real, actively maintained, and verifiable by URL.

If any preliminary decision is wrong, outdated, or has a better alternative, say so explicitly. Do not rubber-stamp existing choices.

---

## Project Context

Production-grade modular monolith ERP for the Operations Department of a ship-management company. Shore-based operators only. Single-tenant. On-prem deployable in Docker. No SaaS services.

Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + Alembic (batch mode). SQLite dev/CI, Postgres 18 production. Real session auth in place (argon2-cffi, HttpOnly cookies, RBAC roles).

Frontend: React 19 + Vite 8 + TypeScript 6 strict + TanStack Router + TanStack Query + openapi-typescript + openapi-fetch. Frontend shell and auth context are live.

Tach enforces backend module boundaries. pytest + real-DB tests only. TDD. mypy --strict.

---

## What Block 4 Must Deliver

1. **`GET /api/v1/schedule`** — returns all active vessels with their voyages in a date window. Temporal overlap query: voyage is included if `commencing_datetime <= date_to AND expected_completing_datetime >= date_from`. Query params: `date_from`, `date_to`, `vessel_ids[]`, `status[]`, `search` (voyage_no substring). Response: list of vessels, each with a list of voyage bars (voyage_no, status, commencing_datetime, expected_completing_datetime, current/next port code, charterer, full port sequence, ETA/ETD).
2. **`GET /api/v1/voyages/{id}/workspace`** — full voyage detail: header (vessel, voyage_no, status, charterer, CP type/date), ordered itinerary (port sequence, planned ETA/ETD per line), voyage instructions, ops notes.
3. **Vessel Schedule page** — the app home screen. ECharts `custom` series Gantt: rows = vessels, bars = voyages. Bar color by status, bar text = voyage_no + port code, tooltip = charterer/ports/ETA/ETD, date-range pan/zoom (`dataZoom`), click bar → navigate to Voyage Workspace. Alert dot on bar (dormant — renders but no logic until Block 10).
4. **Filter bar** — date range picker, vessel multi-select, status multi-select, voyage/ref search. Controlled React state, synced to TanStack Router URL search params. Drives the TanStack Query key for the schedule endpoint.
5. **Voyage Workspace page** — voyage header, itinerary table (ordered port sequence, ETA/ETD, status per line), instructions/notes. Read-only. Navigated to via bar click on the schedule.
6. **Navigation** — click bar → `/voyages/$voyageId/workspace`. Back → schedule preserving filter state in URL.
7. **Auth** — all routes behind `<RequireAuth>`. Session cookie sent on all API calls (`credentials: "include"`).
8. **OpenAPI codegen** — backend schema changes regenerated into `openapi/openapi.json`; frontend types via `pnpm run codegen`.
9. **Tests** — backend: pytest real-DB for schedule endpoint (overlap logic, filter combinations). Frontend: Vitest + RTL for filter bar and schedule rendering. Playwright e2e: login → schedule → click bar → workspace → back.
10. **CI** — existing jobs cover new code; Playwright job updated for the new flow.

---

## Preliminary Decisions (challenge these if wrong)

| # | Decision | Claimed Rationale |
|---|---|---|
| 1 | **ECharts `custom` series + `renderItem`** for the Gantt bars | ECharts is locked (ADR-0017, Apache-2.0). No native Gantt series exists; `custom` series is the documented workaround per ECharts handbook and GitHub issue #19579. |
| 2 | **No new backend module** — schedule endpoint lives in `voyage_spine` module | The schedule query reads Voyage + Vessel + ItineraryLine — all already owned by `voyage_spine`. No new domain entity. |
| 3 | **Temporal overlap query** — `commencing_datetime <= date_to AND expected_completing_datetime >= date_from` | Standard interval overlap predicate. |
| 4 | **TanStack Query `useQuery`** for schedule data, filter state as query key | Already in the stack. Filter changes invalidate cache and refetch automatically. |
| 5 | **URL search params via TanStack Router** for filter state persistence | Enables deep-linking and back-navigation with filter state preserved. |
| 6 | **No new npm package for the Gantt** — ECharts only | ECharts covers all rendering requirements via `renderItem`. react-calendar-timeline rejected (breaks ECharts lock, beta risk). |
| 7 | **Date picker + multi-select** — not yet decided | Need recommendation for a free, React 19 compatible, accessible date range picker and multi-select component. No commercial UI kits. |
| 8 | **ECharts React wrapper** — direct integration via `useRef` + `useEffect`, no `echarts-for-react` wrapper library | `echarts-for-react` last released 2023, potentially stale. Direct integration gives full control and avoids dependency risk. |
| 9 | **Schedule query performance** — `selectinload` for itinerary lines, no N+1 | Single async session, two queries max: one for vessels+voyages, one for itinerary lines per voyage batch. |
| 10 | **Testing ECharts canvas** — test data flow and interaction, not pixel rendering | Vitest + RTL tests confirm the correct data is passed to ECharts and click handlers fire. Canvas pixel assertion is not the goal. |

---

## Required Verification Layers

### Layer 1 — ECharts `custom` series for Gantt bars
Verify: is `renderItem` the correct and only approach for Gantt-style bars in ECharts 6.x? Is there a simpler ECharts series type that achieves rows × time bars without `renderItem`? Confirm `api.coord()`, `api.size()`, and graphic element return types are stable APIs in ECharts 6.1.0. Any known issues with ECharts 6.x + Vite 8 + React 19 (ESM imports, tree-shaking, canvas renderer)?

### Layer 2 — ECharts React integration (no wrapper library)
Verify: is direct `useRef` + `useEffect` integration the correct approach in 2026? Check `echarts-for-react` current status — is it maintained or abandoned? Any React 19 concurrent mode concerns with direct ECharts imperative DOM manipulation? Correct disposal pattern (`echartsInstance.dispose()` on unmount)?

### Layer 3 — Date picker component
Decide: what is the best free, MIT/Apache-2.0 licensed, React 19 compatible date range picker as of 2026? Requirements: date range selection (start + end), controlled component, TypeScript types, accessible (WCAG AA minimum), no mandatory UI kit dependency. Check: react-datepicker, react-day-picker, @mantine/dates, Radix-based solutions. Confirm maintenance status and React 19 compatibility for each.

### Layer 4 — Multi-select component
Decide: what is the best free, MIT/Apache-2.0 licensed, React 19 compatible multi-select dropdown as of 2026? Requirements: controlled, searchable, TypeScript types, accessible. Check: react-select, downshift, cmdk, Radix Select. Confirm maintenance status and React 19 compatibility.

### Layer 5 — Schedule query design (SQLAlchemy async)
Verify: temporal overlap predicate (`commencing_datetime <= date_to AND expected_completing_datetime >= date_from`) is correct and efficient on both SQLite and Postgres 18. Confirm `selectinload` is the right eager-loading strategy for this query shape (one-to-many itinerary lines per voyage). Any index recommendation for the schedule query (commencing_datetime, expected_completing_datetime)? Expected performance at 50 vessels × 20 voyages each?

### Layer 6 — Filter state in URL (TanStack Router)
Verify: TanStack Router search params are the correct mechanism for persisting filter state in 2026 (date range, vessel IDs array, status array, search string). Any known issues with array params in TanStack Router's search param serialization? Back-navigation preserving search params — is this automatic or requires explicit config?

### Layer 7 — TanStack Query + ECharts data flow
Verify: the pattern of `useQuery` → data → passed as prop to ECharts component → `useEffect` re-runs on data change → `chart.setOption(newOptions)` is the correct React 19 + TanStack Query + ECharts integration pattern. Any stale closure or infinite render loop concerns?

### Layer 8 — Testing ECharts in Vitest + RTL
Verify: what is the correct approach for testing an ECharts component in Vitest + jsdom? ECharts requires a DOM canvas element — jsdom does not support canvas by default. Options: `jest-canvas-mock` / `vitest-canvas-mock`, mock the entire ECharts instance, or test only the data-preparation logic (not the chart render). Recommend the simplest approach that gives real coverage without brittle pixel tests.

### Layer 9 — Playwright e2e with ECharts canvas
Verify: can Playwright interact with ECharts canvas elements (click on a specific bar)? What is the correct Playwright approach for clicking a voyage bar — pixel coordinates, `chart.on('click')` side-effects, or a data-testid on a DOM overlay? Recommend the most reliable pattern.

### Layer 10 — No new backend module (schedule in voyage_spine)
Verify: adding `GET /api/v1/schedule` to the `voyage_spine` module is architecturally sound. Does it violate Tach boundaries or the hexagonal-lite layering pattern? Should it be a new `schedule` read-model module, or is it a natural read-only projection of voyage_spine data?

---

## Required Output Format

### A) Layer-by-Layer Verdict
For each of the 10 layers: confirm or override the preliminary decision, give a recommendation with version guidance, name alternatives and rejection reason, note any concern.

### B) Full Stack Table
One table: layer → tool/approach → version → one-line justification → any flag.

### C) Decision Gates
Any decision requiring founder approval before build starts.

### D) Risk Flags
Security, performance, test, migration, and any decision to revisit before Block 5.

### E) Prompt A Result Appendix

Prompt A result for Block 4:
- Decision: NO_FIT (confirmed by two independent research runs)
- Candidates: Norwegian AIS Viewer (AIS tracker, wrong domain), WindMar (weather routing, wrong domain), DCSA Conformance Gateway (Java/Spring Boot, wrong stack), ECharts Gantt demo (abandoned 2023). react-calendar-timeline (MIT, beta, breaks ECharts lock).
- Gap list: All 10 steps must be built custom. No OSS repo implements a vessel schedule ERP timeline on FastAPI + ECharts. ECharts custom series is the only valid rendering path on the locked stack.
