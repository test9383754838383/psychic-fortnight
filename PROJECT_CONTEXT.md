# Project Context — Vessel & Voyage Operations Control System

Navigator, not a content dump. Pointers and live status only. If you need details, follow the links.

## How to use this file

- Open this first in any new session. It tells you what the project is, where work currently stands, and where to look for everything else.
- This file is overwritten on every significant change — treat the **Where we are now** section as the source of truth for live status.
- For engineering rules: `CLAUDE.md`.
- For architecture: `docs/architecture/locked_summary.md` and the ADRs it cites.
- For deferred debt: `OPEN_DECISIONS.md`.
- For per-block specs: `docs/<module>/`.

## Your role

You are the lead professional software engineer on this project. The founder holds product vision and makes product decisions. You hold engineering quality, architecture, CI/CD, and test discipline. Push back on engineering concerns; defer on product scope. Verify everything — never rubber-stamp.

Operating posture and non-negotiables are in `CLAUDE.md`. Read it before doing anything.

## What the project is

A production-grade MLP ERP for the **Operations Department of a ship-management company**. Shore-based operators only; the onboard/vessel-side app is out of V1 scope. Modular monolith, local-first, on-prem deployable.

Architectural baseline: `docs/architecture/locked_summary.md`.
V1 scope and the eleven build blocks: `V1_ROADMAP.md`.
Durable project rules and roadmap: `ORCHESTRA.md`.

## Where we are now

**Date:** 2026-05-29

**Status:** Block 5 (Port Call) **complete**. All gates green, runbook committed. Block 6 is next.

**Block 5 evidence:**
- M1 commit: `5cd7914 feat(port_call): implement Block 5 M1 Port Call API`
- M2 commit: `b9b7626 feat(port_call): implement Block 5 M2 Port Call Panel`
- Local gates: make lint, make typecheck, tach check, pytest (24 tests, 96% coverage), pnpm typecheck, pnpm lint, pnpm test (21), pnpm build, pnpm test:e2e (port_call spec), pnpm audit — all pass
- Runbook: `docs/port_call/runbook.md`

**Block 4 evidence:**
- Final commit: `44704cdaa2fc07658ce0e3073dd5a9d241f58cf6`
- CI run: green (run `26628624880`)
- Local gates: typecheck, lint, test (12), test:e2e (3), build, audit — all pass
- Runbook: `docs/vessel_schedule/runbook.md`

**Block 3.5 evidence:**
- Final commit: `c3985aa feat: implement Block 3.5 Auth + RBAC module`
- Runbook: `docs/auth_rbac/runbook.md`

**Block 3 evidence:**
- Accepted Block 3 release/runbook commit: `592186c11b7de1921c2901e4dd835366dfdaae6c`
- Accepted release CI run: green (Actions run 26580204291)
- Runbook: `docs/voyage_spine/runbook.md`
- Post-release compliance: `post_release_compliance_report.md`

**Block 2 evidence:**
- Final commit: `577b0c36ba6e10e9fbe051a6fa52e63afd9d3951`
- Runbook: `docs/master_data/runbook.md`

**Open gates:**
- None. Bryntum replaced by Apache ECharts (free, Apache-2.0). [ADR-0017]. Block 4 is unblocked.

## Build workflow

Block by block. For each block:

1. Draft the five-doc spec set in `docs/<module>/` per `[ADR-0012]`. Founder approval gate between each doc.
2. Open the M0 coordinator terminal (paste the M0 prompt from `docs/<module>/plan.md`).
3. M0 walks through M1 → M[N] (1–3 milestones, hard cap).
4. Each milestone is a fresh terminal with a self-contained prompt. Founder reviews when done.
5. When all milestones green, write `docs/<module>/runbook.md`. Block is now "done."
6. Between-block audits at natural seams (not after every block).

The reusable spec-generation toolkit lives at `spec_creation/`. Block specs live in `docs/<module>/`. The toolkit is the generator; `docs/` is the canonical home.

## Non-negotiables

See `CLAUDE.md`. Highlights:
- TDD or it didn't happen.
- Real-DB integration tests; no mocked persistence ever. `[ADR-0011]`
- Strict typing, immutability, simplicity, delete-first.
- 12-Factor App; 12-Factor Agent at LLM boundaries.
- No future-proofing.

## Architecture references

- Locked summary: `docs/architecture/locked_summary.md`
- ADRs: `docs/adr/0001-modular-monolith.md` through `docs/adr/0012-per-block-four-doc-workflow.md`
- V1 scope and block sequence: `V1_ROADMAP.md`
- Durable project rules: `ORCHESTRA.md`

## History log

