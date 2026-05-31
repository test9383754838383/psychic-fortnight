# Block 7b — Checklists · Runbook

## 1. Quick start

```bash
export DATABASE_URL=sqlite+aiosqlite:///./dev.db
uv run alembic upgrade head
uv run uvicorn src.app:create_app --factory --host 127.0.0.1 --port 8000
# Frontend: cd frontend && pnpm run dev
```

Checklist panel appears inside the Port Call / Voyage Workspace view.

## 2. Create a checklist (curl)

```bash
# Login
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator","password":"password"}'

# Create Pre-Arrival checklist for a port call
curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/port-calls/00000000-0000-0000-0000-000000000004/checklists \
  -H "Content-Type: application/json" \
  -d '{"checklist_type": "Pre-Arrival"}'
# Returns 201 with checklist + 5 seeded items (all Pending)

# List checklists for a port call
curl -s -b cookies.txt \
  http://localhost:8000/api/v1/port-calls/00000000-0000-0000-0000-000000000004/checklists
```

## 3. Sign off an item

```bash
curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/checklist-items/<item-uuid>/sign-off
# Returns 200 with updated item (Signed Off + signed_off_by + signed_off_at)
# When the LAST item is signed off, the parent checklist auto-completes (status=Completed)
```

## 4. Default item sets

Fixed constants in `src/modules/checklists/constants.py`. Not configurable in V1.

**Pre-Arrival (5 items)**
1. Pre-arrival notice sent to agent
2. Berth/anchorage confirmed
3. Pilot booked
4. Cargo documents received
5. NOR tender readiness confirmed

**Pre-Departure (5 items)**
1. Cargo operations completed
2. Statement of Facts signed
3. Outstanding disbursements reviewed
4. Departure clearance obtained
5. Next-port ETA communicated

## 5. Completion rule

A checklist becomes `Completed` **only** when every item is `Signed Off`. There is no manual complete endpoint — completion is derived. A single `Pending` item keeps the checklist `Open`.

Re-signing an already-signed item is **idempotent** — the original actor/time are preserved (D-ENTRY-3).

## 6. Error reference

| Condition | HTTP |
|---|---|
| Unknown checklist_type | 422 |
| Port call or item not found | 404 |
| Unauthenticated | 401 |

No extra role gate — sign-off is the operator's own attestation.

## 7. Test commands

```bash
# Full backend suite
make test                    # 374 passed, 1 skipped

# Checklists only + coverage
uv run pytest tests/modules/checklists --cov=src/modules/checklists -q
# Expected: 14 passed, 100% coverage

# Frontend unit tests
cd frontend && pnpm run test  # 71 passed

# E2e (always --workers=1)
cd frontend && pnpm run test:e2e --workers=1
# checklists.spec: create → sign off all → Completed
```

## 8. Known debt / notes

- **Configurable templates** deferred — default item sets are fixed constants. If an operator needs custom items, edit `constants.py` until a template-configurator block is built.
- **E2e rate-limit fix** — `TESTING=true` must be set on the e2e backend (CI does this). Running e2e locally without it will 429 on the login endpoint after ~5 logins (slowapi brute-force limiter, ADR-0016). Use: `TESTING=true uv run uvicorn ...`
