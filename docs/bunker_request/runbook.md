# Block 8 — Bunker Request · Runbook

## Quick start

```bash
export DATABASE_URL=sqlite+aiosqlite:///./dev.db
uv run alembic upgrade head
uv run uvicorn src.app:create_app --factory --host 127.0.0.1 --port 8000
```

## Create a bunker request

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator","password":"password"}'

curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/voyages/<voyage-id>/bunker-requests \
  -H "Content-Type: application/json" \
  -d '{"fuel_type":"VLSFO","quantity_required_mt":450}'
# → 201 {id, status="Raised", ...}
```

## Status workflow

```
Raised → In Progress → Stemmed → Supplied  (terminal)
  └──────────────────────┴──────→ Blocked  (any non-terminal)
Blocked → Raised | In Progress | Stemmed    (unblock — supply target)
```

```bash
# Transition
curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/bunker-requests/<id>/transition \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress"}'

# Block (note mandatory)
curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/bunker-requests/<id>/transition \
  -H "Content-Type: application/json" \
  -d '{"status":"Blocked","blocker_note":"Supplier unresponsive"}'
```

`blocker_note` is mandatory when transitioning to Blocked — 422 without it.
`Supplied` is terminal — no further transitions.

## Tests

```bash
make test             # 420+ passed
uv run pytest tests/modules/bunker_request --cov=src/modules/bunker_request -q
cd frontend && pnpm run test && pnpm run test:e2e --workers=1
```
