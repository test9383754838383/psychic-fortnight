# V1 Roadmap

Clean build memory for V1 of the **Vessel & Voyage Operations Control System**.

This file holds the locked V1 scope only. `ORCHESTRA.md` stays as the high-level project brain.

**Reference inventory:** IMOS (Veson) Operations module set at `Product/Project_creator_agent/Operations/`. Treated as scope-width reference only. IMOS is commercial-operator-biased; shipmanagement-Ops cuts and gaps below are intentional.

## Block 1 — V1 Frame

V1 is the MLP. Thin everywhere. Shore-side only.

Voyage creation is **manual entry only**. No import, no chartering module, no external feed. Operator owns the data from day one.

Main surfaces:

1. **`Vessel Schedule`** — home screen.
2. **`Voyage Workspace`** — one-voyage control room.
3. **`Forms + Tasks + Alerts`** — reporting and action loop.
4. **`Port Call Detail`** — arrival/departure execution view.

Build sequence stays dependency-first:

```text
Vessel · Port · Counterparty
  → CharterParty (thin header)
    → Voyage
      → Port Call
        → Forms · Tasks · Alerts
          → Vessel Schedule
```

Each level is built only thick enough to feed the level above it. No depth without a real workflow asking for it.

Anchor workflow:

Operator opens `Vessel Schedule` → sees fleet voyages on a Gantt → clicks a voyage → enters `Voyage Workspace` → reads/edits voyage instructions → drills into a `Port Call`.

## Block 2 — Master Data

- **`Vessel`**: code, name, IMO, type, flag, owner ref, technical manager ref *(optional — only if used by alerts/contacts)*, ops manager (user ref), status (`Active / Inactive`), active-for-reporting flag *(can merge with status)*.
- **`Port`**: name, UNLOCODE, country *(derived/validated from UNLOCODE — not free text)*, timezone, latitude, longitude, distance-table reference, status (`Active / Inactive`).
- **`Counterparty`**: code/short name, name, status (`Active / Inactive`), contacts[].

Roles stay under **`CounterpartyRole`** as a join, not a single field:
`Owner / Charterer / Agent / Supplier / TechnicalManager`.

Agent role adds: ports-serviced[] and nomination contact email.

Do not split counterparties into separate entities.

## Block 3 — Voyage Spine

- **`VoyageOperatingTerms`** *(reference field on Voyage, not a separate entity)*: charterer name, CP type (`CVC / TC / VC`), CP date, cp_document_ref. No CP logic owned.
- **`Voyage`**: voyage no., vessel ref, charterer ref *(optional)*, VoyageOperatingTerms, status (`Scheduled / Commenced / Completed / Closed / Cancelled`), commencing_datetime, expected_completing_datetime *(calculated from final itinerary ETD, manual override allowed)*, previous_voyage_ref *(optional)*, voyage_instructions *(text or file ref)*, ops_notes.
- **`ItineraryLine`** *(ordered, under Voyage)*: sequence_no, port_ref, port_function (`Load / Discharge / Bunker / Canal / Transit / Repairs / Other`), planned_eta, planned_etd.

Execution fields do not live on `ItineraryLine`. They belong to `PortCall`.

## Block 4 — Vessel Schedule

`Vessel Schedule` is the V1 home screen.

- Rows = active managed vessels.
- Bars = voyages placed by commencing → expected_completing datetimes.
- Bar text = voyage no./ref, status colour, current/next port code, ETA/ETD if commenced.
- Tooltip = charterer, full port sequence, vessel, voyage status, last position.
- Filters = date range, vessel(s), voyage status, voyage/reference search.
- Click on bar = open `Voyage Workspace`.
- One tiny exception dot for open alert or overdue task. Dormant until Block 10 lands.

Read-only Gantt only. No drag-to-reschedule. Timing edits stay inside `Voyage Workspace`.

## Block 5 — Port Call

