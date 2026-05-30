# Block 5 — Port Call · Project Description

## What this block is

Block 5 models the **execution** of a port visit. Block 3 captured the *plan* (ItineraryLine with planned ETA/ETD). Block 5 captures what actually happened: the vessel arrived, anchored, berthed, worked cargo, departed — with the real timestamps, NOR and clearance milestones, and the appointed port agent.

It introduces the first new backend domain module since Block 3: `port_call`, with two entities — `PortCall` and `AgentAppointment`.

## What it delivers

- **PortCall entity** — child of a Voyage, linked to a Port and (optionally) the originating ItineraryLine. Carries revised estimates (eta/etd), actuals (ata, anchored, atb, cargo-ops started/completed, atd), NOR and clearance milestones, timezone snapshot, and ops notes.
- **PortCall status state machine** — `Planned → Arrived at Pilot Station → At Anchor → Berthed → Cargo Ops Completed → Departed`, with forward skips allowed and a privileged correction path for backward fixes.
- **AgentAppointment entity** — child of a PortCall. The appointed agent (a Counterparty with the Agent role), with its own `Nominated → Appointed → Cancelled` lifecycle. Replacing an agent cancels the old appointment and creates a new one; history is preserved.
- **CRUD + transition API** — manage port calls under a voyage and agent appointments under a port call.
- **Frontend Port Call panel** — inside the Voyage Workspace: list port calls, create/edit, transition status, manage the agent appointment.

## What it is NOT

- Not a port disbursement account (DA) / expense system — explicitly deferred in V1.
- Not berth scheduling or berth management.
- Not laytime / demurrage calculation (NOR timestamps are captured, not computed against).
- Not a full Statement of Facts event log — that richer event model is revisited at Block 6.
- No charting. Port Call is table/form UI.
- No real-time vessel tracking / AIS.

## Success criteria

- Operator opens a voyage's workspace → sees its port calls with status and key timestamps.
- Create a port call against a port on the itinerary; the port must be Active.
- Transition the port call forward through the lifecycle; each transition stamps the matching actual timestamp; skips (e.g. no anchorage) are allowed.
- An impossible transition (e.g. Departed → Berthed) is rejected; a legitimate correction goes through the privileged correction path with a reason.
- Nominate an agent (Active Counterparty with Agent role); appoint; later replace — the old appointment is Cancelled, a new one is Active, and only one non-cancelled appointment exists at a time.
- Coherence invariants enforced: present actuals are monotonic; NOR accepted requires tendered; clearance datetime can't exist without the bool.
- `make test` green under 30s. `make lint`, `make typecheck`, `tach check` pass.
- Frontend `pnpm run test`, `typecheck`, `lint`, `test:e2e` pass.
- Playwright e2e: create port call → transition to Berthed → replace agent → reload → verify active agent + history.
- CI green on all jobs.

## Constraints

- TDD. Real-DB backend tests. [ADR-0011]
- New `port_call` Tach module; depends only on voyage_spine + master_data public surfaces; no reverse dependency, no ORM back-imports. [ADR-0010]
- All datetimes UTC; IANA timezone snapshot per port call.
- All routes behind `get_current_user`; correction path restricted to Admin/Operations.
- DCSA Port Call v2.0 used only as a vocabulary guardrail.
- mypy `--strict`, 12-Factor, simplicity-first, no commercial dependencies.
