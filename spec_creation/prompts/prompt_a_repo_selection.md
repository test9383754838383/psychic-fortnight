# Block 4 — Prompt A: Baseline Repository Selection

## Role

You are a senior technical researcher.

Your job is to find 1-2 existing, proven repositories or documented solutions that best match the Vessel Schedule feature described below.

No hallucination is allowed. Every recommendation must include real, verifiable links.

If no candidate passes hard filters, return `NO_FIT`.

## Project Context

A production-grade modular monolith ERP for the Operations Department of a ship-management company. Shore-based operators only. Single-tenant. On-prem deployable in Docker.

Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2. Real session auth in place (Block 3.5). Voyage and vessel data already exist in the database (Block 2 + 3).

Frontend: React 19 + Vite 8 + TypeScript 6 strict + TanStack Router + TanStack Query + openapi-fetch. Frontend shell is live. Apache ECharts (`echarts`, Apache-2.0, v6.1.0) is the locked charting library.

## Workflow Context — What Block 4 Must Deliver

Step-by-step:

1. **Backend: Vessel Schedule API endpoint** — `GET /api/v1/schedule` returns all active vessels with their voyages in a date window. Response shape: list of vessels, each with their voyages (voyage_no, status, commencing_datetime, expected_completing_datetime, current/next port code, charterer, full port sequence, ETA/ETD of commenced ports). Supports query params: `date_from`, `date_to`, `vessel_ids[]`, `status[]`, `search` (voyage no. substring).
2. **Backend: Voyage Workspace stub endpoint** — `GET /api/v1/voyages/{id}/workspace` returns the full voyage detail needed for the workspace view. Block 4 defines the shape; the full workspace UI is Block 4's second screen.
3. **Frontend: Vessel Schedule page** — the home screen. An ECharts `custom` series Gantt: rows = active vessels, bars = voyages. Bar color by status, bar text = voyage no. + port code, tooltip = charterer/ports/ETA/ETD, date-range pan/zoom, click → navigate to Voyage Workspace.
4. **Frontend: Filter bar** — date range picker, vessel multi-select, status multi-select, voyage/ref search input. All filters are controlled React state passed to the ECharts data layer and/or the API query.
5. **Frontend: Voyage Workspace page** — a detail view for one voyage. Block 4 scope: voyage header (voyage no., vessel, status, charterer, CP type, dates), itinerary table (ordered port sequence, planned ETA/ETD per line), and voyage instructions/notes fields. Read-only display — editing comes in a later block.
6. **Frontend: Navigation** — clicking a bar on the Vessel Schedule navigates to the Voyage Workspace for that voyage. Back button returns to the schedule.
7. **Frontend: Auth integration** — all pages are behind `<RequireAuth>` (Block 3.5 auth context). No public routes.
8. **OpenAPI codegen** — backend schema changes regenerated into `openapi/openapi.json`; frontend types auto-generated via `pnpm run codegen`.
9. **Tests** — backend: pytest real-DB tests for the schedule endpoint (filter combinations, edge cases). Frontend: Vitest + RTL for the filter bar and schedule rendering; Playwright e2e for the full login → schedule → workspace flow.
10. **CI** — existing jobs cover the new code automatically; Playwright e2e job updated to cover the new flow.

## Scope

In scope:
- Read-only maritime voyage timeline/schedule implementations
- React-based operations dashboards with timeline/Gantt views
- FastAPI + SQLAlchemy patterns for aggregated schedule/timeline queries

Out of scope:
- Full ERP systems (too broad)
- Drag-to-reschedule or schedule editing tools
- Port scheduling or berth management systems
- Vessel tracking / AIS / real-time position systems
- Any solution requiring a commercial license

## Hard Constraints

1. Must be actively maintained as of 2026.
2. Must have a permissive license for commercial on-prem use (MIT, Apache-2.0, BSD).
3. Must show test evidence.
4. Must show production-grade signals.
5. Must be compatible with the locked stack: React 19, Vite 8, TypeScript 6, FastAPI, SQLAlchemy 2.0 async.
6. Must NOT require any commercial library (Bryntum, DHTMLX, Syncfusion, DevExtreme, etc.).

## Evaluation Criteria (priority order)

1. Simplicity
2. Functionality (covers the 10-step workflow above)
3. Test maturity
4. Production readiness
5. Budget flexibility (tiebreaker — free wins)

## Research Instructions

1. Search for: maritime operations dashboards, voyage schedule UIs, ship management open source, vessel timeline React, FastAPI schedule aggregation patterns.
2. Use primary sources (GitHub, npm, PyPI, official docs).
3. Do not recommend partial matches without explicit fit percentage.
4. If no OSS repo covers this workflow cleanly, return `NO_FIT` and state exactly which of the 10 steps would require custom code.

## Required Output Format

### A) Candidate Table

For each candidate:
- Name, URL, license, last active signal, fit % to the 10-step workflow
- Coverage map (which steps are native vs missing)
- Test evidence, production evidence, complexity risk notes

### B) Scoring

Score each candidate (1-10): simplicity, functionality, test maturity, production readiness, budget flexibility.

### C) Gap-to-Build List

For each candidate, exactly which of the 10 steps must be built on top.

### D) Final Decision

`RECOMMEND: <candidate>` with rationale, or `NO_FIT` with exact failure reasons.
