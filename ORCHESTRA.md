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

1. **`Vessel Schedule`** — home screen. Fleet Gantt of active/upcoming voyages. **Verified scope:** rows = active managed vessels; bars = voyages placed by commencing → expected_completing datetimes; bar text = voyage no./ref, status colour, current/next port code, ETA/ETD if commenced; tooltip = charterer, full port sequence, vessel, voyage status, last position; filters = date range, vessel(s), voyage status, voyage/reference search; click bar → Voyage Workspace; one tiny exception dot (open alert or overdue task — dormant until Block 10). Read-only Gantt (no drag-to-reschedule); timing edits in Voyage Workspace.
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

- **Vessel**: code, name, IMO, type, flag, owner ref, technical manager ref *(optional — only if used by alerts/contacts)*, ops manager (user ref), status (Active/Inactive), active-for-reporting flag *(can merge with status)*.
- **Port**: name, UNLOCODE, country *(derived/validated from UNLOCODE — not free text)*, timezone, latitude, longitude, distance-table reference, status (Active/Inactive).
- **Counterparty**: code/short name, name, status (Active/Inactive), contacts[]. Roles via **CounterpartyRole** join (multi-role, not single field): Owner / Charterer / Agent / Supplier / TechnicalManager. Agent role adds: ports-serviced[], nomination contact email. Do NOT split into separate entities.
- **VoyageOperatingTerms** *(reference field on Voyage, not a separate entity)*: charterer name, CP type (CVC/TC/VC), CP date, cp_document_ref (file attachment). No CP logic owned.
- **Voyage**: voyage no., vessel ref, charterer ref (optional), VoyageOperatingTerms, status (`Scheduled / Commenced / Completed / Closed / Cancelled`), commencing_datetime, expected_completing_datetime *(calculated from final itinerary ETD, manual override allowed)*, previous_voyage_ref (optional, for consecutive voyages), voyage_instructions (text or file ref), ops_notes.
- **ItineraryLine** *(ordered, lives under Voyage; planning fields only — execution fields belong to PortCall in Block 5)*: sequence_no, port_ref, port_function (Load/Discharge/Bunker/Canal/Transit/Repairs/Other), planned_eta, planned_etd.
- **PortCall** *(Block 5 verified)*: voyage_ref, port_ref, itinerary_line_ref; status (`Planned / Arrived at Pilot Station / At Anchor / Berthed / Cargo Ops Completed / Departed`); eta (actual/revised), etd (actual/revised), ata, atb, atd; timezone_offset; nor_tendered_datetime, nor_accepted_datetime; free_pratique_granted (bool + datetime), customs_cleared (bool + datetime); agent_appointment_ref; ops_notes.
- **AgentAppointment** *(Block 5 verified)*: port_call_ref, agent (Counterparty ref), appointed_date; status (`Nominated / Appointed / Cancelled`). "Replaced" is an event not a status — triggers a new record.
- **PortActivity / OperationalEvent** *(Block 6 verified)*: port_call_ref, event_type (controlled enum), timestamp, recorded_by (User ref), notes (optional). Event type enum: `Arrived / Anchored / Berthed / All Fast / Commenced Loading / Completed Loading / Commenced Discharging / Completed Discharging / Hoses Connected / Hoses Disconnected / Departed / NOR Tendered / NOR Re-tendered / NOR Accepted / Free Pratique Granted / Tugs Engaged / Tugs Released / Bunkering Commenced / Bunkering Completed / Delay Commenced / Delay Ended`. *(Pilot On Board / Pilot Away removed — disbursement scope.)*
- **ActivityLog** *(NEW — Block 6 verified)*: port_call_ref, logged_at, logged_by (User ref), narrative (free text). Separate from structured PortActivity; carries Master/agent contextual remarks for dispute defence.
- **OperationalReport** *(Block 6 verified)*: voyage_ref or port_call_ref; report_type (`Noon / Arrival / Departure / Bunkering / Statement of Facts`); submitted_by, submitted_at, received_at; status (`Pending / Queried / Accepted / Rejected`); structured fields: position_lat, position_lon, speed_24h, distance_to_go, eta_next_port, bunker_rob; raw_content_ref (retained for audit).
- **Form** *(Block 7 verified)*: form_id, form_type, linked_entity (Voyage or PortCall ref), submitted_by, submitted_at, received_at; status (`Received / Under Review / Queried / Accepted / Rejected`); assigned_to (User ref), reviewed_by, reviewed_at, notes. Primary ingest channel: **email-to-form parsing**; UI manual entry as fallback.
- **FormDetail** *(Block 7 verified)*: form_ref; raw_fields (JSON blob — secondary/compliance data); raw_source_ref (original file). Structured typed fields live on OperationalReport only — not duplicated here.
- **Checklist** *(NEW — Block 7 verified)*: port_call_ref, checklist_type (`Pre-Arrival / Pre-Departure`), created_at, status (`Open / Completed`). Separate from Form — requires ordered per-item sign-off.
- **ChecklistItem** *(NEW — Block 7 verified)*: checklist_ref, sequence_no, item_name, status (`Pending / Signed Off`), signed_off_at, signed_off_by (User ref).
- **BunkerRequest** *(Block 8 verified)*: voyage_ref, port_call_ref (optional); fuel_type (`HFO / VLSFO / MGO / LSMGO / HSFO / ULSD / LNG / Biofuel`); quantity_required_mt, specification_grade (ISO 8217), max_sulphur_content; status (`Raised / In Progress / Stemmed / Supplied / Blocked`); blocker_note, raised_by (User ref), raised_at; supplier_ref (Counterparty ref, optional), eta_supply. *(delivered_volume_cbm / delivered_temperature deferred to V2 — supply validation is post-MLP.)*
- **Delay** *(Block 9 verified)*: voyage_ref; port_call_ref (optional — port delays) or leg_ref (optional — sea-passage delays; mutually exclusive); delay_type (`Weather / Mechanical / Port Congestion / Awaiting Berth / Awaiting Orders / Cargo Operations / Bunkering Delay / Strike / Deviation / Piracy/Security / Quarantine/Disease / Other`); fault_attribution (`Vessel / Charterer / Port / Weather / Force Majeure`); start_datetime, end_datetime; actual_duration (derived); claimed_duration (manual — commercial dispute); description; recorded_by (User ref); approved_by (User ref — locks record on set).
- **Task** *(Block 10 verified)*: task_id, linked_entity_type (Voyage/PortCall/Vessel), linked_entity_id; title, description (optional); assigned_to (User ref), due_datetime; status (`Open / In Progress / Blocked / Done`); originating_alert_ref (optional — manual escalation only, never auto-generated); created_by, created_at, completed_at.
- **Alert** *(Block 10 verified)*: alert_id, linked_entity_type, linked_entity_id; alert_type (`ETA Overdue / Departure Overdue / NOR Not Tendered / Agent Not Confirmed / Form Not Received / Bunker Request Blocked / Voyage Not Commenced / Performance Deviation / Consumption Deviation / Noon Report Missing`); triggered_at, message; severity (`Info / Warning / Critical`); resolved_at, resolved_by (User ref); resolution_note *(mandatory for Warning/Critical)*.
- **AuditEvent**: entity type, entity id, action, actor (User ref), timestamp, diff snapshot.
- **User**: name, email, role, assigned vessels.