- **`PortCall`**: voyage_ref, port_ref, itinerary_line_ref; status (`Planned / Arrived at Pilot Station / At Anchor / Berthed / Cargo Ops Completed / Departed`); eta *(actual/revised)*, etd *(actual/revised)*, ata, atb, atd; timezone_offset; nor_tendered_datetime, nor_accepted_datetime; free_pratique_granted *(bool + datetime)*, customs_cleared *(bool + datetime)*; agent_appointment_ref; ops_notes.
- **`AgentAppointment`**: port_call_ref, agent *(Counterparty ref)*, appointed_date; status (`Nominated / Appointed / Cancelled`).

`Replaced` is not a status. It is an event that creates a new appointment record.

## Block 6 — Operational Reporting

- **`PortActivity / OperationalEvent`**: port_call_ref, event_type, timestamp, recorded_by *(User ref)*, notes *(optional)*.
- **`ActivityLog`**: port_call_ref, logged_at, logged_by *(User ref)*, narrative.
- **`OperationalReport`**: voyage_ref or port_call_ref; report_type (`Noon / Arrival / Departure / Bunkering / Statement of Facts`); submitted_by, submitted_at, received_at; status (`Pending / Queried / Accepted / Rejected`); structured fields: position_lat, position_lon, speed_24h, distance_to_go, eta_next_port, bunker_rob; raw_content_ref.

`PortActivity / OperationalEvent` event types:

`Arrived / Anchored / Berthed / All Fast / Commenced Loading / Completed Loading / Commenced Discharging / Completed Discharging / Hoses Connected / Hoses Disconnected / Departed / NOR Tendered / NOR Re-tendered / NOR Accepted / Free Pratique Granted / Tugs Engaged / Tugs Released / Bunkering Commenced / Bunkering Completed / Delay Commenced / Delay Ended`

`Pilot On Board / Pilot Away` stay out. That is disbursement scope.

`ActivityLog` stays separate from structured activity. It carries Master/agent narrative remarks for dispute defence.

## Block 7 — Forms And Checklists

- **`Form`**: form_id, form_type, linked_entity *(Voyage or PortCall ref)*, submitted_by, submitted_at, received_at; status (`Received / Under Review / Queried / Accepted / Rejected`); assigned_to *(User ref)*, reviewed_by, reviewed_at, notes.
- **`FormDetail`**: form_ref; raw_fields *(JSON blob for secondary/compliance data)*, raw_source_ref *(original file)*.
- **`Checklist`**: port_call_ref, checklist_type (`Pre-Arrival / Pre-Departure`), created_at, status (`Open / Completed`).
- **`ChecklistItem`**: checklist_ref, sequence_no, item_name, status (`Pending / Signed Off`), signed_off_at, signed_off_by *(User ref)*.

Primary ingest channel is **email-to-form parsing**. UI manual entry is fallback.

Structured typed fields live on `OperationalReport` only. They are not duplicated into `FormDetail`.

`Checklist` stays separate from `Form` because it needs ordered sign-off item by item.

## Block 8 — Bunker Request

- **`BunkerRequest`**: voyage_ref, port_call_ref *(optional)*; fuel_type (`HFO / VLSFO / MGO / LSMGO / HSFO / ULSD / LNG / Biofuel`); quantity_required_mt, specification_grade *(ISO 8217)*, max_sulphur_content; status (`Raised / In Progress / Stemmed / Supplied / Blocked`); blocker_note, raised_by *(User ref)*, raised_at; supplier_ref *(Counterparty ref, optional)*, eta_supply.

This is a trimmed V1 requirement only: request, status, blocker, and basic supply context.

Delivered volume and delivered temperature stay deferred to V2.

## Block 9 — Delay Tracking

- **`Delay`**: voyage_ref; port_call_ref *(optional — port delays)* or leg_ref *(optional — sea-passage delays; mutually exclusive)*; delay_type (`Weather / Mechanical / Port Congestion / Awaiting Berth / Awaiting Orders / Cargo Operations / Bunkering Delay / Strike / Deviation / Piracy/Security / Quarantine/Disease / Other`); fault_attribution (`Vessel / Charterer / Port / Weather / Force Majeure`); start_datetime, end_datetime; actual_duration *(derived)*; claimed_duration *(manual)*; description; recorded_by *(User ref)*; approved_by *(User ref — locks record on set)*.

