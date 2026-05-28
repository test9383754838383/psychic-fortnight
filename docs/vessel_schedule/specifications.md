# Block 4 — Vessel Schedule · Specifications

ADR-linked. Stack-level decisions in `docs/architecture/locked_summary.md`. Implementation decisions in `docs/vessel_schedule/locked_decisions.md` (D-LOCK-1 through D-LOCK-8). This file owns the block-specific surface: API contract, D-entries, testing strategy, rejected alternatives, risks.

## 0. Context and Constraints

Block 4 is the first feature block — the application home screen. Two read-only API endpoints added to `voyage_spine`; two frontend pages on the existing React shell. No new domain entities, no new backend module.

**Non-negotiables (inherited):** TDD, real-DB tests [ADR-0011], mypy `--strict`, Tach boundaries [ADR-0010], 12-Factor, simplicity-first, ECharts-only charting [ADR-0017].

## 1. Stack (as used by this block)

**Backend** (unchanged from Block 3):
- Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2. [ADR-0002]
- SQLAlchemy 2.0 async + `selectinload` for itinerary eager loading. [ADR-0003]
- SQLite (dev/CI) / Postgres 18 (prod). [ADR-0004]
- Real session auth + RBAC. [ADR-0016]

**Frontend** (additions for this block):
- Apache ECharts `echarts@6.x` — `custom` series Gantt, direct React integration. [ADR-0017] (D-LOCK-1)
- `react-day-picker@10.x` — date range picker. (D-LOCK-2)
- `downshift@9.x` — vessel + status multi-select. (D-LOCK-3)
- TanStack Router search params (Zod-validated) for filter state. (D-LOCK-6)
- TanStack Query for schedule + workspace data fetching.

### Project layout additions

```
src/modules/voyage_spine/
├── api/{schedule_routes.py, workspace_routes.py}        ← NEW
├── services/{schedule_query.py, workspace_query.py}     ← NEW
└── schemas/{schedule.py, workspace.py}                  ← NEW

frontend/src/
├── routes/{schedule.tsx, voyages.$voyageId.workspace.tsx}  ← NEW
├── components/{VesselScheduleChart, ScheduleFilterBar,
│               VoyageWorkspaceHeader, ItineraryTable}.tsx   ← NEW
└── lib/{scheduleChartOption.ts, scheduleChartColors.ts}     ← NEW
```

### API surface (Block 4 additions)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/schedule` | Active vessels + voyages in a date window, filterable |
| `GET` | `/api/v1/voyages/{id}/workspace` | Full voyage detail for the workspace view |

**`GET /api/v1/schedule` query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `date_from` | ISO date | Yes | Window start (inclusive) |
| `date_to` | ISO date | Yes | Window end (inclusive) |
| `vessel_ids` | UUID[] | No | Filter to specific vessels |
| `status` | str[] | No | Filter to specific voyage statuses |
| `search` | str | No | `voyage_no` substring (ILIKE) |

Overlap predicate: `commencing_datetime <= date_to AND expected_completing_datetime >= date_from`. Only `vessels.status = 'Active'` rows returned.

### Schema rationale

- Read-only projection. No writes, no new tables. Three indexes added (D-LOCK-7).
- `current_next_port_code`: derived in the service — for a Commenced voyage, the next un-passed itinerary port; for Scheduled, the first port. Pure read computation, not persisted.
- `port_sequence` on each voyage bar carries the full ordered itinerary so the tooltip needs no second call.
- Workspace response nests `terms_*` under `terms`-style fields consistent with Block 3 DTOs.

## 2. D-entries

Inherit D-1 through D-23 from prior blocks. New for Block 4:

| Key | Default | Where | Why |
|---|---|---|---|
| `D-24` Default schedule window | today −30d to +30d | `schedule.tsx` search defaults | Immediate operational context on first load |
| `D-25` Max schedule window | 365 days | `schedule_query.py` validation | Caps query cost; rejects absurd ranges with 422 |
| `D-26` Status color map | Scheduled=grey, Commenced=blue, Completed=green, Closed=dark-grey, Cancelled=red | `scheduleChartColors.ts` | Immediate visual status cue on bars |
| `D-27` Schedule endpoint pagination | none (returns all in window) | `schedule_query.py` | Window + active-vessel filter bounds the set; pagination unnecessary at V1 scale |

## 3. Authentication and Authorization

Both endpoints depend on `get_current_user` (real, Block 3.5). No role restriction in V1 — all authenticated operators can view the schedule and any voyage workspace. Frontend routes are inside the `_authenticated` layout; `<RequireAuth>` guards them.

## 4. Testing Strategy

