# Block 5 — Port Call · Runbook

## 1. Local dev startup
Start backend from repository root:
```bash
uv run uvicorn src.app:create_app --factory --reload
```
Start frontend in a second terminal:
```bash
cd frontend
corepack pnpm run dev
```
Open the app:
```text
http://localhost:5173
```
Log in with a valid local user, then open a voyage workspace:
```text
http://localhost:5173/voyages/<voyage_id>/workspace
```
The Port Call panel is inside the Voyage Workspace page.

## 2. Seeding
This flow uses a real authenticated session cookie and then seeds:
voyage + itinerary, then port call, then agent nomination.
Use one shell session:
```bash
API="http://localhost:8000/api/v1"
COOKIE_JAR="./cookies.txt"
```
Login and store cookie:
```bash
curl -i -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"<username>","password":"<password>"}' \
  -c "$COOKIE_JAR"
```
Verify session:
```bash
curl -X GET "$API/auth/me" \
  -b "$COOKIE_JAR"
```
Optional: inspect the real `session_id` cookie value:
```bash
grep session_id "$COOKIE_JAR"
```
Create voyage (or reuse an existing voyage id from seeded data):
```bash
curl -X POST "$API/voyages" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "voyage_no": "<voyage_no>",
    "vessel_ref": "<vessel_id>",
    "commencing_datetime": "2026-06-01T12:00:00Z",
    "charterer_ref": "<charterer_counterparty_id>",
    "terms": {
      "charterer_name": "<charterer_name>",
      "cp_type": "VC",
      "cp_date": "2026-05-28",
      "cp_document_ref": "<cp_ref>"
    }
  }'
```
Add itinerary line (capture returned `id` as `<itinerary_line_id>`):
```bash
curl -X POST "$API/voyages/<voyage_id>/itinerary" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "port_ref": "<port_id>",
    "port_function": "Load",
    "planned_eta": "2026-06-02T08:00:00Z",
    "planned_etd": "2026-06-03T18:00:00Z",
    "sequence_no": 0
  }'
```
Create port call (under voyage):
```bash
curl -X POST "$API/voyages/<voyage_id>/port-calls" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "port_id": "<port_id>",
    "itinerary_line_id": "<itinerary_line_id>",
    "eta": "2026-06-02T08:00:00",
    "etd": "2026-06-03T18:00:00",
    "ops_notes": "Initial port call"
  }'
```
Nominate agent (counterparty must be Active and have Agent role):
```bash
curl -X POST "$API/port-calls/<port_call_id>/agent-appointments" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "agent_ref": "<agent_counterparty_id>",
    "appointed_date": "2026-06-01",
    "agent_appointment_ref": "<agent_ref_no_optional>"
  }'
```
Same call pattern if you pass a raw cookie header instead of `-b`:
```bash
curl -X GET "$API/auth/me" \
  -H "Cookie: session_id=<session_id_from_login>"
```

## 3. Status lifecycle
Six states:
- `Planned`
- `Arrived at Pilot Station`
- `At Anchor`
- `Berthed`
- `Cargo Ops Completed`
- `Departed`
`LEGAL_TRANSITIONS` (D-LOCK-2):
```python
LEGAL_TRANSITIONS = {
    "Planned":                  {"Arrived at Pilot Station", "At Anchor", "Berthed"},
    "Arrived at Pilot Station": {"At Anchor", "Berthed"},
    "At Anchor":                {"Berthed"},
    "Berthed":                  {"Cargo Ops Completed", "Departed"},
    "Cargo Ops Completed":      {"Departed"},
    "Departed":                 set(),
}
```
Legal forward skips:
- `Planned -> At Anchor`
- `Planned -> Berthed`
- `Arrived at Pilot Station -> Berthed`
- `Berthed -> Departed`
Correction path (D-LOCK-3):
- Backward status change is not a normal transition.
- Use `PATCH /api/v1/port-calls/{id}` with `status` + `correction_reason`.
- Caller must have `Admin` or `Operations` role.
- Timestamps are not auto-cleared by correction.
Example correction:
```bash
curl -X PATCH "$API/port-calls/<port_call_id>" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "status": "Planned",
    "correction_reason": "Wrong status selected by operator"
  }'
```

## 4. Agent replacement flow
Lifecycle:
- Nominate: `POST /api/v1/port-calls/{id}/agent-appointments`
- Appoint: `PATCH /api/v1/agent-appointments/{id}/appoint`
- Replace: post a new nomination while one is active
Replace behavior:
- Service cancels current active appointment.
- Service creates a new appointment row.
- Existing appointment row is never mutated to point at a new agent.
Active appointment derivation (D-LOCK-7):
- Active = latest appointment where `status != "Cancelled"`.
- No pointer column on `port_calls` for active appointment.
Hard backstop (D-LOCK-7):
- Partial unique index enforces one non-cancelled appointment per `port_call_id`.
- If two writes race, DB constraint blocks duplicate active rows.

## 5. Timezone model
- At port call creation, service snapshots `timezone_name` from Port (`IANA`, example `Asia/Singapore`).
- UI uses `input[type=datetime-local]`; value has no timezone metadata.
- Server interprets that local value in `timezone_name`, converts to UTC using `zoneinfo`, then stores UTC.
- `timezone_offset_minutes` is stored for display/audit; source of truth for conversion is IANA name snapshot.

## 6. Common failure modes
- `409 illegal transition`: attempted status move not in `LEGAL_TRANSITIONS`.
- `409 duplicate active appointment`: second non-cancelled agent appointment for same port call.
- `422 timestamp coherence violation (monotonic actuals)`: actual timestamps out of allowed order.
- `422 agent without Agent role`: nominated counterparty is missing `Agent` role.
- `422 missing correction_reason`: backward status patch omitted required reason.
- `403 correction without Admin/Operations role`: caller lacks required role for backward correction.
- `datetime-local timezone confusion (operator must know the port timezone)`: input is local-time only; server converts using port snapshot timezone.
- `partial-index dialect note (SQLite + Postgres both covered)`: uniqueness is enforced with a partial index validated on both engines.

## 7. Deferred scope
- No DA/expense lifecycle in Block 5.
- No laytime computation in Block 5.
- Statement-of-Facts richer event model is deferred to Block 6.

## 8. Useful URLs
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Vite dev workspace route: `http://localhost:5173/voyages/<voyage_id>/workspace`
