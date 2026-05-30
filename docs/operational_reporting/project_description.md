# Block 6 — Operational Reporting · Project Description

## What this block is

Block 6 builds the operational event and reporting layer that sits on top of
the Port Call module (Block 5). It captures what actually happens during a
port stay — at the granularity needed for commercial dispute defence — and
collects the structured voyage reports (Noon, Arrival, Departure, Bunkering,
Statement of Facts) that shore operators receive from vessels.

This is the first block that has genuine legal weight. PortActivity events and
ActivityLog entries feed the Statement of Facts. OperationalReports feed
post-voyage reconciliation. Data entered here can be cited in demurrage
arbitration.

## What it delivers

**PortActivity / OperationalEvent**
- Timestamped, append-only log of 21 operational events per port call.
- Events cover the full port-stay arc: arrival → anchorage → berthing →
  cargo operations → services → departure, plus NOR/clearance milestones.
- Corrections via a new row with a self-FK chain — original facts are never
  mutated or deleted.

**ActivityLog**
- Free-narrative remarks per port call, recorded by operator or agent.
- Append-only. Separate from the structured event log.
- Used for Master/agent notes that form part of the Statement of Facts
  dispute record.

**OperationalReport**
- Structured reports with a status lifecycle: Pending → Queried → Accepted
  or Rejected.
- Five report types: Noon (voyage-level), Arrival / Departure / Statement of
  Facts / Bunkering (port-call-level).
- Structured telemetry fields: position, speed, distance-to-go, ETA next
  port, bunker ROB.
- Accepted reports are immutable. Errors corrected by a superseding report
  row.

## What it is NOT

- Not a Laytime calculator. Event timestamps are captured; the calculation
  engine is out of V1 scope.
- Not a demurrage claim workflow. Records feed future claim tooling; no
  claim entity in this block.
- Not a full Statement of Facts generator. The data is captured; a formatted
  SOF PDF export is deferred.
- Not a file storage system. `raw_content_ref` is an opaque string reference
  only.
- No AIS, no map, no charting.

## Success criteria

- Operator opens a port call in the Voyage Workspace → sees EventLog panel
  with chronological port activity events and narrative remarks.
- Operator adds a port event (type + timestamp + optional notes) → event
  appears immediately, no edit/delete controls visible.
- Operator corrects an event → a new correction row is created; both the
  original and correction are visible in the log.
- Operator opens Reports panel → sees all reports for the voyage and its
  port calls with status chips.
- Operator submits a Noon report (voyage-level) and an Arrival report
  (port-call-level) → both appear in the correct report lists.
- Shore operator (Operations/Admin role) transitions a report Pending →
  Accepted → report is locked; no further edits possible.
- `make test` green under 30s. `make lint`, `make typecheck`, `tach check`
  pass.
- Frontend `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`,
  `pnpm run test:e2e`, `pnpm audit --audit-level=high` all pass.
- Coverage on `src/modules/operational_reporting/` ≥ 95% line.
- Migration creates all tables and constraints; runs clean on SQLite and
  Postgres 18.
- `openapi/openapi.json` regenerated and committed.

## Constraints

- TDD. Real-DB backend tests only. No mocked persistence. [ADR-0011]
- `mypy --strict`. No `any`. [ADR-0002]
- Tach boundaries enforced. [ADR-0010]
- Append-only enforced at API, service, and repository layers.
- Mutations gated to Operations/Admin role. [D-LOCK-9]
- 12-Factor App. [ADR architecture baseline]
