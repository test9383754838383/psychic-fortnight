# [Project Name] — Terminal Prompts

**Total terminals:** M0 + 1–3 milestone terminals (right-sized to scope).
M0 is the coordinator — no code, stays open the whole time.
M1–M[N] are each a fresh coding terminal, one per milestone.
Working directory for all terminals: `[repo-name]/` (CLAUDE.md auto-loads).

---

## Milestone Count Rule (HARD)

This template ships **1–3 milestones after M0**, never more. Empirical reasoning:

- A fresh terminal loses prior-terminal context. Each handoff is a tax.
- 7–8 small milestones means 7–8 cold starts. Drift accumulates, decisions get re-litigated, the whole block crawls.
- 1–3 milestones force each terminal to own a meaningful chunk of work end-to-end, which is also how a senior engineer would scope it.

**Picking the right N for a block:**

- **1 milestone** — small, single-concern block (e.g., one entity, one endpoint, one ETL job). The whole thing fits in one focused coding session.
- **2 milestones** — typical foundational or multi-entity block. One milestone establishes the scaffold + reference vertical slice; the second replicates the pattern across the remaining surfaces.
- **3 milestones** — heaviest blocks only. One scaffolds, one builds the core, one hardens (CI gates, performance, edge cases). Reserve for genuinely complex blocks. If you're reaching for 3, double-check you're not just artificially splitting.

When in doubt, fewer is better.

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator. You do not write code. Your only job is to guide me through building this block one milestone at a time.

Read outputs/project_description.md, outputs/architecture.md, outputs/specifications.md, and outputs/plan.md now. These are the full spec and your coordination map.

When you are ready, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1–M[N] in sequence:
- Tell me which milestone is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then move to the next milestone

If I report a problem or blocker in any terminal, help me diagnose it. Do not move forward until the current milestone's done condition is fully met.

TDD rule for every milestone: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Do not write code. Do not suggest code. Coordinate only.
```

---

## M1 — [Milestone Name]

```
Read outputs/project_description.md, outputs/architecture.md, outputs/specifications.md, and outputs/plan.md.

[State what prior work exists or that this is the first milestone of the block.]

Implement M1 — [Milestone Name]:
[List exactly what to build — files, modules, endpoints, schemas, test suites. Be generous with scope; this milestone owns a meaningful chunk end-to-end.]

TDD: write test first (RED) → minimum code to pass (GREEN) → refactor only if clearly needed.
[State what the tests must cover.]

Done when:
- [Condition 1]
- [Condition 2]
- [Condition 3]
- mypy --strict, ruff, and tach all pass

Ask me before making any decision not covered by the specs.
```

---

## M2+ — [Milestone Name]  (optional — include only if N ≥ 2)

```
Read outputs/project_description.md, outputs/architecture.md, outputs/specifications.md, and outputs/plan.md.

[State what prior milestones are complete and what now exists in the codebase.]

Implement M[N] — [Milestone Name]:
[List exactly what to build. Reuse the patterns proven in earlier milestones.]

TDD: write test first (RED) → minimum code to pass (GREEN) → refactor only if clearly needed.
[State what the tests must cover.]

Done when:
- [Condition 1]
- [Condition 2]
- mypy --strict, ruff, and tach all pass

Ask me before making any decision not covered by the specs.
```