V1 keeps delay tracking operational first, with enough structure to support later commercial dispute handling.

## Block 10 — Tasks And Alerts

- **`Task`**: task_id, linked_entity_type (`Voyage / PortCall / Vessel`), linked_entity_id; title, description *(optional)*; assigned_to *(User ref)*, due_datetime; status (`Open / In Progress / Blocked / Done`); originating_alert_ref *(optional — manual escalation only, never auto-generated)*; created_by, created_at, completed_at.
- **`Alert`**: alert_id, linked_entity_type, linked_entity_id; alert_type (`ETA Overdue / Departure Overdue / NOR Not Tendered / Agent Not Confirmed / Form Not Received / Bunker Request Blocked / Voyage Not Commenced / Performance Deviation / Consumption Deviation / Noon Report Missing`); triggered_at, message; severity (`Info / Warning / Critical`); resolved_at, resolved_by *(User ref)*; resolution_note *(mandatory for `Warning / Critical`)*.

Tasks do not auto-spawn from alerts in V1. Escalation is manual only.

The `Vessel Schedule` exception dot can light up once this block exists.

## Block 11 — Scope Boundaries

### IN-MLP

`Vessel` · `Port` · `Counterparty` · `CharterParty (thin)` · `Voyage` *(Summary, Properties, Contacts, Notes, Instructions)* · `Port Call` · `Port Activities` · `Activity Log` · `Activity Reports` *(+ Extra Info)* · `Forms` *(Forms list + Details-Forms)* · `Checklist + ChecklistItem` *(Pre-Arrival / Pre-Departure)* · `Vessel Schedule` *(home)* · `Bunker Requirement` *(trimmed: request + status + blocker only — not full bunker management)* · `Delay` · `Leg Delays/Events` · `Alert List` · `Task List`

### DEFER

`Onboard` *(entire vessel-side app)* · `Berth Schedule` · `Port Schedule` · `Fleet Map` *(secondary view)* · `Voyage P&L` + snapshots + calc options · `Port Expense` *(full DA lifecycle)* · `Rebill Management` · `Berth Management` · `Cargo Handling` deep panels · `Tank Conditions` · `Reverting Port Activities` · `Voyage Bunkers` planning · `Map-Forms`

### OUT

`Claims` *(entire module — Claim, Claim Invoice, Commissions, Types, Subtypes, Laytime Claim Types)* · `Deviation Estimate / Analysis / TCE` · `CP Quantity Details` · `Bunker Price` workarounds · full **Bunker management / procurement** · IMOS troubleshooting notes · Onboard installation / training docs

### Shipmanagement-Ops Gaps Already Accepted

- Vessel registry with owner/technical-manager relationship + HSEQ class.
- CharterParty header.
- Voyage instructions issuing workflow.
- Owner/Charterer communication log.
- Noon report / daily report ingestion *(folded into Forms cluster)*.
- Port DA stub record *(logged only; full lifecycle deferred)*.
- Pre-arrival / Pre-departure checklists.

## Change Notes

- 2026-05-26 — V1 scope locked and separated out of `ORCHESTRA.md` into this file.
- 2026-05-26 — Master Data accepted with Vessel code/status/flag/active-for-reporting, Port lat/lon/distance reference/status, and Counterparty multi-role structure.
- 2026-05-26 — Voyage spine accepted with `Scheduled / Commenced / Completed / Closed / Cancelled`, ordered `ItineraryLine`, commencing/completing datetimes, `cp_document_ref`, and `previous_voyage_ref`.
- 2026-05-26 — Vessel Schedule accepted as read-only Gantt with voyage/reference search and dormant exception dot.
- 2026-05-26 — Port Call through Alerts accepted with the final V1 shape now recorded in Blocks 5-10, including `ActivityLog`, checklist entities, trimmed bunker request, structured delay tracking, and manual alert-to-task escalation only.