**Backend (real-DB):**
- `test_schedule_query.py` — overlap logic: voyage entirely inside window, voyage spanning window, voyage touching each boundary, voyage entirely outside (excluded). Filter combinations (vessel_ids, status, search). Active-only vessel filter. `current_next_port_code` derivation for Scheduled vs Commenced. Empty result.
- `test_schedule_api.py` — 200 happy path, 422 on missing/invalid date params, 422 on window > 365 days, auth required (401 without session).
- `test_workspace_query.py` — full detail assembly, ordered itinerary.
- `test_workspace_api.py` — 200, 404 unknown voyage, 401 unauthenticated.
- No N+1: assert itinerary lines load via `selectinload` (one extra query, not per-voyage).

**Frontend (Vitest + RTL):** (D-LOCK-8)
- `scheduleChartOption.test.ts` — pure data mapping: API response → ECharts series data. Status→color. Bar text. Tooltip metadata. Alert dot metadata (dormant).
- `ScheduleFilterBar.test.tsx` — date picker change, vessel multi-select, status multi-select, search input all update controlled state and emit correct filter object.
- `VesselScheduleChart.test.tsx` — mock `echarts.init`; assert `setOption` called with built option, `on("click")` wired, `dispose()` on unmount.
- `ItineraryTable.test.tsx` — renders ordered ports with ETA/ETD.

**Playwright e2e:** (D-LOCK-4)
- `schedule.spec.ts` — login → land on /schedule → schedule renders → apply a filter → click `[data-testid="voyage-bar-{id}"]` → workspace loads with correct voyage_no → back → filters preserved.

**Forbidden (unchanged):** mocked persistence on the backend; pixel-asserting ECharts canvas in jsdom.

## 5. Deployment and Infra

No new services. No new dependencies on the backend. Three new frontend npm packages (`echarts`, `react-day-picker`, `downshift`) — all MIT/Apache-2.0, pinned in `pnpm-lock.yaml`, covered by the existing `pnpm audit` CI gate.

## 6. Rejected Alternatives (block-specific)

| Item | Rejected | Reason |
|---|---|---|
| Gantt library | Bryntum / DHTMLX / Syncfusion | Commercial. [ADR-0017] |
| Gantt library | react-calendar-timeline | Breaks ECharts lock; beta React 19 line |
| ECharts wrapper | echarts-for-react | Not abandoned, but adds indirection with no value for a custom imperative chart (D-LOCK-1) |
| Date picker | react-datepicker, @mantine/dates | Accessibility concerns / UI kit dependency (D-LOCK-2) |
| Multi-select | react-select, Radix Select, Mantine | Opinionated/larger / single-select only / UI kit dependency (D-LOCK-3) |
| e2e bar click | Pixel coordinate clicking | Brittle on viewport/zoom/row-height (D-LOCK-4) |
| Schedule module | New `schedule` Tach module | Read projection of voyage_spine data; premature (D-LOCK-5) |
| Schedule pagination | Paginated schedule endpoint | Window + active-vessel filter bounds the set (D-27) |
| URL filter format | Custom search param serialization | JSON-style is fine for an internal tool (D-LOCK-6) |

## 7. Risks

| Risk | Confidence | Impact | Mitigation |
|---|---|---|---|
| ECharts canvas test brittleness | Medium | Medium | Mock instance, test data mapping; no pixel tests (D-LOCK-8) |
| Playwright flakiness clicking canvas | Medium | Medium | DOM overlay hit-targets, not coordinates (D-LOCK-4) |
| Schedule query slow as data grows | Low (1k bars at V1) | Medium | Indexes now (D-LOCK-7); revisit Postgres range/GiST only at 10k+ |
| `current_next_port_code` derivation wrong for edge voyages | Medium | Low | Explicit unit tests for Scheduled / Commenced / no-itinerary cases |
| react-day-picker range-mode edge cases | Low | Low | Test same-day range and controlled-state behaviour |
| Stale closure / render loop in ECharts effect | Low | Medium | `useMemo` option, stable handlers, separate init vs update effects |
| Timezone drift in date window | Low | Medium | UTC storage + ISO contract; date params interpreted as UTC |

## 8. Open Decisions Impacting This Block

| OPEN_DECISIONS item | Block 4 impact |
|---|---|
| §1 Bryntum (closed by ADR-0017) | ECharts is the locked charting library |
| §2 Multi-tenancy | None; single-tenant holds |
| §6 Port distance/routing | None; schedule uses itinerary ETDs, not computed distance |
| §10 Alert/task dots | Dot renders dormant on bars; Block 10 activates the data |
