# ADR-0012 — Per-Block Four-Doc Spec Workflow

**Status:** Accepted — 2026-05-27

## Context

A modular monolith built block-by-block needs a repeatable specification ritual. Without one, blocks ship with implicit assumptions, ADR-worthy decisions buried in commit messages, and runbooks that are written (or not) after the fact.

A reusable toolkit existed at `spec_creation/` driving a four-stage workflow: clarification gate → external deep research → founder review → four output docs. It produced Block 2's specs successfully but treated each block as a "fresh project," which is the wrong frame after the stack is locked.

## Decision

Every block ships **five documents** in `docs/<module>/` before it is considered "done":

1. `project_description.md` — what this block is, why, scope boundaries, success criteria, constraints.
2. `architecture.md` — system overview, layers, core flow, data model, auth posture, async/streaming, learning loop. Cites ADRs.
3. `specifications.md` — tech stack used by this block (mostly references to ADRs), API surface, D-entries (tunable values), rejected alternatives, risks & open decisions.
4. `plan.md` — terminal-by-terminal milestone prompts. M0 coordinator + 1–3 milestone terminals. Never more.
5. `runbook.md` — written when the block is complete: how to operate it, common failure modes, debugging recipes.

Block specs are drafted with founder approval between each document. Once approved, they become the contract the coding terminals work against.

## Consequences

- Every block becomes auditable in isolation.
- ADRs stay structural; per-block D-entries stay tunable. No conflation.
- The 1–3 milestone cap (per `spec_creation/templates/plan.template.md`) prevents context-loss death-spirals across many fresh terminals.
- The `spec_creation/` toolkit remains the *generator* for these docs but is not the canonical home for them — `docs/<module>/` is.
- A block without a runbook is not "done," regardless of green tests.
