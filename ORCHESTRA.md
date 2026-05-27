# ORCHESTRA — ERP Operations

Living memory for the conductor of this project. Updated as rules are locked.
Authoritative for *how we work*. For *what we build* see `outputs/` and `technical_principles/`.

---

## 0. Identity & Mission

Product name: **Vessel & Voyage Operations Control System** — a production-grade, enterprise-ready ERP for the Operations department of a ship management company.

Bar: **MLP (Minimum Lovable Product)** — not MVP, not full product. All *important* features in. No *possible-but-not-important* features.

Target user: the **shore-based operator** running the day.

---

## 1. The Three Hats (worn simultaneously, every decision)

Every recommendation, scoping call, architecture choice, and document draft must pass all three lenses:

1. **Senior ERP software engineer** — production-grade enterprise rigor. 12-Factor App + Agent. TDD. Simplicity. Budget-aware.
2. **Experienced shipmanagement operator** — fluent in operator pain: vessel ops, voyage, port calls, charter party reality, noon reports, shore-vs-vessel friction. Speak from the work, not from theory.
3. **MLP zealot** — if a feature isn't both *important* AND *lovable*, cut it.

Fail any lens → reject or revise.

---

## 2. Architecture Rules (locked)

- **Modular monolith.** Greenfield. One codebase, one DB, one deploy. Clean module boundaries inside.
- **No microservices.** Not now, possibly never. Splitability is a property of clean modules, not a deployment decision.
- **Local-first, then cloud-scalable.** Runs on a laptop before it runs in a cluster.
- **12-Factor App** governs the whole codebase. **12-Factor Agent** governs only LLM integration points (if any).

---

## 3. Scope & Reference Strategy (locked)

- **OSS ERP reference** = scope inventory only. Defines the *width* of the MLP (which modules exist).
- **OSS reference is NOT a build template.** Its data models serve generic businesses, not shipmanagement Ops. Copying field-for-field will bloat the MLP.
- **Operator value defines the *depth*** of each module — what fields, what flows, what screens.

---

## 4. Build Order (locked)

**Highest-dependency module first, topologically respected.** No rework of foundations.

**Critical refinement — each module is built only thick enough to feed the modules above it.** Defer every field, flow, or screen the higher modules don't yet demand. Loop back and thicken only when a real workflow asks for it.

Anti-pattern: building each module "completely" before moving up the stack → that's a full product wearing MLP clothing.

---

## 5. Engineering Discipline (from `CLAUDE.md`, non-negotiable)

1. **Simplicity** — fewest assumptions, fewest concepts. Delete-first. No future-proofing.
2. **TDD** — every line of production code answers a failing test. Behavior, not implementation.
3. **Functionality** — fully working > minimally written. MLP is lovable because it *works*.
4. **Budget** — cheapest path that delivers full functionality. Cache. Batch. No premium APIs for simple jobs.
5. **Discipline** — formatters/linters enforce style; Claude focuses on logic.

No mocks/fakes/demo tests. Integration tests against real DB only.

---

## 6. Workflow Gates (from `workflow/master_workflow.md`)

Stop-and-review at every gate. User has final authority.

1. Intake (project description + step-by-step workflow)
2. Clarification Gate A
3. **Prompt A drafted & saved** ← gate · push
4. External research A → ingest → lock baseline repo
5. Clarification Gate B
6. **Prompt B drafted & saved** ← gate · push
7. External research B → ingest → lock stack
8. Generate 4 outputs sequentially, each its own gate · push:
   - `outputs/project_description.md`
   - `outputs/architecture.md`
   - `outputs/specifications.md`
   - `outputs/plan.md`
9. Final consistency pass

---

## 7. Repository & Push Policy

- Working repo: `ERP_Operations/` (separate git from the umbrella `Product/` repo).
- Remote: `origin` → `github.com/test9383754838383/psychic-fortnight`.
- Default branch: `main`.
- **Push after every approved gate.** Not after every edit.

---

## 8. Post-Release Accountability

After build + green tests, produce `post_release_compliance_report.md` covering only the 12-Factor App and 12-Factor Agent factors that actually apply to this build. No theory. Concrete file/config pointers and one-step verification per factor.

---

## 9. V1 Reference

Detailed V1 scope, build blocks, accepted field sets, and scope boundaries now live in [`V1_ROADMAP.md`](V1_ROADMAP.md).

`ORCHESTRA.md` keeps the durable working rules and the high-level roadmap. `V1_ROADMAP.md` carries the clean sequential V1 build memory.

---

## 10. Product Roadmap

### V1 — MLP
See [`V1_ROADMAP.md`](V1_ROADMAP.md) for the locked V1 scope and the 11 build blocks. Thin everywhere. Shore-side only.

### V2 — Operator depth (unlock DEFERs)
`Onboard` (lightweight vessel submission) · `Fleet Map` · `Port Schedule` · `Berth Schedule` · `Cargo Handling` (thin: BL refs, loaded/discharged qty) · `Tank Conditions` (tanker fleets) · `Voyage Bunkers` planning · `Port DA` full lifecycle · `Pre-arr/Pre-dep checklists` enriched.

### V3 — Adjacent operator concerns
`HSEQ events register` (near-miss, incident, NCR) · `Crew change coordination` (port-level handoff with crewing dept) · `Drydock / off-hire planning` · `Charterer/Owner auto-reporting distribution` · `CP warranty monitoring` (speed + consumption vs CP) · `Statement of Facts` auto-generation from Port Activities.

### V4 — Commercial bridge (shipmanagement-side prep only, not a chartering desk)
`Off-hire calculation + reporting` · `Laytime statement support` · `Port Expense rebill prep` (export to commercial/accounting) · `Demurrage time-bar tracker`.

### V5 — Platform / integrations
`AIS feed` (auto-position) · `Weather routing API` · `Email/agent-report parser` · Inbound bridges to `Veson IMOS / DanaOS / ShipNet` · Open API for owner portals.

### Never (out-of-roadmap)
Full chartering desk (TCE, Deviation, fixture mgmt) · `Claims` (separate dept) · Accounting GL · Procurement / PMS (separate products).

---

## 11. Open Items / Pending Locks

- [ ] Stack (Prompt B lock)
- [ ] Auth model (single-tenant vs multi-vessel-pool tenancy)
- [x] Forms ingest channel — **email-to-form parsing primary; UI manual entry fallback** (locked Block 7)
- [ ] Persistence engine (decided in Prompt B)

---

## Changelog

- 2026-05-26 — Orchestra created. Locked: three hats, modular monolith, OSS-as-inventory, dependency-first with thin-foundations refinement, push-per-gate to psychic-fortnight.
- 2026-05-26 — Scope locked for Release 1 MLP. Product named *Vessel & Voyage Operations Control System*. IMOS adopted as reference inventory with shipmanagement-Ops cuts and gap-adds.
- 2026-05-26 — Product roadmap V1–V5 + never-list locked.
- 2026-05-26 — V1 build memory separated out of `ORCHESTRA.md` into `V1_ROADMAP.md` so the orchestra file stays focused on durable project rules and roadmap.
