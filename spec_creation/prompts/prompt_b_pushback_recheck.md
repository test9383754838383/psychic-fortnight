# Recheck — Six Suspect Claims From Prompt B (Research 1)

## Role

You are an independent senior technical verifier. The job is narrow: confirm or refute six specific claims made by a prior researcher about real, verifiable, current (mid-2026) state of named open-source projects.

No hallucination. Every answer must cite a primary source — the project's own repository, official release notes, or an officially-linked security advisory / postmortem. Marketing pages and unofficial summaries do not count as primary.

For each claim, return one of three verdicts:
- **CONFIRMED** with the primary source link and the relevant excerpt.
- **REFUTED** with the primary source link and the correct fact.
- **UNCERTAIN** with a one-sentence explanation of what evidence is missing.

No equivocation. No "it depends." Each claim is a factual yes/no.

---

## Claim 1 — Tach maturity status

> A prior researcher described Tach (the Python module-boundary enforcement tool at `gauge-sh/tach`) as **"still beta-positioned"** as of 2026, and recommended `import-linter` instead as a more established alternative.

**Verify:**

- What is Tach's actual current version and stability self-classification on the project's GitHub repository and PyPI page as of mid-2026?
- Does the project's own documentation describe it as beta, alpha, stable, production-ready, or otherwise?
- Are there visible production-grade signals: weekly downloads, public adopters, issue hygiene, release cadence?
- For comparison: what is `import-linter`'s current state in the same dimensions?

**Why it matters:** the orchestrator is deciding whether to keep Tach (locked in [ADR-0010] and already configured in the shipped Block 2 of the project) or switch to import-linter. A "still beta" claim, if true, would justify the switch. If false, the original ADR holds.

---

## Claim 2 — TypeScript 6.x existence

> The prior researcher recommended **"TypeScript 6.x"** as the current stable version for 2026 and linked to a "TypeScript 6.0 announcement" blog post.

**Verify:**

- What is the actual current stable major version of TypeScript as of mid-2026, per the official TypeScript release page (`https://devblogs.microsoft.com/typescript/`) and the `typescript` npm package?
- Does an announcement for TypeScript 6.0 actually exist, or is the latest a 5.x release?

**Why it matters:** version pinning in `package.json` will be wrong if TypeScript is still on a 5.x major.

---

## Claim 3 — Vite 8.x existence

> The prior researcher recommended **"Vite 8.x"** as the current stable version for 2026.

**Verify:**

- What is the actual current stable major version of Vite as of mid-2026, per the official Vite releases page on GitHub and the `vite` npm package?

**Why it matters:** same as Claim 2 — version pinning in `package.json`.

---

## Claim 4 — TanStack Router supply-chain compromise May 2026

> The prior researcher stated that **"the TanStack Router/Start repo had a supply-chain compromise that was announced as cleared on May 15, 2026"** and recommended TanStack Router with the caveat of "use exact lockfiles and audit gates."

**Verify:**

- Did a supply-chain compromise of TanStack Router / TanStack Start actually occur in 2026?
- Is there an official postmortem at `https://tanstack.com/blog/` or in the GitHub repo's security advisories?
- What was the date of the incident, what was the date of the all-clear, and what was the scope (which packages, which versions)?
- As of today, is the project considered safe to install at current latest versions?

**Why it matters:** the orchestrator is choosing between TanStack Router and React Router 7 for Block 3 M2 (frontend scaffold). A real, confirmed supply-chain incident weighs heavily against TanStack Router unless the postmortem demonstrably resolved it.

---

## Claim 5 — FastAPI Users in maintenance mode

> The prior researcher stated that **"FastAPI Users project is in maintenance mode"** as a reason to reject it as the auth library and instead recommended a first-party DB-backed session implementation with `argon2-cffi`.

**Verify:**

- What is the current activity level of the `fastapi-users` project on GitHub and PyPI as of mid-2026?
- Has the maintainer publicly declared maintenance mode, archived the project, transferred ownership, or otherwise signalled reduced commitment?
- What is the release cadence in the last 12 months?

**Why it matters:** the orchestrator is designing Block 3.5 (Auth + RBAC). If FastAPI Users is in maintenance mode, building a first-party session auth is justified. If it's active, FastAPI Users may be a reasonable shortcut.

---

## Claim 6 — Postgres 18 currency

> The prior researcher recommended **Postgres 18** for production.

**Verify:** what is the current Postgres major version per `https://www.postgresql.org/`? If Postgres 18 is the latest stable, confirm. If it's still 17 or earlier, refute. Either answer is fine; we just need to pin the right number.

---

## Required Output Format

For each of the six claims, in order:

```
### Claim N — <short label>

**Verdict:** CONFIRMED / REFUTED / UNCERTAIN

**Primary source:** <direct URL to the authoritative page>

**Evidence:** <one-or-two-sentence excerpt or paraphrase of the relevant fact, with date if available>

**Notes (optional):** <anything the orchestrator needs to act on beyond the verdict>
```

No prose intro, no executive summary, no closing paragraph. Six blocks, that's it.
