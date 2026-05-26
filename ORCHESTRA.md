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

## 9. Scope Lock — Release 1 (MLP)

**Reference inventory:** IMOS (Veson) Operations module set at `Product/Project_creator_agent/Operations/`. Treated as scope-width reference only. IMOS is commercial-operator–biased; shipmanagement-Ops cuts and gaps applied below.

### Release 1 surfaces (product framing)

1. **`Vessel Schedule`** — home screen. Fleet Gantt of active/upcoming voyages and what needs operator attention.
2. **`Voyage Workspace`** — operational control room for a single voyage: itinerary, instructions, contacts, notes, operational events, delays. Commercial/financial sections stripped.
3. **`Forms + Tasks + Alerts` cluster** — trusted-reporting & action loop: vessel/agent reports received → checked → accepted; operator action queue; exceptions surface.
4. **`Port Call Detail`** — arrival/departure execution, agent status, readiness, port events.

### Build order (data-first, views last)

```
Vessel · Port · Counterparty      (L0 master data)
  → CharterParty (thin header)    (L1 contractual anchor)
    → Voyage                      (L2 spine)
      → Port Call                 (L3 execution)
        → Forms · Tasks · Alerts  (L3 trust+action loop)
          → Vessel Schedule       (L4 projection — empty shell scaffolded early)
```

Each level built only thick enough to feed the level above. No depth without a higher-level demand.

### Voyage creation

V1: **manual entry only.** No import, no chartering module, no external feed. Operator owns the data from day one.

### Thin-foundation field sets (the only fields in the first cut)

- **Vessel**: code, name, IMO, type, owner ref, technical manager ref *(optional — only if used by alerts/contacts)*, ops manager (user ref), status (Active/Inactive), active-for-reporting flag *(can merge with status)*.
- **Port**: name, UNLOCODE, country *(derived/validated from UNLOCODE — not free text)*, timezone, latitude, longitude, distance-table reference, status (Active/Inactive).
- **Counterparty**: code/short name, name, status (Active/Inactive), contacts[]. Roles via **CounterpartyRole** join (multi-role, not single field): Owner / Charterer / Agent / Supplier / TechnicalManager. Agent role adds: ports-serviced[], nomination contact email. Do NOT split into separate entities.
- **VoyageOperatingTerms** *(reference field on Voyage, not a separate entity)*: charterer name, CP type (CVC/TC/VC), CP date. No CP logic owned.
- **Voyage**: voyage no., vessel ref, charterer ref, VoyageOperatingTerms, status (Planned/Active/Closed), itinerary (ordered Port refs + ETAs), start date, expected end date, voyage instructions (text or file ref).
- **PortCall**: voyage ref, port ref, ETA, ETD, status, agent appointment ref.
- **AgentAppointment**: port call ref, agent (Counterparty ref), appointed date, confirmation status.
- **PortActivity / OperationalEvent**: port call ref, event type, timestamp, recorded by (User ref).
- **OperationalReport**: voyage ref or port call ref, report type, submitted by, submitted at, status (Pending/Accepted/Rejected), raw content ref.
- **BunkerRequest**: voyage ref, fuel type, quantity required, status (Raised/In Progress/Supplied/Blocked), raised by (User ref).
- **Delay**: voyage ref, leg ref, delay type, start, end, description.
- **Task**: linked entity (Voyage/PortCall/Vessel), assigned to (User ref), due date, status (Open/Done).
- **Alert**: linked entity, type, triggered at, resolved at, resolved by (User ref).
- **AuditEvent**: entity type, entity id, action, actor (User ref), timestamp, diff snapshot.
- **User**: name, email, role, assigned vessels.

### IN-MLP (Release 1)

`Vessel` · `Port` · `Counterparty` · `CharterParty (thin)` · `Voyage` (Summary, Properties, Contacts, Notes, Instructions) · `Port Call` · `Port Activities` · `Activity Log` · `Activity Reports` (+ Extra Info) · `Forms` (Forms list + Details-Forms) · `Vessel Schedule` (home) · `Bunker Requirement` (trimmed: request + status + blocker only — **not** full bunker mgmt) · `Delay` · `Leg Delays/Events` · `Alert List` · `Task List`.

### DEFER (post-MLP)

`Onboard` (entire vessel-side app) · `Berth Schedule` · `Port Schedule` · `Fleet Map` (secondary view) · `Voyage P&L` + snapshots + calc options · `Port Expense` (full DA lifecycle) · `Rebill Management` · `Berth Management` · `Cargo Handling` deep panels · `Tank Conditions` · `Reverting Port Activities` · `Voyage Bunkers` planning · `Map-Forms`.

### OUT (not for this product)

`Claims` (entire module — Claim, Claim Invoice, Commissions, Types, Subtypes, Laytime Claim Types) · `Deviation Estimate / Analysis / TCE` · `CP Quantity Details` · `Bunker Price` workarounds · full **Bunker management / procurement** · IMOS troubleshooting notes · Onboard installation / training docs.

### Shipmanagement-Ops gaps to add (not in IMOS)

- Vessel registry with owner/technical-manager relationship + HSEQ class.
- CharterParty header (already added above).
- Voyage instructions **issuing** workflow (shipmanagement issues, not only receives).
- Owner/Charterer communication log (daily report distribution).
- Noon report / daily report ingestion (folded into Forms cluster).
- Port DA stub record (logged only; full lifecycle deferred).
- Pre-arrival / Pre-departure checklists (HSEQ-adjacent).

### Anchor workflow (first lovable artifact)

Operator opens `Vessel Schedule` → sees fleet voyages on a Gantt → clicks a voyage → enters `Voyage Workspace` → reads/edits voyage instructions → drills into a `Port Call`.

---

## 10. Product Roadmap

### V1 — MLP (locked, see Section 9)
`Vessel · Port · Counterparty · CharterParty · Voyage · Port Call · Forms · Tasks · Alerts · Vessel Schedule`. Thin everywhere. Shore-side only.

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
- [ ] Forms ingest channel (email / API / file drop)
- [ ] Persistence engine (decided in Prompt B)

---

## Changelog

- 2026-05-26 — Orchestra created. Locked: three hats, modular monolith, OSS-as-inventory, dependency-first with thin-foundations refinement, push-per-gate to psychic-fortnight.
- 2026-05-26 — Scope locked for Release 1 MLP. Product named *Vessel & Voyage Operations Control System*. IMOS adopted as reference inventory with shipmanagement-Ops cuts and gap-adds. Four Release-1 surfaces + entity build order + thin-foundation field sets + IN/DEFER/OUT tables recorded.
- 2026-05-26 — Product roadmap V1–V5 + never-list locked.
- 2026-05-26 — V1 data model completed: full entity list named, CharterParty demoted to VoyageOperatingTerms reference field, voyage creation locked as manual.
- 2026-05-26 — Block 2 (Master Data) verified against Veson IMOS docs, BIMCO/FONASBA, IMO, UN/LOCODE. APPROVED WITH CHANGES: Vessel adds code/status/active-for-reporting; Port adds lat/lon/distance-ref/status, country derived from UNLOCODE; Counterparty restructured to multi-role via CounterpartyRole join table.
