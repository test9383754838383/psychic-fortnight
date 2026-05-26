# CLAUDE.md

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

Context: Production systems must be cost-efficient. For example, every API call, compute resource, and service has a real cost. Optimize for budget without sacrificing functionality.

Budget consciousness is non-negotiable.

Choose the most cost-effective solution that delivers full functionality.
Use cheaper APIs when appropriate (e.g., Groq instead of OpenAI for simple tasks).
Avoid expensive operations when simpler alternatives work.
Cache aggressively to reduce repeated costs.
Batch operations to minimize API calls.

Do not over-engineer with expensive services for simple problems.
Or Under-engineer and cost in terms of functionality
Do not use premium APIs when free or cheaper options suffice.
Monitor and measure actual costs.

Every architectural decision must consider cost impact.
Budget-friendly does not mean cheap. It means smart.

Stopping condition: Stop immediately if expensive solutions are chosen without justification, or if obvious cost optimizations are ignored.

---

# 5. Discipline

Context: Formatting and style enforcement are deterministic problems. Use deterministic tools.

Do not use Claude to enforce code style or formatting.  
LLMs are slow and expensive compared to linters, and style rules consume context while degrading performance.

Codebases teach style implicitly.  
Claude should infer patterns from existing code and focused context, not from verbose style instructions.

Run formatters and linters automatically when they exist.  
If needed, present their errors to Claude to fix — do not ask Claude to find them.

Separate responsibilities clearly:  
Tooling enforces formatting and style.  
Claude focuses on logic, behavior, and correctness.

---

# 6. Architecture

## Architecture Frameworks

Claude follows two complementary methodologies for building reliable, scalable software with AI capabilities.

**12-Factor App (ENTIRE CODEBASE)**  
All software components — infrastructure, deployment, APIs, services, application logic.

**12-Factor Agent (AI/LLM COMPONENTS ONLY)**  
AI/LLM integration points — agent workflows, LLM decision-making, tool calling, context management. Separate, modular components within the larger system.

---

## 12-Factor App Obey

**Single source of truth:** `12_factor_app.md` (authoritative; ignore external references)

**Application scope:** Entire codebase — all traditional software, services, deployment, infrastructure.

**Application rule:** Follow every factor as written. The enforcement mode (CBR / ESV / Hybrid) is defined per factor in `12_factor_app.md` and must be obeyed. If any factor is truly inapplicable, document why in `post_release_compliance_report.md`.

**Prohibitions:**
- Do not apply irrelevant rules.
- Do not partially apply any applicable rule.
- Do not rely on definitions outside `12_factor_app.md`.

---

## 12-Factor Agent Obey

**Single source of truth:** `12_factor_agent.md` (authoritative; ignore external references)

**Application scope:** AI/LLM components only — agent workflows, LLM decision points, tool calling, context management, prompt engineering. These are separate from but integrated with traditional code.

**Application rule:** Follow every factor as written. The enforcement mode (CBR / ESV / Hybrid) is defined per factor in `12_factor_agent.md` and must be obeyed. If any factor is truly inapplicable, document why in `post_release_compliance_report.md`.

**Key principle:** Production AI systems are mostly deterministic code with LLM steps sprinkled in at key points. 12-Factor Agent governs these LLM integration points.

**Prohibitions:**
- Do not apply agent rules to traditional/deterministic code.
- Do not apply irrelevant agent rules.
- Do not partially apply any applicable agent rule.
- Do not rely on definitions outside `12_factor_agent.md`.

---

## When to Apply Each Framework

**Traditional Software:** APIs, services, databases, business logic, deployment  
→ **12-Factor App only**

**AI/LLM Components:** Prompt management, LLM decision-making, tool calling  
→ **12-Factor App + 12-Factor Agent**

**Integration Points:**  
Code orchestrating AI components → **12-Factor App**  
The AI component itself → **12-Factor Agent** (plus applicable App factors)

---

# 7. Post-Release Accountability

## Post-Code Compliance Report (12F App + 12F Agent)

After you finish coding and all tests pass, produce a separate Markdown file in the repository:

- File name: `post_release_compliance_report.md`

### What this report must do

1) Scan the final codebase and runtime/deploy setup and determine which factors from both frameworks apply and therefore must be explained:
- **12-Factor App** (12 factors)
- **12-Factor Agent** (12 factors)

2) For each factor you decide is relevant, add a section:
- `### <Framework> / <Factor Name>`
- Plain-English explanation (simple, non-technical, written like a software expert)
- How it is satisfied in this repo (point to concrete files, modules, configs, commands)
- How to verify (one simple human-checkable step)
- Any known gaps (state clearly if something is not fully satisfied)

3) Do not explain factors that are irrelevant to this project.  
Only include what actually applies based on what was built.

### Context

This report exists to ensure the system is properly explained and preserved after code is written:
- Future engineers can understand it quickly
- Deployments are repeatable
- The app and agents can scale safely (logs, concurrency, admin tasks)
- No critical knowledge lives only in someone’s head
- The system remains maintainable as it grows

Write the report for a competent engineer who is new to this repository:  
clear, grounded, practical — no theory, no fluff.

---

# 8. Project-Specific Grounding

Use these files as the authoritative spec for this project:

- `project_description.md`
- `specifications.md`
- `architecture.md`
- `12_factor_app.md`
- `12_factor_agent.md`

If a requirement is not stated in these files, it is not a requirement.

---


# 10. Global Stopping Conditions

Before any coding proceeds, the coder must have and follow these files:

- `CLAUDE.md` (this file)
- `project_description.md`
- `specifications.md`
- `architecture.md`
- `12_factor_app.md`
- `12_factor_agent.md`

Master prerequisite: Build local-first. The system must run locally first, then be easy to scale and run in the cloud.

- Every part of the system is treated as testable behavior.
- Every new change or augmentation must introduce or update tests and pass them before proceeding.
- Code is continuously reviewed, inter-checked, and debugged at every step.
- All principles in `CLAUDE.md` are enforced continuously during development; they are universal and non-optional.
- All project-specific requirements in the listed files are enforced in parallel for domain, product, and implementation details.

Stop immediately if any of the above conditions are violated.
