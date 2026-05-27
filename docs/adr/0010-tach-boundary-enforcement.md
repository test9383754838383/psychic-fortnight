# ADR-0010 — Tach for Modular Monolith Boundary Enforcement

**Status:** Accepted — 2026-05-27

## Context

ADR-0001 commits to a modular monolith. Without tooling, "module boundaries" decay to convention, and convention loses to deadlines. By Block 5, a developer fixing a Port Call bug reaches into Voyage internals, and the monolith becomes a ball of mud.

Two enforcement tools considered in the Python ecosystem: `import-linter` (pure Python, slower, less ergonomic) and `tach` (Rust-backed, fast, interactive).

## Decision

**Tach** with `tach.toml` at the repo root. Every module declares its allowed dependencies; CI fails any PR that imports across a forbidden boundary or reaches into a module's private internals.

The Block 2 baseline:
- `src.modules.master_data` is the public surface other modules may import.
- `src.modules.master_data.repositories.*` and `src.modules.master_data.models.*` are private — cross-module imports forbidden.

## Consequences

- Boundary violations fail the build, not code review.
- Each new module added later must declare its dependencies in `tach.toml` or CI blocks the PR.
- Initial `tach.toml` is permissive (forbid only the obvious anti-patterns); tighten as patterns emerge. False positives are cheaper than the ball-of-mud they prevent.
- `import-linter` rejected — slower execution incompatible with frictionless TDD loops; no interactive dep-graph visualization.
- Tach is a build-time tool, not a runtime guard. It does not enforce data-access boundaries — that's the repository pattern's job.
- Frontend boundary discipline is a parallel concern handled by ESLint rules, not by Tach. Tracked separately in OPEN_DECISIONS.