### IN-MLP (Release 1)

`Vessel` · `Port` · `Counterparty` · `CharterParty (thin)` · `Voyage` (Summary, Properties, Contacts, Notes, Instructions) · `Port Call` · `Port Activities` · `Activity Log` · `Activity Reports` (+ Extra Info) · `Forms` (Forms list + Details-Forms) · `Checklist + ChecklistItem` (Pre-Arrival/Pre-Departure) · `Vessel Schedule` (home) · `Bunker Requirement` (trimmed: request + status + blocker only — **not** full bunker mgmt) · `Delay` · `Leg Delays/Events` · `Alert List` · `Task List`.

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
- [x] Forms ingest channel — **email-to-form parsing primary; UI manual entry fallback** (locked Block 7)
- [ ] Persistence engine (decided in Prompt B)

---

## Changelog

- 2026-05-26 — Orchestra created. Locked: three hats, modular monolith, OSS-as-inventory, dependency-first with thin-foundations refinement, push-per-gate to psychic-fortnight.
- 2026-05-26 — Scope locked for Release 1 MLP. Product named *Vessel & Voyage Operations Control System*. IMOS adopted as reference inventory with shipmanagement-Ops cuts and gap-adds. Four Release-1 surfaces + entity build order + thin-foundation field sets + IN/DEFER/OUT tables recorded.
- 2026-05-26 — Product roadmap V1–V5 + never-list locked.
- 2026-05-26 — V1 data model completed: full entity list named, CharterParty demoted to VoyageOperatingTerms reference field, voyage creation locked as manual.
- 2026-05-26 — Block 2 (Master Data) verified against Veson IMOS docs, BIMCO/FONASBA, IMO, UN/LOCODE. APPROVED WITH CHANGES: Vessel adds code/status/active-for-reporting; Port adds lat/lon/distance-ref/status, country derived from UNLOCODE; Counterparty restructured to multi-role via CounterpartyRole join table.
- 2026-05-26 — Block 3 (Voyage) verified against Veson IMOS, SMDG, Dataloy, DNV OVD. APPROVED WITH CHANGES: status enum expanded to Scheduled/Commenced/Completed/Closed/Cancelled; itinerary modeled as ordered ItineraryLine with port_function + planned ETA/ETD; commencing/completing datetime; cp_document_ref + previous_voyage_ref added; rejected scope-creep items (operational_terms_summary, opening_bunker_snapshot, voyage_template).
- 2026-05-26 — Block 2 tweak: `flag` added to Vessel field set (per supplementary Veson IMOS verification pass).
- 2026-05-26 — Block 4 (Vessel Schedule) verified against Dataloy Fleet Allocation & Scheduling / Scheduler Board docs. APPROVED WITH CHANGES: charterer moved from bar text to tooltip; ops-manager filter dropped; voyage/reference search added; exception cue reduced to single dot (dormant until Block 10 lands); read-only Gantt confirmed.
- 2026-05-26 — Blocks 5–10 verified (combined deep-research pass, sources: BIMCO, FONASBA, ICS, Danaos, Wärtsilä, Voyager Portal, ShipNet, VPS Veritas, Smart Maritime Council). All APPROVED WITH CHANGES. Key deltas: PortCall status enum restructured (Arrived at Pilot Station / At Anchor / Cargo Ops Completed added); NOR/free pratique/customs fields added; AgentAppointment lifecycle corrected (Nominated/Appointed/Cancelled); ActivityLog entity added; OperationalReport gets structured typed fields + Queried status; FormDetail simplified (no duplication of structured fields); Checklist/ChecklistItem entities added; BunkerRequest adds HSFO/ULSD/LNG/Biofuel + Stemmed status + spec_grade/max_sulphur (delivery fields deferred V2); Delay adds fault_attribution + claimed_duration + port_call_ref + Deviation/Piracy/Quarantine types; Task status expanded (In Progress/Blocked); Alert adds Performance Deviation/Consumption Deviation/Noon Report Missing, removes Task Overdue; resolution_note mandatory on Warning/Critical alerts; originating_alert_ref on Task (manual only, no auto-generation). Forms ingest channel locked: email-to-form parsing primary.