- 2026-05-26 — `ORCHESTRA.md` created; V1 scope locked.
- 2026-05-26 — V1 build memory separated into `V1_ROADMAP.md`.
- 2026-05-27 — Stack research completed; Bryntum selected for Gantt; FastAPI replaces Litestar; Huey on SQLite-dev / Redis-prod locked.
- 2026-05-27 — Block 2 (Master Data) specs drafted.
- 2026-05-27 — Adopted new doc system: ADRs (12 seeded), `PROJECT_CONTEXT.md`, `OPEN_DECISIONS.md`, `docs/<module>/` per-block specs.
- 2026-05-28 — Block 2 closed (CI green at `577b0c3`). Roadmap gaps resolved: frontend scaffold into Block 3 M2, Block 3.5 Auth + RBAC inserted. Block 3 spec drafting begins.
- 2026-05-28 — Block 3 Prompt A run, returned `NO_FIT`. Tactical implementation decisions locked in `docs/voyage_spine/locked_decisions.md` (orderinglist for ItineraryLine, flat columns for VoyageOperatingTerms, service-layer recompute, service-layer state machine).
- 2026-05-28 — Block 3 Prompt B run (full-stack verification, research 1). Result: seven Block 2 ADRs independently confirmed. Three supersedes: [ADR-0013] APScheduler replaces Huey; [ADR-0014] OpenAI SDK + Pydantic direct replaces Instructor; [ADR-0015] Caddy locked as reverse proxy (closes OPEN_DECISIONS §12). New decisions: argon2-cffi (§13), Testcontainers (§14), openapi-typescript + openapi-fetch (§15), structlog + Vector + GlitchTip (§11 closed). [ADR-0010] Tach pending recheck on 2026 maturity claim.
- 2026-05-28 — Recheck run on six suspect claims. Verdicts: Tach Beta classifier CONFIRMED (decision pending); TypeScript 6.0.3 stable CONFIRMED (locked); Vite 8.0.14 stable CONFIRMED (locked); TanStack Router supply-chain incident May 11 2026 resolved May 15 2026 CONFIRMED (router locked, lockfile + audit gate required); fastapi-users maintenance mode since Oct 25 2025 CONFIRMED (first-party auth approach stands for Block 3.5); Postgres 18.4 current stable CONFIRMED (production target bumped 16→18 in locked_summary.md).
- 2026-05-28 — Block 3 closed (CI green at `74834e0`). Block 3.5 spec drafting begins.
- 2026-05-28 — Block 3.5 Prompt A run, returned `NO_FIT`. No OSS repo fits (AuthTuna forces multi-tenancy; starsessions is inactive; fastapi-user-auth requires Casbin + admin UI). Custom implementation confirmed.
- 2026-05-28 — Block 3.5 Prompt B run. All preliminary decisions confirmed. One override: starlette-session inactive → custom FastAPI dependency. New decisions: slowapi brute-force (in V1), hybrid TTL (30-min idle / 8-hr absolute), case-insensitive usernames. All locked in [ADR-0016]. Five-doc spec complete in `docs/auth_rbac/`.
- 2026-05-29 — Block 3.5 closed (CI green at `c3985aa`). Block 4 (Vessel Schedule) is next — Bryntum license gate binds before spec drafting begins.
- 2026-05-29 — Bryntum dropped (budget unavailable). Deep research run; Apache ECharts (Apache-2.0, v6.1.0) adopted. [ADR-0006] superseded by [ADR-0017]. OPEN_DECISIONS §1 closed. Block 4 unblocked.
- 2026-05-29 — Block 4 Prompt A run twice, both `NO_FIT` (no OSS vessel-schedule ERP UI on this stack). Prompt B run: all 10 layers confirmed. Picks locked — date picker react-day-picker 10.x, multi-select downshift 9.x, direct ECharts integration (no wrapper), DOM-overlay e2e hit-targets, schedule stays in voyage_spine, JSON-style URL filters, UTC date policy. Five-doc spec complete in `docs/vessel_schedule/`.
- 2026-05-29 — Block 4 closed (CI green at `44704cd`, run 26628624880). M1 schedule + workspace endpoints, M2 ECharts Gantt + Voyage Workspace pages. Runbook committed. Block 5 (Port Call) is next.
- 2026-05-29 — Block 5 Prompt A `NO_FIT` (DCSA Port Call v2.0 kept as vocabulary blueprint only; Port Activity App + SPOCP rejected). Prompt B architecture review overrode 4 preliminary decisions; founder approved all 6 gates. Locked (D-LOCK-1..10): new port_call Tach module (one-directional deps, scalar FKs, no ORM back-import), skip-allowed state machine + privileged correction path, three added timestamp fields, IANA tz snapshot + UTC, derived active agent appointment (no FK pointer) with partial unique index, asymmetric clearance invariant, nested+member API shape, datetime-local frontend. Five-doc spec complete in `docs/port_call/`.
- 2026-05-29 — Block 5 closed (M1 `5cd7914`, M2 `b9b7626`). PortCall + AgentAppointment module: 24 backend tests 96% coverage, 21 frontend tests, Playwright e2e. Runbook committed. Block 6 is next.
- 2026-05-29 — Block 6 Prompt A `NO_FIT`. Two PARTIAL_FITs noted: windmar-nav/windmar (exact stack, Apache-2.0, covers OperationalReport/Noon reports but wrong domain focus — hydrodynamic performance not commercial port ops); SPOCP/spocp-port-call-api (perfect domain model for 21-event port call vocabulary, wrong stack — Java/Spring Boot). No open-source maritime ERP covers commercial Laytime/SOF/ActivityLog logic. Building from scratch. Prompt B drafted in `docs/operational_reporting/prompt_b.md`.
- 2026-05-29 — Block 6 Prompt B run. Four must-fixes, six overrides. Founder approved all gates. Locked (D-LOCK-1..11): new operational_reporting Tach module; append-only PortActivity with self-FK correction chain; append-only ActivityLog; event_type String+CheckConstraint (21 values); voyage_id XOR port_call_id CHECK on OperationalReport; explicit-dict report status machine (Pending→Queried/Accepted/Rejected); accepted-in-error via superseding report row (no status mutation); flat nullable structured fields + bunker_rob_total_mt; mutations require Operations/Admin; API shape with port-call + voyage report routes; two frontend panels in Voyage Workspace. Four-doc spec complete in `docs/operational_reporting/` (plan.md pending).

## Next step

Block 6 — four-doc spec complete. Write `docs/operational_reporting/plan.md` then open M0 coordinator to begin coding (M1 backend → M2 frontend).
