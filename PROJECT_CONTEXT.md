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

**Date:** 2026-05-27

**Status:** Pre-code. All architectural decisions locked (see `docs/adr/0001–0012`). Block 2 (Master Data) is fully specified in `docs/master_data/`. Stack locked. The repository contains no application code yet.

**Open gates:**
- Founder budget approval for Bryntum Scheduler licensing (`[ADR-0006]`).
- Awaiting green light to open M0 coordinator terminal for Block 2.

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

## Next step

Founder confirms readiness to start Block 2 coding. Open M0 coordinator with the prompt from `docs/master_data/plan.md`. Bryntum budget approval can run in parallel — it doesn't gate Block 2, which has no UI.
