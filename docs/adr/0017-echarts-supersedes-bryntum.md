# ADR-0017 — Apache ECharts Supersedes Bryntum Scheduler

**Status:** Accepted — 2026-05-29
**Supersedes:** [ADR-0006] (Bryntum Scheduler for Vessel Schedule Gantt)
**Closes:** OPEN_DECISIONS §1 (Bryntum license budget gate)

## Context

ADR-0006 locked Bryntum Scheduler for the Block 4 Vessel Schedule Gantt. Bryntum is a commercial library (~$800/developer seat). The project does not have the budget for commercial licensing.

Deep research was run (2026-05-29) across five free candidates. Full functionality mapping confirmed all Block 4 requirements are covered.

## Decision

**Apache ECharts (`echarts`, Apache-2.0, v6.1.0 May 2026).**

All Block 4 requirements are met:

| Requirement | How |
|---|---|
| Rows = vessels | `yAxis: { type: "category" }` |
| Bars = voyages by datetime | `custom` series, `startMs → endMs` |
| Bar color by status | color logic inside `renderItem` |
| Bar text (voyage no., port code) | text element inside `renderItem` |
| Tooltip (charterer, ports, ETA/ETD) | `tooltip.formatter` |
| Date range filter / pan / zoom | `dataZoom` component |
| Click bar → open Voyage Workspace | `chart.on("click", ...)` |
| Alert dot on bar | circle element inside `renderItem` (dormant Block 4) |
| Filter by vessel / status / search | React state filter on data before passing to ECharts |
| Responsive resize | `chart.resize()` in ResizeObserver |

The voyage bar rendering requires a custom `renderItem` function (~80 lines). This is a first-class documented ECharts feature, not a workaround.

## Rejected alternatives

- **React Calendar Timeline beta** (MIT, Mar 2026) — closest fit but beta status is unacceptable for a production maritime ERP.
- **vis-timeline** (Apache-2.0, May 2026) — viable but imperative DOM library requiring more React lifecycle management than ECharts.
- **Frappe Gantt** (MIT, Feb 2026) — task Gantt model, wrong shape for vessel-row voyage timeline.
- **MUI X Charts** (MIT community) — not a Gantt/timeline solution.

## Consequences

- ADR-0006 superseded. Bryntum is not used in this project.
- OPEN_DECISIONS §1 closed. No license budget required.
- Block 4 spec drafting unblocked immediately.
- Apache-2.0 is compatible with commercial on-prem deployment.
- Bundle: ~359 kB gzip (full package); tree-shakeable via `echarts/core` modular imports.
