# Block 3 — Voyage Spine · Runbook

This runbook outlines operational procedures, common troubleshooting, and development workflows for the **Voyage Spine** module (`Voyage` and `ItineraryLine`).

---

## 1. How to Run Locally

### One-Command Boot (Backend)
To start the local development FastAPI server:
```bash
make dev
```
This boots the FastAPI application using `uvicorn` on [http://localhost:8000](http://localhost:8000).
- **Database File**: Located at `dev.db` in the project root (SQLite).
- **Default Port**: `8000`.

### Development Boot (Frontend)
To boot the React frontend shell dev server:
```bash
cd frontend
pnpm install
pnpm run dev
```
This boots the Vite development server on [http://localhost:5173](http://localhost:5173).
- **Port Parity Proxy**: The dev server is configured with a proxy routing any `/api` requests to the backend server running on `http://localhost:8000`.

---

## 2. Seeding Minimal Test Data

Voyages and itinerary lines require valid, active master-data references. Follow this exact sequence to seed test records using `curl`.

### Step 1: Create a Vessel
```bash
curl -X POST http://localhost:8000/api/v1/vessels \
  -H "Content-Type: application/json" \
  -d '{
    "code": "VSL-EXPLORER",
    "name": "Pacific Explorer",
    "imo": "9876543",
    "vessel_type": "Bulker",
    "flag": "Singapore",
    "active_for_reporting": true
  }'
```
*Note the returned `"id"` UUID (e.g. `11111111-1111-1111-1111-111111111111`). This is `<vessel_uuid>` below.*

### Step 2: Create Ports (Load and Discharge)
Create the load port:
```bash
curl -X POST http://localhost:8000/api/v1/ports \
  -H "Content-Type: application/json" \
  -d '{
    "unlocode": "SGSIN",
    "name": "Singapore",
    "timezone": "Asia/Singapore",
    "latitude": 1.2902,
    "longitude": 103.8519,
    "distance_table_ref": "DIS-002"
  }'
```
*Note the returned `"id"` UUID (e.g. `22222222-2222-2222-2222-222222222222`). This is `<port_load_uuid>` below.*

Create the discharge port:
```bash
curl -X POST http://localhost:8000/api/v1/ports \
  -H "Content-Type: application/json" \
  -d '{
    "unlocode": "NLRTM",
    "name": "Rotterdam",
    "timezone": "Europe/Amsterdam",
    "latitude": 51.9244,
    "longitude": 4.4777,
    "distance_table_ref": "DIS-001"
  }'
```
*Note the returned `"id"` UUID (e.g. `33333333-3333-3333-3333-333333333333`). This is `<port_discharge_uuid>` below.*

### Step 3: Create a Counterparty with a Charterer Role
Create the counterparty:
```bash
curl -X POST http://localhost:8000/api/v1/counterparties \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CP-CARGILL",
    "name": "Cargill Inc",
    "contacts": [
      {
        "name": "John Doe",
        "email": "john_doe@cargill.com",
        "phone": "+1 555 0199",
        "role_hint": "Voyage Charterer Ops"
      }
    ]
  }'
```
*Note the returned `"id"` UUID (e.g. `44444444-4444-4444-4444-444444444444`). This is `<counterparty_uuid>` below.*

Attach the `Charterer` role to the counterparty:
```bash
curl -X POST http://localhost:8000/api/v1/counterparties/<counterparty_uuid>/roles \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Charterer"
  }'
```

### Step 4: Create a Voyage
```bash
curl -X POST http://localhost:8000/api/v1/voyages \
  -H "Content-Type: application/json" \
  -d '{
    "voyage_no": "VOY-PAC-001",
    "vessel_ref": "<vessel_uuid>",
    "commencing_datetime": "2026-06-01T12:00:00Z",
    "charterer_ref": "<counterparty_uuid>",
    "terms": {
      "charterer_name": "Cargill Inc",
      "cp_type": "VC",
      "cp_date": "2026-05-28",
      "cp_document_ref": "CP-2026-0045"
    },
    "voyage_instructions": "Proceed at economical speed.",
    "ops_notes": "First voyage of the summer."
  }'
```
*Note the returned `"id"` UUID (e.g. `55555555-5555-5555-5555-555555555555`). This is `<voyage_uuid>` below.*

### Step 5: Add Itinerary Lines
Add the load port line (will get `sequence_no: 0`):
```bash
curl -X POST http://localhost:8000/api/v1/voyages/<voyage_uuid>/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "port_ref": "<port_load_uuid>",
    "port_function": "Load",
    "planned_eta": "2026-06-02T08:00:00Z",
    "planned_etd": "2026-06-03T18:00:00Z",
    "sequence_no": 0
  }'
```

Add the discharge port line (will get `sequence_no: 1`):
```bash
curl -X POST http://localhost:8000/api/v1/voyages/<voyage_uuid>/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "port_ref": "<port_discharge_uuid>",
    "port_function": "Discharge",
    "planned_eta": "2026-06-25T06:00:00Z",
    "planned_etd": "2026-06-28T22:00:00Z",
    "sequence_no": 1
  }'
```

---

## 3. OpenAPI Inspection & Frontend Type Codegen

### Inspection
- **Interactive UI (Swagger)**: Visit [http://localhost:8000/docs](http://localhost:8000/docs).
- **Raw OpenAPI JSON Spec**: Visit [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json).
- **Committed OpenAPI Schema**: Located in `openapi/openapi.json`.

### Regenerating Frontend Client Types
Our React application is bound to the backend REST API via generated type interfaces. When DTOs or endpoint signatures in the Python module change, regenerate the types:

1. Ensure the latest schema is written to `openapi/openapi.json` (running backend tests via `make test` does this automatically).
2. Generate the types using the codegen script:
   ```bash
   cd frontend
   pnpm run codegen
   ```
   This triggers `openapi-typescript` to build `frontend/src/api/schema.ts` based on `openapi/openapi.json`.
3. Verify type compilation:
   ```bash
   pnpm run typecheck
   ```

---

## 4. How to Add a Backend Migration

Dual-database support (dev/CI on SQLite and production on PostgreSQL) is in effect. For details on migration patterns, refer to **Block 2 — Master Data · Runbook** §3.

### Step-by-Step
1. Make changes to the ORM classes in `src/modules/voyage_spine/models/`.
2. Generate the Alembic batch-mode migration revision:
   ```bash
   uv run alembic revision --autogenerate -m "add_ops_notes_to_voyages"
   ```
3. Apply migrations to the local SQLite database file:
   ```bash
   make migrate
   ```
4. **Postgres dialect verification**: Never bypass Postgres CI migration errors. Ensure you avoid database-specific dialects or raw SQL strings in the migration file that could break in PostgreSQL. Alembic automatically wraps operations in batch-mode using `render_as_batch=True` inside `alembic/env.py`.

---

## 5. Common Failure Modes

### 1. Itinerary Sequence Integrity Violations
- **Problem**: SQLite/PostgreSQL returns a uniqueness constraint violation on `UNIQUE (voyage_id, sequence_no)`.
- **Diagnostics**: This occurs when itinerary lines are inserted, updated, or re-ordered bypassing the SQLAlchemy `ordering_list("sequence_no")` mechanism (e.g. running raw SQL queries directly in the database).
- **Resolution**: Do not manipulate `sequence_no` directly using raw DB writes. All mutations should occur via the service layer methods (`VoyageService.insert_itinerary_line`, `update_itinerary_line`, `delete_itinerary_line`). If DB state is corrupted, run a repair script to reindex all sequence numbers for the voyage starting from `0`.

### 2. Illegal Status Transitions
- **Problem**: Changing a Voyage's status fails with `409 Conflict` (raising `IllegalVoyageStatusTransitionError`).
- **Diagnostics**: The state machine (D-LOCK-4) allows only:
  - `Scheduled` ➔ `Commenced` or `Cancelled`
  - `Commenced` ➔ `Completed` or `Cancelled`
  - `Completed` ➔ `Closed`
  - `Closed` / `Cancelled` are terminal states.
- **Resolution**: Adhere to the allowed transitions. If an operator mistakenly transitions a voyage to `Closed` or `Cancelled`, it cannot be reopened via the API. A manual database edit will be required to reset the `status`.

### 3. Missing or Inactive Master-Data References
- **Problem**: Creating/updating voyages or itinerary lines returns `400 Bad Request` or `422 Unprocessable Entity` citing validation failures.
- **Diagnostics**:
  - `vessel_ref` must refer to a vessel in Master Data that is `Active`.
  - `port_ref` must refer to a port in Master Data that is `Active`.
  - `charterer_ref` must refer to a counterparty in Master Data that is `Active` **AND** has the role of `"Charterer"`.
- **Resolution**: Verify that the referenced records exist and are active using GET queries against `/api/v1/vessels`, `/api/v1/ports`, or `/api/v1/counterparties`. Add the `"Charterer"` role to the counterparty if it's missing.

### 4. OpenAPI Codegen Drift
- **Problem**: Frontend compilation fails during type checking (`pnpm run typecheck` or in the CI pipeline).
- **Diagnostics**: Python DTOs or endpoints were added/changed in the backend, but the frontend schema wasn't updated.
- **Resolution**: Update the committed OpenAPI schema by running tests, then run `pnpm run codegen` in `frontend/` and commit the updated `frontend/src/api/schema.ts`.

### 5. TanStack Router / Lockfile Drift
- **Problem**: Frontend routing failures, typescript errors on page navigation, or security warning gates (`npm audit`) flag version conflicts in CI.
- **Diagnostics/Resolution**: Run `pnpm install` in `frontend/` to ensure `pnpm-lock.yaml` is clean and correctly generated. Run `pnpm audit --audit-level=high` to resolve dependencies before pushing commits.

---

## 6. Operational Notes

- **Authentication Stub**: The API operates on a user session dependency stub (`get_current_user`). No real OAuth/RBAC controls are active in Block 3. **DO NOT DEPLOY THIS TO PRODUCTION** until the Auth block (Block 3.5) is fully implemented.
- **No Production Deploy Posture**: The system relies on a local development server loop. Production deployment configuration (Caddy reverse proxy, container builds, and cloud deployment pipelines) is scheduled for Block 10.

---

## 7. Useful URLs

- **Local Swagger Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Local Raw OpenAPI JSON Spec**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
- **Vite Dev Server (Frontend)**: [http://localhost:5173](http://localhost:5173)
- **Committed OpenAPI Reference**: `openapi/openapi.json`

---

## 8. Where to Look Next

- **Detailed API contracts & DTO specs**: `docs/voyage_spine/specifications.md`
- **Data models & strict database constraints**: `docs/voyage_spine/architecture.md`
- **Tunable settings and caps (D-entries)**: `docs/voyage_spine/specifications.md` §2
- **Frontend structure & boundaries**: `frontend/README.md`
