# Block 9 — Delay Tracking · Runbook

## Quick start

```bash
export DATABASE_URL=sqlite+aiosqlite:///./dev.db
uv run alembic upgrade head
uv run uvicorn src.app:create_app --factory --host 127.0.0.1 --port 8000
```

## Create a delay

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator","password":"password"}'

curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/voyages/<voyage-id>/delays \
  -H "Content-Type: application/json" \
  -d '{"delay_type":"Weather","fault_attribution":"Weather",
       "start_datetime":"2026-06-01T06:00:00Z","description":"Heavy swell"}'
# → 201 {id, approved_by=null, actual_duration=null, ...}
```

## Approve (locks the record)

```bash
curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/delays/<id>/approve
# → 200 {approved_by=<user-id>, ...}
# Any PATCH after this → 409
```

`actual_duration` is derived from `end_datetime - start_datetime` (hours). Not stored — computed on read.

`port_call_id` and `leg_ref` are mutually exclusive anchors; both nullable = voyage-level delay.

## Tests

```bash
make test             # 420+ passed
uv run pytest tests/modules/delay_tracking --cov=src/modules/delay_tracking -q
cd frontend && pnpm run test && pnpm run test:e2e --workers=1
```

## Note on e2e

E2e backend must start with `TESTING=true` to disable the login rate limiter.
CI handles this automatically. Locally: `TESTING=true uv run uvicorn ...`
