# Block 10 — Tasks & Alerts · Runbook

## Quick start

```bash
export DATABASE_URL=sqlite+aiosqlite:///./dev.db
uv run alembic upgrade head
TESTING=true uv run uvicorn src.app:create_app --factory --host 127.0.0.1 --port 8000
```

## Health check

```bash
curl http://localhost:8000/health
# → {"status":"ok","db":"ok"}
```

No auth required. Caddy uses this endpoint for health checks.

## Create an alert

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator","password":"password"}'

curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '{"linked_entity_type":"Voyage","linked_entity_id":"<voyage-id>",
       "alert_type":"ETA Overdue","severity":"Warning",
       "message":"Vessel ETA has passed with no arrival report received."}'
# → 201 {id, triggered_at, resolved_at=null, ...}
```

## Resolve an alert

```bash
# Info — no resolution_note required
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/alerts/<id>/resolve \
  -H "Content-Type: application/json" -d '{}'

# Warning / Critical — resolution_note mandatory (422 without it)
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/alerts/<id>/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolution_note":"Vessel confirmed alongside at 14:30 UTC."}'
# → 200 {resolved_at, resolved_by, resolution_note, ...}
# Resolving an already-resolved alert → 409
```

## Create a task

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"linked_entity_type":"Voyage","linked_entity_id":"<voyage-id>",
       "title":"Chase agent for NOR acceptance",
       "due_datetime":"2026-06-02T08:00:00Z",
       "originating_alert_id":"<alert-id>"}'
# → 201 {id, status="Open", completed_at=null, ...}
```

## Transition task status

```bash
curl -s -b cookies.txt -X PATCH http://localhost:8000/api/v1/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"Done"}'
# → 200 {status="Done", completed_at="<now>", ...}
# completed_at is set by the service when status → Done; never passed by client
```

## Global feeds

```bash
# Unresolved critical/warning alerts
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/alerts?resolved=false&severity=Critical"

# Open/blocked tasks
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/tasks?status=Open"
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/tasks?status=Blocked"
```

## Exception dot

`GET /api/v1/voyages/<id>/workspace` returns `has_exception: true` when the
voyage has ≥ 1 unresolved Warning/Critical alert OR ≥ 1 non-Done task with
`due_datetime < now`. The Vessel Schedule Gantt reads this field and renders
the exception dot. No separate endpoint.

## Tests

```bash
make test                     # 468 passed (full suite)
uv run pytest tests/modules/alerts tests/modules/tasks -q
uv run pytest tests/modules/alerts/test_health.py -q

cd frontend
pnpm exec vitest run          # 92 tests
TESTING=true pnpm exec playwright test --workers=1
```

## Production deployment

### First boot

```bash
# 1. Clone repo and set env vars
cp .env.example .env          # fill DATABASE_URL, SESSION_SECRET_KEY, etc.

# 2. Bring up the stack
docker compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker compose -f docker-compose.prod.yml exec api \
  uv run alembic upgrade head

# 4. Verify health
curl https://<your-domain>/health
# → {"status":"ok","db":"ok"}
```

Full env var reference and first-boot checklist: `docs/deployment.md`.

### Update (new image)

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The CI `build-and-push` job tags images `latest` + git SHA on every merge to
`main`. `ghcr.io/<org>/erp-ops-api:latest` always reflects current `main`.

## Note on e2e

E2e backend must start with `TESTING=true` to disable the login rate limiter
(5/min/IP). CI sets this automatically. Locally: `TESTING=true uv run uvicorn ...`
Run Playwright with `--workers=1` (serial) to avoid seed-data concurrency
issues (OPEN_DECISIONS §17).
