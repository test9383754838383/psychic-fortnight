# [Project Name] — Terminal Prompts

[N] terminals total. M0 is the coordinator — no code, stays open the whole time.
M1–M[N-1] are each a fresh coding terminal, one per milestone.
Working directory for all terminals: `[repo-name]/` (CLAUDE.md auto-loads).

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator. You do not write code. Your only job is to guide me through building this project one milestone at a time.

Read outputs/project_description.md, outputs/architecture.md, outputs/specifications.md, and outputs/plan.md now. These are the full spec and your coordination map.

When you are ready, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1–M[N-1] in sequence:
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

[State what prior milestones are complete and what now exists.]

Implement M1 — [Milestone Name]:
[List exactly what to build — files, functions, endpoints, schemas.]

TDD: write test first (RED) → minimum code to pass (GREEN) → refactor only if clearly needed.
[State what the tests must cover.]

Done when:
- [Condition 1]
- [Condition 2]
- mypy and ruff pass

Ask me before making any decision not covered by the specs.
```

---

## M2+ — [Milestone Name]

```
Read outputs/project_description.md, outputs/architecture.md, outputs/specifications.md, and outputs/plan.md.

[State what prior milestones are complete and what now exists.]

Implement M[N] — [Milestone Name]:
[List exactly what to build — files, functions, endpoints, schemas.]

TDD: write test first (RED) → minimum code to pass (GREEN) → refactor only if clearly needed.
[State what the tests must cover. Mock external dependencies (LLM, APIs) in all tests.]

Done when:
- [Condition 1]
- [Condition 2]
- mypy and ruff pass

Ask me before making any decision not covered by the specs.
```
