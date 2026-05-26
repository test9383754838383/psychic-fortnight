# Blocks 5–10 Verification Prompt
# Vessel & Voyage Operations Control System

## Source Constraint

**Do NOT use Veson IMOS / Veson Help Center as a source.** It is already our scope-inventory reference. Use only independent sources: DNV Nauticus, Danaos, ShipNet, K-Line/NYK/MOL operational manuals, BIMCO publications, ICS guides, FONASBA standards, OCIMF, IACS, IMO resolutions, port MIS systems, UNCTAD maritime documents, academic shipping operations literature, or verifiable industry practice.

---

## Your Role

You are a senior maritime operations and ERP expert with hands-on experience in ship management companies and operational ERP systems (DNV Nauticus, Danaos, ShipNet). You think in terms of what shore-based operators actually need daily, not what software vendors want to sell.

---

## Context: What We Are Building

A web-based **Vessel & Voyage Operations Control System** for the shore-based Operations Department of a ship management company.

**Bar: MLP (Minimum Lovable Product).** Every field and record included must be both *important* and *lovable* for an operator. Pareto: the 20% of data that drives 80% of operational decisions.

**NOT in scope:** chartering, finance, accounting, crewing, technical maintenance, vessel-side portal.

**IN scope:** voyage execution, port call management, vessel/agent reporting, tasks, alerts — shore-side only. Voyage creation is manual (operator-entered, no import).

---

## Three Build Principles

**Simplicity:** Every field must be demanded by a module above it in the dependency chain. No speculative fields.

**Functionality:** The field set must be complete enough that every downstream module works fully. A missing field that breaks execution is a failure.

**Testability (TDD lens):** Every field must be expressible as a concrete, operator-observable business behavior (selection, validation, display, routing, reporting, or alert).

---

## Locked Data Model (foundation — already verified, do not re-verify)

These are fixed. Build answers for Blocks 5–10 against them:

- **Vessel**: code, name, IMO, type, flag, owner ref, technical manager ref, ops manager (user ref), status (Active/Inactive), active-for-reporting flag.
- **Port**: name, UNLOCODE, country (derived from UNLOCODE), timezone, lat/lon, distance-table reference, status.
- **Counterparty**: code, name, status, contacts[]. Roles via CounterpartyRole join: Owner/Charterer/Agent/Supplier/TechnicalManager. Agent role adds: ports-serviced[], nomination contact email.
- **Voyage**: voyage no., vessel ref, charterer ref (optional), VoyageOperatingTerms (charterer name, CP type CVC/TC/VC, CP date, cp_document_ref), status (Scheduled/Commenced/Completed/Closed/Cancelled), commencing_datetime, expected_completing_datetime, previous_voyage_ref, voyage_instructions (text or file ref), ops_notes.
- **ItineraryLine** (planning, under Voyage): sequence_no, port_ref, port_function (Load/Discharge/Bunker/Canal/Transit/Repairs/Other), planned_eta, planned_etd.

---

## Block 5 — Port Call

Port Call extends ItineraryLine with execution fields. It is the operator's real-time record of what actually happens at a port versus what was planned.

**Current planned field set:**

- voyage_ref, port_ref (from ItineraryLine)
- status: `Planned / Arrived / Anchored / Berthed / Departed / Completed`
- eta (actual/revised), etd (actual/revised)
- atb (actual time of berthing), ata (actual time of arrival), atd (actual time of departure)
- agent_appointment_ref → AgentAppointment
- readiness_notice_sent (bool + datetime)
- ops_notes

**AgentAppointment**: port_call_ref, agent (Counterparty ref), appointed_date, confirmation_status (Nominated/Confirmed/Replaced).

**Questions:**

**B5-Q1. Status enum — is `Planned / Arrived / Anchored / Berthed / Departed / Completed` correct and sufficient?**
Are these the real operational states a shore-side operator needs to track at a port? Are any missing (e.g., "At Anchor" vs "Arrived at Pilot Station" distinction) or any redundant?

**B5-Q2. ATA/ATB/ATD — are all three required for the MLP, or is one derivable?**
From a Statement of Facts / port activity perspective, which timestamps are the minimum required to correctly anchor port activities and calculate time-at-berth?

**B5-Q3. AgentAppointment — is `Nominated/Confirmed/Replaced` sufficient?**
In shipmanagement ops, what are the real lifecycle states of an agent appointment? Is "Replaced" a status or a new record? Is any state missing that causes operational failures (e.g., agent invoicing, SOF co-signing)?

**B5-Q4. Readiness notice — is a single boolean + datetime sufficient, or does the operator need to track multiple notices (NOR, Free Pratique, customs clearance)?**
Which of these notices must be recorded at the Port Call level to avoid missed laytime triggers or authority compliance failures?

**B5-Q5. What is the single most common field missing from Port Call records in maritime ERP implementations that causes downstream reporting or authority failures?**
Confirmed failure patterns only.

---

## Block 6 — Port Activities / Activity Log / Activity Reports

Port Activities = the Statement of Facts equivalent. Activity Log = operator's running record. Activity Reports = formal reports accepted/rejected from vessel or agent.

