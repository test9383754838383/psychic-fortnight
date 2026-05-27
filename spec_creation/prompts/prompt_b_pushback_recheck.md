# Prompt B — Targeted Pushback Recheck

## Role

You are a senior technical researcher. Verify or refute the four claims below with primary sources only (official repos, official docs, official pricing pages). No marketing blogs. No hallucination — if you cannot find a primary source, say so.

## Context (one paragraph)

We are designing a Python + React modular monolith ERP for ship-management operations. Local-first (SQLite dev, Postgres prod), TDD with real-DB tests, on-prem Docker Compose. Another researcher recommended a stack. I need four specific claims verified before we lock it.

---

## Claim 1 — Planby Gantt library

The prior researcher claims:

- **Planby** is a React-native scheduler suitable for rendering 20–200 vessel rows with voyage bars as a Gantt-style operational schedule.
- It has a **commercial "PRO" license at a flat $400 per developer**.
- It delivers **"60fps with 10,000+ items"** via bidirectional DOM virtualization.

Verify:

1. What is Planby's actual primary use case (per its official GitHub repo and docs)? Is it a generic Gantt/resource scheduler, or specifically an Electronic Program Guide (EPG) for TV schedules?
2. What is its **actual license**? Find the LICENSE file in the repo. Is there a paid PRO tier, and if so, at what price? Cite the URL.
3. Is the "10,000+ items at 60fps" claim substantiated anywhere in official docs or benchmarks?
4. Last commit date, release cadence, star count, open issues.
5. **Verdict:** is Planby a credible choice for a maritime vessel-schedule Gantt, or is the prior researcher's recommendation off-base?

## Claim 2 — Litestar vs FastAPI

The prior researcher chose **Litestar** over FastAPI, citing native SQLAlchemy repository integration and better DI.

Verify with primary sources:

1. Current GitHub stars, contributors, release cadence, and last commit for both Litestar and FastAPI.
2. Does FastAPI have a comparable SQLAlchemy repository pattern available via a well-maintained extension, or does it require hand-rolling? Name the extension if it exists.
3. Hiring-pool reality: rough indicator of which has more job postings / Stack Overflow answers / tutorial volume.
4. **Verdict:** for a small team building a production ERP that needs to be maintained for years, is Litestar's edge worth the smaller ecosystem, or is FastAPI the safer pick?

## Claim 3 — Huey with SQLite broker in production

The prior researcher recommends **Huey with a SQLite backend** as the task queue, both locally and in production. They flag concurrency risk but downplay it.

Verify:

1. Does Huey officially support SQLite as a broker? Cite the docs.
2. What are the documented concurrency limits of SQLite as a Huey broker under multiple worker processes, even with WAL mode enabled?
3. Are there documented production deployments of Huey-on-SQLite under non-trivial load, or is this a development-only pattern?
4. **Verdict:** is Huey-on-SQLite production-viable for a ~20–200 vessel ERP with email-parsing background jobs, or should production use Redis from day one?

## Claim 4 — Anything else suspicious

Skim the prior researcher's full output (summarized below) and flag any other specific claim that looks hallucinated, outdated, or unsupported by primary sources. Keep this section under 200 words.

**Prior output summary:** Python 3.12 + Litestar + SQLAlchemy 2.0 + Alembic + Tach (boundary enforcement) + React/Vite/TS strict + Planby Gantt + Litestar session auth + Huey on SQLite + imap-tools + mail-parser + GreenMail (IMAP test server) + Instructor + Pydantic + OpenAI gpt-4o-mini (cloud) / Ollama + phi4 (local) + pytest + FactoryBoy.

---

## Output Format

For each of the four claims:

- **Claim:** [restate in one line]
- **Verdict:** Confirmed / Partially confirmed / Refuted / Unverifiable
- **Evidence:** primary-source URLs only, with the specific quote or data point each one supports
- **Recommendation:** keep, amend, or replace — with one concrete alternative if replacing

End with a one-paragraph bottom-line: which parts of the prior stack should we lock, which should we change, and which need a third pass.
