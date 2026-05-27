# 12-Factor App — AI Enforcement Specification

This document defines **non-negotiable operational rules** for building and modifying software systems according to the **12-Factor App methodology**.

You must follow each factor **exactly**.  
You must stop when the stopping condition is met.  
You must not continue, embellish, or refactor beyond compliance.

---

## Enforcement Modes (Critical Distinction)

Not all factors are enforced the same way. You must operate in **two distinct modes**:

### Mode A — Continuous Build Rules (CBR)
These are enforced **every time you write or change code**.  
They shape how you build continuously.  
Violation = you must correct immediately before proceeding.

### Mode B — End-State Verification Rules (ESV)
These are enforced as **final correctness checks**:
- before a release
- before declaring the work “done”
- when auditing the system for compliance

Violation = you must fix, but these are typically discovered by review/testing/deploy.

### Mode C — Hybrid (CBR + ESV)
Some factors must be enforced **during development** and also **verified at the end**.

**Rule:** Each factor below declares its enforcement mode. You must obey it.

---

## 1. Codebase

### Enforcement Mode
**ESV** (end-state structural truth)

### Principle
Maintain exactly **one codebase** per application, tracked in version control.

### Context
You are operating in a production system where every environment (dev, staging, prod) is a deployment of the **same codebase**.  
You must assume that multiple repositories for the same app indicate architectural failure.

### Example
- One Git repository deployed to multiple environments.
- Different branches/commits allowed.
- Separate repositories for the same app are not allowed.

### Stopping Condition
Stop when:
- There is exactly one repository for the application.
- All environments deploy from that repository.

---

## 2. Dependencies

### Enforcement Mode
**CBR + ESV** (must be maintained continuously, verified clean-build)

### Principle
Explicitly declare and isolate **all dependencies**.

### Context
You are building systems that must be reproducible from scratch.  
You must assume that any undeclared dependency will break deployment.

### Example
- `package.json`, `requirements.txt`, `go.mod` fully declare dependencies.
- No reliance on system-installed packages.

### Stopping Condition
Stop when:
- Every dependency is declared.
- The app can be built on a clean machine/container without manual installs.

---

## 3. Config

### Enforcement Mode
**CBR + ESV** (continuous discipline, end-state scan)

### Principle
Store **all configuration in environment variables**, never in code.

### Context
You are deploying the same code to multiple environments.  
You must treat configuration as volatile and external.

### Example
- Database URLs, API keys, feature flags in environment variables.
- No environment-specific values in source code.

### Stopping Condition
Stop when:
- No config values are hard-coded.
- All environment-specific values are injected at runtime.

---

## 4. Backing Services

### Enforcement Mode
**CBR + ESV** (design rule + end-state swap-ability)

### Principle
Treat backing services as **attached resources** accessed via configuration.

### Context
You are operating in an environment where services can be swapped without code changes.  
You must assume services are disposable.

### Example
- Databases, queues, caches referenced via env vars.
- Switching services requires no code modification.

### Stopping Condition
Stop when:
- All backing services are referenced only through configuration.
- A service endpoint change does not require code changes.

---

## 5. Build, Release, Run

### Enforcement Mode
**ESV** (pipeline correctness)

### Principle
Strictly separate **build**, **release**, and **run** stages.

### Context
You are controlling a deterministic deployment lifecycle.  
You must prevent runtime mutation of builds.

### Example
- Build produces immutable artifact.
- Release combines artifact with config.
- Run executes the release.

### Stopping Condition
Stop when:
- Build artifacts are immutable.
- Config changes do not trigger rebuilds.
- Release identifiers are traceable.

---

## 6. Processes

### Enforcement Mode
**CBR + ESV** (architecture rule + end-state stateless verification)

### Principle
Execute the app as **stateless processes**.

### Context
You are designing for horizontal scaling and crash recovery.  
You must assume processes can die at any time.

### Example
- Session data stored in databases/caches.
- No in-memory state required between requests.

### Stopping Condition
Stop when:
- No request depends on in-process state.
- Restarting an instance does not break correctness.

---

## 7. Port Binding

### Enforcement Mode
**CBR + ESV** (implementation habit + deployment verification)

### Principle
Export services via **port binding**.

### Context
You are building a self-contained service.  
You must not rely on external servers injecting your app.

### Example
- App listens on a port defined by the environment.
- The app boots and serves directly.

### Stopping Condition
Stop when:
- The app is reachable via its own bound port.
- Port is configurable via environment.

---

## 8. Concurrency

### Enforcement Mode
**CBR** (continuous scaling posture)

### Principle
Scale out via the **process model**.

### Context
You are scaling capacity through replication, not complexity.  
You must structure work into process types (web, worker, scheduler) where needed.

### Example
- Multiple worker processes handling jobs.
- Independent stateless instances.

### Stopping Condition
Stop when:
- Scaling strategy is “add processes,” not “add complexity.”
- Process types are defined where required.

---

## 9. Disposability

### Enforcement Mode
**CBR + ESV** (continuous termination-safety, verified under signals)

### Principle
Maximize robustness with **fast startup and graceful shutdown**.

### Context
You are operating in failure-prone environments.  
You must expect restarts, rolling deploys, and termination signals.

### Example
- Quick boot.
- SIGTERM handled correctly.
- No long shutdown blocking.

### Stopping Condition
Stop when:
- Startup is fast enough for rapid scaling/replace.
- Shutdown is graceful under termination signals.

---

## 10. Dev / Prod Parity

### Enforcement Mode
**ESV** (end-state environment parity audit)

### Principle
Keep development, staging, and production **as similar as possible**.

### Context
You are preventing environment-specific bugs.  
You must assume drift causes failures that tests won’t catch.

### Example
- Same backing service types across environments.
- Minimal differences beyond credentials and endpoints.

### Stopping Condition
Stop when:
- Differences between environments are configuration-only.
- Local/staging/prod run materially the same stack.

---

## 11. Logs

### Enforcement Mode
**CBR + ESV** (continuous logging style, end-state no-file guarantee)

### Principle
Treat logs as **event streams**.

### Context
You are building systems where logs are consumed externally.  
You must not manage log storage yourself.

### Example
- Logs written to stdout/stderr.
- Aggregation handled by platform.

### Stopping Condition
Stop when:
- The app does not write logs to files.
- Logs are stream-based only.

---

## 12. Admin Processes

### Enforcement Mode
**ESV** (end-state operational integrity)

### Principle
Run admin tasks as **one-off processes** in the same environment.

### Context
You are executing maintenance tasks under production conditions.  
You must not create special execution paths or “admin-only environments.”

### Example
- Migrations run using the same codebase and config.
- One-off scripts run against the same release.

### Stopping Condition
Stop when:
- Admin tasks execute using the same release + configuration as the app.
- No separate dependency/runtime path exists for admin work.

---

# END OF ENFORCEMENT SPEC