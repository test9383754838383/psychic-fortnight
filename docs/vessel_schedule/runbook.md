# Block 4 — Vessel Schedule · Runbook

This runbook covers operational procedures, troubleshooting, and development workflows for the **Vessel Schedule** and **Voyage Workspace** features — two read-only endpoints in `voyage_spine` (`GET /api/v1/schedule`, `GET /api/v1/voyages/{id}/workspace`) and two frontend pages (`/schedule`, `/voyages/$id/workspace`).

---

## 1. How to Run Locally

### Backend
```bash
make dev
```
FastAPI on [http://localhost:8000](http://localhost:8000). SQLite at `dev.db`.

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```
Vite on [http://localhost:5173](http://localhost:5173). The `/api` proxy routes to `http://localhost:8000`.

### Reaching the schedule
Block 4 is behind real auth (Block 3.5). To see the schedule:
1. Boot backend + frontend.
2. Ensure an Admin user exists (see §2).
3. Open [http://localhost:5173](http://localhost:5173), log in.
4. You land on `/schedule`. Click any voyage bar → Voyage Workspace.

---

## 2. Seeding Data That Produces a Visible Schedule

The schedule only shows **active vessels** with voyages that **overlap the visible date window** (default: today −30d to +30d, D-24). If the schedule is empty, this is almost always why.

### Step 1: Create an Admin user (if none)
```bash
uv run python -c "
import asyncio
from src.dependencies import AsyncSessionLocal
from src.modules.auth.services.auth_service import AuthService

async def main():
    async with AsyncSessionLocal() as session:
        await AuthService(session).create_user('admin', 'admin', ['Admin'])

asyncio.run(main())
"
```

### Step 2: Log in and store the session cookie
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}' \
  -c cookies.txt
```
All subsequent calls use `-b cookies.txt`.

### Step 3: Seed master data + a voyage in the window
Follow **Block 3 runbook §2** (vessel → ports → counterparty+Charterer role → voyage → itinerary lines), adding `-b cookies.txt` to each call. Set the voyage `commencing_datetime` within the next 30 days so it appears in the default window. Example minimal voyage:

```bash
curl -X POST http://localhost:8000/api/v1/voyages \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{
    "voyage_no": "VOY-PAC-001",
    "vessel_ref": "<vessel_uuid>",
    "commencing_datetime": "<within ±30 days>",
    "charterer_ref": "<counterparty_uuid>",
    "terms": {"charterer_name": "Cargill Inc", "cp_type": "VC", "cp_date": "2026-05-28", "cp_document_ref": "CP-0045"}
  }'
```
Add at least two itinerary lines so `expected_completing_datetime` is set (recomputed from max planned ETD) and the bar has width.

### Step 4: Verify the schedule endpoint
```bash
curl -G http://localhost:8000/api/v1/schedule -b cookies.txt \
  --data-urlencode "date_from=2026-05-01" \
  --data-urlencode "date_to=2026-07-01"
```
Should return the vessel with its voyage bar.

---

## 3. How the Overlap Query Works

A voyage appears on the schedule when it overlaps the window:
```
commencing_datetime <= date_to  AND  expected_completing_datetime >= date_from
```
- A voyage entirely inside, spanning, or touching either boundary is **included**.
- A voyage entirely before `date_from` or entirely after `date_to` is **excluded**.
- The window is capped at **365 days** (D-25); larger ranges return `422`.

To widen/narrow what you see, change the date range in the filter bar (frontend) or the `date_from`/`date_to` params (API). All datetimes are **UTC**; date params are interpreted as UTC.

---

## 4. OpenAPI Inspection & Frontend Type Codegen

Same pipeline as Block 3 (see Block 3 runbook §3):
1. Regenerate backend schema:
   ```bash
   PYTHONPATH=. uv run python scripts/generate_openapi.py
   ```
2. Regenerate frontend types:
   ```bash
   cd frontend && pnpm run codegen
   ```
3. Verify:
   ```bash
   pnpm run typecheck
   ```
The schedule and workspace response types live in `frontend/src/api/schema.ts` after codegen.

---

## 5. Common Failure Modes

### 1. Empty schedule
- **Cause**: No active vessels, or no voyages overlapping the window.
- **Resolution**: Confirm the vessel `status` is `Active`. Confirm a voyage's `commencing_datetime`/`expected_completing_datetime` overlaps the window. Widen the date range. Verify directly via the `/api/v1/schedule` curl in §2.

### 2. ECharts chart not rendering (blank area)
- **Cause**: The chart container has zero height, or `setOption` ran before the container was laid out.
- **Resolution**: Ensure the chart container div has an explicit height. The component calls `echarts.init` in a mount effect and `setOption` in a data effect — if the container is collapsed, the canvas renders 0×0. Check the parent layout's CSS height.

### 3. Playwright bar-click failing in e2e
- **Cause**: The DOM overlay hit-targets (D-LOCK-4) are not positioned over the canvas, or `data-testid="voyage-bar-{id}"` is missing for the expected voyage.
- **Resolution**: The e2e test clicks the DOM overlay button, not canvas pixels. Confirm the overlay renders one button per visible voyage with the correct `voyage_id`. Do not switch to coordinate clicking — it is brittle by design choice.

### 4. OpenAPI codegen drift
- **Cause**: Backend schedule/workspace DTOs changed but frontend types weren't regenerated.
- **Resolution**: Regenerate per §4, commit `frontend/src/api/schema.ts`.

### 5. Timezone confusion on the date window
- **Cause**: Interpreting the window in local time. All storage and API contracts are UTC.
- **Resolution**: Pass ISO dates; treat them as UTC. A voyage near a boundary may appear/disappear if you assume local time.

### 6. `current_next_port_code` looks wrong
- **Cause**: Derivation depends on status — Scheduled shows the first itinerary port; Commenced shows the next un-passed port; a voyage with no itinerary shows `null`.
- **Resolution**: This is expected behaviour, not a bug. Verify the voyage status and itinerary against `specifications.md` §1.

---

## 6. Operational Notes

- **Read-only**: Block 4 displays voyages; it does not edit them. Voyage edits stay in the Block 3 voyage endpoints. Editing from the workspace UI comes in a later block.
- **Alert dot is dormant**: Each bar can render a small alert dot, but no alert/task data feeds it until Block 10.
- **No port-call data**: The schedule reflects planned itinerary ETDs only. Actual arrival/departure execution (Port Call) is Block 5.
- **No production deploy posture**: Local dev loop only. Production (Caddy, container builds, pipelines) is Block 10.

---

## 7. Useful URLs

- **Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Raw OpenAPI**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
- **Vite Dev (Schedule)**: [http://localhost:5173/schedule](http://localhost:5173/schedule)
- **Committed OpenAPI Reference**: `openapi/openapi.json`

---

## 8. Where to Look Next

- **API contract & D-entries**: `docs/vessel_schedule/specifications.md`
- **Topology, ECharts integration, core flows**: `docs/vessel_schedule/architecture.md`
- **Locked tactical decisions (D-LOCK-1..8)**: `docs/vessel_schedule/locked_decisions.md`
- **Charting library rationale**: `docs/adr/0017-echarts-supersedes-bryntum.md`
- **Frontend structure & boundaries**: `frontend/README.md`
