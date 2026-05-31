# Block 6 — Operational Reporting · Prompt B (Stack Verification)

Paste this into a fresh research terminal after Prompt A is complete.

---

```
You are a stack verification agent for Block 6 — Operational Reporting of a
vessel/voyage operations ERP system. Prompt A returned NO_FIT — no complete
open-source reference exists. We are building from scratch.

Read the following project files in full before answering:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0016-session-auth-implementation.md
- docs/port_call/runbook.md
- OPEN_DECISIONS.md

Then read the Block 6 scope from V1_ROADMAP.md §Block 6.

Your job: verify that the planned implementation approach is sound across all
layers. Challenge anything that is wrong. Confirm anything that is right.

## Block 6 scope (from V1_ROADMAP.md)

Three entities:

1. **PortActivity / OperationalEvent** — port_call_ref, event_type, timestamp,
   recorded_by (User ref), notes (optional).
   21 event types: Arrived, Anchored, Berthed, All Fast, Commenced Loading,
   Completed Loading, Commenced Discharging, Completed Discharging,
   Hoses Connected, Hoses Disconnected, Departed, NOR Tendered, NOR Re-tendered,
   NOR Accepted, Free Pratique Granted, Tugs Engaged, Tugs Released,
   Bunkering Commenced, Bunkering Completed, Delay Commenced, Delay Ended.

2. **ActivityLog** — port_call_ref, logged_at, logged_by (User ref), narrative.

3. **OperationalReport** — voyage_ref or port_call_ref; report_type
   (Noon / Arrival / Departure / Bunkering / Statement of Facts);
   submitted_by, submitted_at, received_at; status
   (Pending / Queried / Accepted / Rejected); structured fields:
   position_lat, position_lon, speed_24h, distance_to_go, eta_next_port,
   bunker_rob; raw_content_ref.

## Preliminary implementation decisions (challenge or confirm each)

### Data model

D-A. PortActivity is append-only. No UPDATE or DELETE on existing rows. Soft
     corrections are a new row with a correction_reason FK to the original.
     Rationale: SOF legal admissibility requires immutable event history.

D-B. ActivityLog is also append-only by the same rationale.

D-C. event_type stored as String + CheckConstraint (21 values), same pattern as
     port_call status. No separate lookup table.

D-D. OperationalReport structured fields (position_lat, position_lon, speed_24h,
     distance_to_go, eta_next_port, bunker_rob) stored as flat nullable columns,
     same pattern as PortCall actuals. No JSONB. Rationale: single-tenant,
     no dynamic fuel arrays needed in V1.

D-E. bunker_rob stored as a single Numeric column (MT) for V1. Multi-fuel
     breakdown deferred. V1_ROADMAP does not specify fuel-type breakdown.

D-F. OperationalReport.raw_content_ref is a nullable string (file path or
     external reference). No file storage in V1 scope.

### State machine

D-G. OperationalReport status: Pending → Queried → Accepted or Rejected.
     Pending → Accepted direct skip allowed (no queries needed).
     Rejected is terminal. Accepted is terminal.
     Implemented as explicit-dict LEGAL_TRANSITIONS, same pattern as
     port_call and voyage_spine state machines.

D-H. Backward moves (e.g. Accepted → Queried) are not allowed in V1.
     If a report is accepted in error, it must be rejected and re-submitted.
     Rationale: accepted reports are the source of truth for voyage
     reconciliation; mutation after acceptance is dangerous.

### Module boundaries

D-I. New `operational_reporting` Tach module. Dependency direction:
     operational_reporting → port_call (public surface, scalar FKs only)
     operational_reporting → voyage_spine (public surface, scalar FKs only)
     operational_reporting → master_data (public surface, scalar FKs only)
     port_call must NOT import operational_reporting.
     voyage_spine must NOT import operational_reporting.

D-J. No ORM relationship from PortCall into OperationalEvent or ActivityLog.
     Navigation from port call to its events is done by repository query from
     the operational_reporting side only.

### API shape

D-K. Proposed routes:
     POST   /api/v1/port-calls/{id}/events          create event
     GET    /api/v1/port-calls/{id}/events          list events (chronological)
     POST   /api/v1/port-calls/{id}/activity-log    add narrative entry
     GET    /api/v1/port-calls/{id}/activity-log    list narrative entries
     POST   /api/v1/voyages/{id}/reports            create report
     GET    /api/v1/voyages/{id}/reports            list reports for voyage
     GET    /api/v1/reports/{id}                    get one report
     PATCH  /api/v1/reports/{id}                    update fields (pre-accept)
     POST   /api/v1/reports/{id}/transition         status transition

D-L. PortActivity events: no UPDATE endpoint. POST only (append-only enforced
     at API layer, not just DB layer).

D-M. ActivityLog entries: no UPDATE endpoint. POST only.

### Auth

D-N. All endpoints require get_current_user (same as Blocks 5+).
     No additional role restriction beyond authenticated user for creating
     events, activity log entries, or submitting reports.
     Report transition to Accepted/Rejected requires Admin or Operations role.

### Frontend

D-O. Two new panels inside the existing Voyage Workspace (Block 4):
     - EventLog panel: chronological list of port activity events with
       timestamp, event type chip, recorded_by, notes. Add-event form
       (event_type select, datetime-local, notes). No edit/delete.
     - Reports panel: list of operational reports with status chip, type,
       submitted_at. Create/edit form for pre-accepted reports. Transition
       control for status changes.
     ActivityLog is a sub-section inside the EventLog panel (narrative remarks
     alongside structured events).

D-P. No charting, no map, no AIS. Tables and forms only.

### Testing

D-Q. Backend: real-DB tests only (ADR-0011). Parametrize event type round-trips.
     Test append-only enforcement at API layer. Test report status transitions
     including role checks. Test cross-module FK validation.

D-R. Frontend: Vitest + RTL unit tests. Playwright e2e covering:
     add port event → add activity log entry → create report → transition to
     Accepted.

## Your task

Go through each decision D-A through D-R. For each:
- CONFIRM if sound for this stack and scope.
- OVERRIDE if wrong, with a specific replacement and rationale.
- FLAG if there is a hidden risk not covered by the decision.

Then answer these specific open questions:

1. Should PortActivity corrections be a new row with a FK to the original, or
   is a simpler soft-delete (is_active flag) sufficient given V1 legal
   requirements? What does the append-only pattern actually demand here?

2. Should ActivityLog and PortActivity share a single table with a
   discriminator column, or stay as two separate tables? What is the correct
   trade-off for this domain?

3. Is Pending → Accepted direct skip correct, or should the workflow always
   pass through Queried to ensure operator review?

4. Does OperationalReport need a port_call_ref FK in addition to voyage_ref,
   or is voyage_ref sufficient for all V1 report types (Noon reports are
   voyage-level; SOF and Arrival/Departure are port-call-level)?

5. Is the flat-column approach for structured report fields (D-D) the right
   call, or does the variety of report types (Noon vs Arrival vs Departure vs
   SOF) demand separate tables or a JSONB overflow column?

6. Does the M1/M2 milestone split (backend → frontend) still make sense for
   this block, or does the scope warrant a different cut?

Be specific. No fluff. Flag must-fix issues before build starts.
```
