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

**Date:** 2026-05-31

**Status:** Block 7a (Forms — LLM email-to-form ingest) **complete**. All gates green, runbook committed. Block 7b (Checklists) is next.

**Block 7a evidence:**
- M1 (LLM core) merged via PR #5: `feat(forms): implement Block 7a M1 LLM core`
- M2 (persistence + API) merged via PR #7: `feat(forms): implement Block 7a M2 persistence and API`
- M3 (frontend) merged via PR #8: `feat(forms): implement Block 7a M3 forms review-queue frontend`
- Local + CI gates: make lint/typecheck/tach, 360 backend tests (1 skipped), ≥95% forms coverage, Postgres 18 migration smoke, frontend codegen/typecheck/lint/vitest (66)/Playwright e2e (workers:1)/audit — all green
- Module: FormParserService (OpenAI SDK structured outputs, provider-adapter, bounded retry, versioned prompts); Form+FormDetail+FormParseAttempt (XOR CHECK, Received→Under Review→Queried→Accepted/Rejected FSM, Admin/Operations acceptance gate, per-call cost/token capture); /forms review-queue route (paste-to-parse, parsed-vs-raw layout, role-gated controls, VoyageFormsPanel); golden corpus 10 fixtures; CI never calls live LLM
- Runbook: `docs/forms/runbook.md`

**Block 6 evidence:**
- M1 (backend) merged via PR #1: `feat(operational_reporting): implement Block 6 M1 backend module`
- M2 (frontend) merged via PR #2: `feat(operational_reporting): EventLog + Reports panels in Voyage Workspace`
- Runbook merged via PR #3: `docs/operational_reporting/runbook.md`
- Local + CI gates: make check (ruff, format, mypy --strict, tach), 291 backend tests parallelized with pytest-xdist (`-n auto`, 45s CI budget), 95.51% coverage, Postgres 18 migration smoke test (XOR CHECK + self-FKs), frontend codegen/typecheck/lint/vitest (43)/Playwright e2e (5, workers:1)/audit — all green
- Module: append-only PortActivity (self-FK correction chain) + ActivityLog; OperationalReport (voyage XOR port_call anchor, Pending→Queried→Accepted/Rejected machine, supersession for accepted-in-error); one-directional Tach boundary
- Runbook: `docs/operational_reporting/runbook.md`

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
- 2026-05-31 — Block 6 closed. M1 backend (PR #1) + M2 frontend (PR #2) + runbook (PR #3) merged to main, all CI green. Module: append-only PortActivity/ActivityLog, OperationalReport (XOR anchor, status machine, supersession). Suite parallelized with pytest-xdist (CI runtime budget set to 45s — 30s infeasible on 2-core runners with coverage). Two debt items logged in OPEN_DECISIONS §17 (e2e seed not parallel-safe; CI runs workers:1) and §18 (act()/hydrate warnings in role-aware component tests). Block 7 (Forms & Checklists) is next.
- 2026-05-31 — Block 7b (Checklists) spec drafting. Prompt A/B **deliberately skipped** — no new stack, no LLM, no domain novelty (plain ordered-CRUD + derived completion); running them would be ceremony with no payoff (CLAUDE.md §1/§4). Five-doc spec in docs/checklists/ (project_description, architecture, specifications, plan). Key decisions: derived completion only (no manual complete endpoint), in-place sign-off (not append-only), no role gate (sign-off is operator's own attestation), fixed default item sets (no template configurator), re-sign idempotent (D-ENTRY-3). Two milestones (M1 backend, M2 frontend).
- 2026-05-31 — Block 7a closed. M1 LLM core (PR #5) + M2 persistence+API (PR #7, incl. TS2502 fix for recursive JsonValue) + M3 frontend (PR #8) merged to main, all CI green. Module: FormParserService (OpenAI structured outputs, provider-adapter, bounded retry, versioned prompts, SDK isolated to forms/llm/), Form+FormDetail+FormParseAttempt (XOR anchor, Received→Accepted/Rejected FSM, Admin/Operations gate, per-call cost capture), /forms review-queue frontend (paste-to-parse, parsed-vs-raw review, role-gated accept/reject, VoyageFormsPanel). Golden corpus 10 fixtures; CI never calls live LLM. Debt: Ollama seam only (§19), IMAP deferred (§10), maxItems sanitizer gap, provider-name sniffing. Runbook: docs/forms/runbook.md. Block 7b (Checklists) is next.
- 2026-05-31 — Block 7a Prompt B run (stack verification). **ADR-0014 CONFIRMED** (OpenAI native Structured Outputs mature; no Instructor). Key overrides: (1) Ollama is NOT strict-mode parity → provider-adapter pattern, and founder set Ollama fallback to **seam-only, no working impl in V1a** (`OPEN_DECISIONS §19`); (2) coordinator override of Prompt B's `FormSource` entity — minimal source fields on `FormDetail` + `raw_text_hash` instead, no email-header table until IMAP is actually built (`CLAUDE.md §1` ban-future-proofing); (3) add `FormParseAttempt` audit row (don't overload `Form`); (4) three milestones (LLM core / persistence+FSM / frontend); (5) golden-corpus offline prompt tests, live evals behind `RUN_LLM_EVALS=1`. Full contract: `docs/forms/locked_decisions.md` (D-LOCK-1..21). Five-doc spec drafting begins (`project_description.md` next).
- 2026-05-31 — Block 7a Prompt A run, **NO_FIT** (maritime LLM-extraction domain is greenfield; PARTIAL_FITs are reference-only). Building `forms` from scratch on the existing codebase. Material flag: a fresh agent independently recommended `instructor`, which [ADR-0014] removed in favour of provider-native structured output — recorded as a Prompt B re-test of the ADR-0014 thesis, not grounds to reverse it. `Zipstack/unstract` is AGPL-3.0 (reference-only). FastAPI-boilerplate not adopted (mature codebase already exists).
- 2026-05-31 — Block 7 split into 7a (Forms + LLM ingest) / 7b (Checklists). Founder confirmed LLM email-to-form parsing stays as the primary forms channel (value: operators don't retype vessel emails; safety: parsed forms land `Received`, operator-approved, never auto-mutating). Ingest mode set to phased (paste/submit + `FormParserService.parse()` core now, IMAP poller seam later); `OPEN_DECISIONS §10` re-deferred. Block 7a spec drafting begins with Prompt A.
- 2026-05-29 — Block 6 Prompt B run. Four must-fixes, six overrides. Founder approved all gates. Locked (D-LOCK-1..11): new operational_reporting Tach module; append-only PortActivity with self-FK correction chain; append-only ActivityLog; event_type String+CheckConstraint (21 values); voyage_id XOR port_call_id CHECK on OperationalReport; explicit-dict report status machine (Pending→Queried/Accepted/Rejected); accepted-in-error via superseding report row (no status mutation); flat nullable structured fields + bunker_rob_total_mt; mutations require Operations/Admin; API shape with port-call + voyage report routes; two frontend panels in Voyage Workspace. Five-doc spec complete in `docs/operational_reporting/`.

## Next step

Block 7b (Checklists). Draft the five-doc spec set in `docs/checklists/` per `[ADR-0012]` (founder approval gate between each doc), then open the M0 coordinator. No LLM. Simple ordered sign-off CRUD (Checklist + ChecklistItem, Pre-Arrival / Pre-Departure). Straightforward block.
