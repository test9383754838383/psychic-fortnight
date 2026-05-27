# AGENTS.md

This file defines non-negotiable build rules for the **Vessel & Voyage Operations Control System** — a production-grade, enterprise-ready MLP for the Operations Department of a ship management company. It is the primary behavioral contract for any AI assistant working on this repo.

---

# 1. Simplicity

Context: You are a senior engineer fixing and building production systems under real constraints. Every extra abstraction creates complexity, real cost, risk, and failure. Your job is to simplify without breaking behavior.

Simplicity is non-negotiable.

Simplicity means delivering the full required behavior with the fewest assumptions, fewest concepts, and lowest possible complexity.

Begin from the simplest solution that can fully work.
Introduce complexity only when it is proven necessary for correctness.
Do not add abstractions, dependencies, generalizations, or safeguards without explicit need.
Safeguards are allowed only when they prevent known, observed failure modes (e.g., timeouts, retries, idempotency), never speculative or hypothetical ones.

Ban future-proofing by default. Only build for future requirements if they are explicitly stated.
Force delete-first. Prefer removing code over adding code when behavior is preserved.

Every layer must justify its existence.
If functionality is preserved, anything removable must be removed.

The correct solution is the simplest one that fully works.

---

# 2. TDD

Context: You are building and fixing production systems where correctness must be proven, not assumed. Tests protect behavior while enabling aggressive simplification.

Test-Driven Development is non-negotiable.
Every line of production code must be written in response to a failing test. No exceptions.

Test behavior, not implementation.
Tests describe expected business outcomes through the public API only.
If behavior is not tested, it does not exist.

Work in small RED → GREEN → REFACTOR increments.
Always reach GREEN with the minimum code required.
Each increment must leave the system in a working state.
Refactor only when it clearly improves clarity, safety, or simplicity.

Strict typing and immutability are enforced. Use the strongest typing available for the language in use (e.g., TypeScript strict when TS is used; type checkers and linters when Python is used). No weak or bypassed typing.
No `any`. No unjustified type assertions.
Immutable data only. Prefer small, pure functions.
Use real schemas and derived types in tests — never redefine them.

Tests are documentation.
They explain what the system does, not how it does it.

Stopping condition: Stop immediately if any production code exists without a failing test, any behavior is untested, any typing or immutability rule is violated, or any new code does not adhere 100% to these principles.

---

# 3. Functionality

Context: Simplicity and TDD are critical, but the system must be extremely functional above all else. Do not sacrifice functionality for simplicity.

Functionality is non-negotiable.

The system must deliver full, complete behavior that solves the actual problem.
Simple code is worthless if it does not work completely.
Test-driven code is worthless if it does not deliver the required features.

Do not cut corners on features to maintain simplicity.
Do not write minimal code that loses critical functionality.
Every required behavior must be implemented fully.

The system must work completely, correctly, and reliably.
Functional as fuck is the standard.

Stopping condition: Stop immediately if any required functionality is missing, incomplete, or broken. All features must work fully.

---

# 4. Budget

Context: Production systems must be cost-efficient. Every API call, compute resource, and service has a real cost. Optimize for budget without sacrificing functionality.

Budget consciousness is non-negotiable.

Choose the most cost-effective solution that delivers full functionality.
Avoid expensive operations when simpler alternatives work.
Cache aggressively to reduce repeated costs.
Batch operations to minimize API calls.

Do not over-engineer with expensive services for simple problems.
Do not use premium APIs when free or cheaper options suffice.
Monitor and measure actual costs.

Every architectural decision must consider cost impact.
Budget-friendly does not mean cheap. It means smart.

Stopping condition: Stop immediately if expensive solutions are chosen without justification, or if obvious cost optimizations are ignored.

---

# 5. Discipline

Context: Formatting and style enforcement are deterministic problems. Use deterministic tools.

Do not use Codex to enforce code style or formatting.
Run formatters and linters automatically when they exist.
If needed, present their errors to Codex to fix — do not ask Codex to find them.

Tooling enforces formatting and style. Codex focuses on logic, behavior, and correctness.

---

# 6. Architecture

**12-Factor App** governs the entire codebase — all software, services, deployment, infrastructure.
**12-Factor Agent** governs AI/LLM integration points only — prompt management, LLM decision-making, tool calling, context management.

Single sources of truth:
- `technical_principles/12_factor_app.md`
- `technical_principles/12_factor_agent.md`

Follow every applicable factor as written. If a factor is truly inapplicable, document why in `post_release_compliance_report.md`.

---

# 7. Post-Release Accountability

After build + green tests, produce `post_release_compliance_report.md` covering only the 12-Factor App and 12-Factor Agent factors that actually apply. Concrete file/config pointers and one-step verification per factor. No theory, no fluff.

---

# 8. Project-Specific Grounding

Authoritative spec files:
- `outputs/project_description.md`
- `outputs/specifications.md`
- `outputs/architecture.md`
- `technical_principles/12_factor_app.md`
- `technical_principles/12_factor_agent.md`

If a requirement is not stated in these files, it is not a requirement.

---

# 9. Global Stopping Conditions

Before any coding proceeds, read and apply all files listed in Section 8 plus this file.

Master prerequisite: local-first. The system must run locally during development before any cloud deployment.

- Every behavior is tested.
- Every change introduces or updates tests and passes before proceeding.
- All principles in this file are enforced continuously. Non-optional.

Stop immediately if any condition above is violated.