**Current planned field set:**

**PortActivity / OperationalEvent** (under PortCall):
- port_call_ref, event_type (from controlled enum), timestamp, recorded_by (User ref), notes (optional)

**Event type enum (draft):** `Arrived / Anchored / Berthed / Commenced Loading / Completed Loading / Commenced Discharging / Completed Discharging / Departed / NOR Tendered / NOR Accepted / Free Pratique Granted / Pilot On Board / Pilot Away / Tugs Engaged / Tugs Released / Bunkering Commenced / Bunkering Completed / Delay Commenced / Delay Ended`

**OperationalReport** (under Voyage or PortCall):
- ref to voyage or port call, report_type, submitted_by, submitted_at, status (Pending/Accepted/Rejected), raw_content_ref (file or text blob)

**Questions:**

**B6-Q1. Event type enum — completeness vs bloat.**
From DNV Nauticus / Danaos / ShipNet practice: is this enum complete for the shore-side Statement of Facts for a dry-bulk or tanker vessel? Flag any event type that is missing and will cause an incomplete SOF. Flag any that are nice-to-have, not operator-critical.

**B6-Q2. OperationalReport status — is `Pending / Accepted / Rejected` sufficient?**
In shipmanagement ops, does a report go through more states (e.g., Queried, Amended, Superseded)? Which states are required to correctly manage the trust-loop between vessel and shore?

**B6-Q3. Activity Log vs Port Activities — are they the same entity or different?**
In practice, does the shore operator need a separate running freeform log (narrative) distinct from the structured event list? Or is the event list + notes field sufficient?

**B6-Q4. OperationalReport raw_content_ref — file blob vs structured fields.**
For noon reports and port reports ingested from vessel/agent: does the shore operator need the raw content stored as a file/text blob, or do they need specific fields extracted (e.g., position, speed, fuel consumption from noon report)? What is the MLP minimum?

**B6-Q5. What report types are truly required for the MLP reporting loop?**
List only the report types (e.g., Noon Report, Arrival Report, Departure Report, Port Report, Bunker Report) that a shipmanagement ops operator cannot function without on a daily basis.

---

## Block 7 — Forms (Office-Side Ingestion)

Forms = the office-side queue for receiving, reviewing, and accepting/rejecting structured submissions from vessel or agent (noon reports, port reports, checklists, etc.).

**Current planned field set:**

**Form** (queue item):
- form_id, form_type, linked entity (Voyage ref or PortCall ref), submitted_by (vessel/agent, free text or Counterparty ref), submitted_at, received_at, status (Received/Under Review/Accepted/Rejected/Pending Action), assigned_to (User ref), reviewed_by (User ref), reviewed_at, notes

**FormDetail** (content of a specific form):
- form_ref, fields (key-value store or structured JSON blob), raw_source_ref (original file)

**Questions:**

**B7-Q1. Form status lifecycle — is `Received / Under Review / Accepted / Rejected / Pending Action` correct?**
In shipmanagement ops, what is the actual lifecycle of an incoming report from vessel or agent? Are any states missing that cause the trust-loop to break (e.g., forms silently ignored, re-submissions not tracked)?

**B7-Q2. FormDetail — key-value store vs structured entity per form type.**
For the MLP, is a generic key-value/JSON blob for form content sufficient, or does the operator need form-type-specific structured fields (e.g., noon report needs position, speed, fuel consumption as typed fields for filtering/alerts)? What is the minimum required to be lovable?

**B7-Q3. Form ingest channel — what is the most common submission method in shipmanagement today?**
Email attachment, API push from onboard system, web form, or manual entry by operator? This informs Block 7 design. Cite the dominant channel in use by mid-size shipmanagement companies.

**B7-Q4. Pre-arrival and pre-departure checklists — same Form entity or separate?**
These are identified as a shipmanagement-specific gap (not in IMOS). Should they use the same Form entity with a different form_type, or do they need a separate structure (e.g., ordered checklist items with per-item sign-off)?

**B7-Q5. What is the most operationally damaging failure mode in forms management for shipmanagement ops?**
The #1 failure that causes authority non-compliance, missed instructions, or owner disputes. Confirmed only.

---

## Block 8 — Bunker Requirement

Trimmed scope: operator raises a bunker request, tracks its status, logs a blocker. Full bunker management (procurement, pricing, stem, ROB tracking) is deferred.

**Current planned field set:**

**BunkerRequest**:
- voyage_ref, port_call_ref (optional — bunker at a specific port), fuel_type (HFO/VLSFO/MGO/LSMGO), quantity_required (MT), status (Raised/In Progress/Supplied/Blocked), blocker_note (free text, used when status=Blocked), raised_by (User ref), raised_at, supplier_ref (Counterparty ref, optional), eta_supply (optional datetime)

**Questions:**

**B8-Q1. Fuel type enum — is `HFO / VLSFO / MGO / LSMGO` sufficient for V1?**
For IMO 2020 compliance and standard fleet ops, is this enum complete? Any fuel type missing that an operator must distinguish in daily bunker requests?

**B8-Q2. Status enum — is `Raised / In Progress / Supplied / Blocked` sufficient?**
For the trimmed scope (no procurement workflow, no pricing), what statuses does the shore operator actually need to manage the bunker request loop with the port agent or bunker supplier?

**B8-Q3. Quantity unit — MT only, or does the operator also need volume (m³, cbm)?**
In practice, do shore-based operators record bunker requirements in metric tons only, or do they regularly need volumetric quantities as well in the request stage?

**B8-Q4. What is the minimum data the operator needs at the BunkerRequest level to avoid supply failures or vessel delays?**
Not the full procurement record — just the fields that, if missing, cause operational failures at the port. Confirmed failure patterns only.

---

## Block 9 — Delay / Leg Delays & Events

Delays = structured record of time lost on a voyage or leg, with type, duration, and cause. Required for off-hire calculation input (deferred to V4) and operator reporting (V1).

**Current planned field set:**

**Delay**:
- voyage_ref, leg_ref (optional — ItineraryLine ref), delay_type (from controlled enum), start_datetime, end_datetime, duration (derived from start/end), description (free text), recorded_by (User ref), approved_by (User ref, optional)

**Delay type enum (draft):** `Weather / Mechanical / Port Congestion / Awaiting Berth / Awaiting Orders / Cargo Operations / Customs/Immigration / Bunkering Delay / Strike / Other`

**Questions:**

**B9-Q1. Delay type enum — completeness vs bloat.**
From DNV Nauticus / Danaos / ShipNet / BIMCO practice: is this enum complete for reporting to owners and charterers? Flag any type that is missing and will cause incorrect off-hire attribution later. Flag any that are redundant or rarely used in practice.

**B9-Q2. Is `leg_ref` sufficient, or does the delay need a port_call_ref as well?**
For port-based delays (e.g., port congestion, awaiting berth), is referencing the ItineraryLine sufficient or does the operator need a direct link to the PortCall execution record?

**B9-Q3. approved_by — is approval required at V1 or is it premature?**
In shipmanagement ops, do delay records require formal approval before they are reported to owners? Or is this a V2/V4 concern when off-hire calculation is added?

**B9-Q4. Duration — always derived from start/end, or does the operator ever record a claimed duration separately?**
In laytime / off-hire disputes, is there ever a need to record a "disputed duration" distinct from the calculated one at this stage?

**B9-Q5. What delay categorisation failures cause the most owner/charterer disputes in shipmanagement?**
The classification errors that lead to incorrect off-hire claims or contested reports. Confirmed patterns only.

---

## Block 10 — Tasks & Alerts

Tasks = operator action queue (manually created or auto-triggered). Alerts = system-generated exceptions surfaced to the operator.

**Current planned field set:**

**Task**:
- task_id, linked_entity_type (Voyage/PortCall/Vessel), linked_entity_id, title, description (optional), assigned_to (User ref), due_datetime, status (Open/Done), created_by (User ref), created_at, completed_at

**Alert**:
- alert_id, linked_entity_type, linked_entity_id, alert_type (from controlled enum), triggered_at, message (generated text), resolved_at, resolved_by (User ref), severity (Info/Warning/Critical)

**Alert type enum (draft):** `ETA Overdue / Departure Overdue / NOR Not Tendered / Agent Not Confirmed / Form Not Received / Bunker Request Blocked / Task Overdue / Voyage Not Commenced`

**Questions:**

**B10-Q1. Task status — is `Open / Done` sufficient, or does the operator need intermediate states?**
For a shore-based ops team, do tasks need states like In Progress, Blocked, Escalated — or is a binary Open/Done sufficient for the MLP action queue?

**B10-Q2. Alert type enum — completeness for the MLP.**
For shore-based operator daily work, is this enum sufficient to surface the exceptions that actually require human action? Flag any critical alert type missing. Flag any that are noise (trigger too frequently to be actionable without tuning).

**B10-Q3. Alert severity — is `Info / Warning / Critical` sufficient?**
In practice, do operators need more than three severity tiers, or does adding tiers create alert fatigue?

**B10-Q4. Alert resolution — is a single resolved_at + resolved_by sufficient, or does the operator need a resolution note?**
For audit purposes and owner/charterer reporting: does the resolution of an alert need a free-text note to be useful, or is "who closed it and when" sufficient?

**B10-Q5. Task vs Alert — overlap and duplication risk.**
In practice, should a task auto-create from an unresolved alert (e.g., "NOR Not Tendered" alert → auto-creates task "Chase agent for NOR"), or are these kept fully separate? What is the MLP-appropriate coupling?

---

## Required Output Format

For each block (5 through 10), for each question:
- **Finding** (direct, no padding)
- **Verdict**: Correct / Add [field or value] / Remove [field or value] / Restructure
- **Source**: Specific system, standard, or published industry reference (not Veson IMOS)

End each block with a **Block N Verdict**:
- APPROVED — build as defined
- APPROVED WITH CHANGES — exact field-level changes listed
- REJECTED — reason + alternative proposed

No padding. No summaries between blocks. Go straight question → answer.
