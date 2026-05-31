# Block 7a — Forms (LLM Email-to-Form Ingest) · Runbook

## 1. Quick start

```bash
# Backend
export OPENAI_API_KEY=sk-...          # required in production
export FORMS_LLM_MODEL=gpt-4o-mini   # default; override as needed
export DATABASE_URL=sqlite+aiosqlite:///./dev.db
uv run alembic upgrade head
uv run uvicorn src.app:create_app --factory --host 127.0.0.1 --port 8000

# Frontend (separate terminal)
cd frontend && pnpm run dev
```

Open http://localhost:5173/forms for the review queue.

## 2. Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | prod only | — | OpenAI auth. Not needed in CI (LLM faked). |
| `FORMS_LLM_MODEL` | no | `gpt-4o-mini` | Model id. Override for cost/capability trade-off. |
| `OPENAI_BASE_URL` | no | OpenAI default | Provider endpoint. The Ollama seam — unused in V1a. |
| `FORMS_LLM_TIMEOUT_S` | no | `30` | Per-call timeout in seconds. |
| `RUN_LLM_EVALS` | no | unset | Set to `1` to run live-model golden-corpus evals. Never set in CI. |

## 3. Paste-to-parse (the primary workflow)

```bash
# 1. Seed a test user (if needed)
uv run python scripts/seed_e2e_user.py

# 2. Login and get session cookie
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator","password":"password"}'

# 3. Parse a noon report
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/forms/parse \
  -H "Content-Type: application/json" \
  -d '{
    "raw_text": "NOON REPORT\nVessel: MV EXAMPLE\nDate: 2026-05-31 12:00 UTC\nPosition: 51.5N 000.1W\nSpeed: 12.5 kn\nDTG: 245 NM\nETA: 2026-06-02 06:00 UTC\nBunker ROB: 450 MT",
    "form_type": "Noon",
    "voyage_id": "<voyage-uuid>"
  }'
# Returns 201 with form_id + parsed fields + attempt metadata

# 4. Review in the UI: http://localhost:5173/forms
# Or via API:
curl -s -b cookies.txt http://localhost:8000/api/v1/forms/<form-id>

# 5. Accept (requires Operations or Admin role)
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/forms/<form-id>/transition \
  -H "Content-Type: application/json" \
  -d '{"status": "Accepted"}'
```

## 4. Manual entry (no LLM)

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/forms \
  -H "Content-Type: application/json" \
  -d '{
    "form_type": "Arrival",
    "port_call_id": "<port-call-uuid>",
    "raw_fields": {"ata": "2026-05-31T08:00:00Z", "pilot_on_board": "2026-05-31T07:45:00Z"},
    "notes": "Manual entry"
  }'
```

## 5. Status lifecycle (FSM)

```
Received ──▶ Under Review ──▶ Accepted  (terminal)
    │              │
    │              └──▶ Queried ──▶ Under Review
    │                        └──▶ Rejected  (terminal)
    ├──▶ Accepted  (direct, clean parse reviewed immediately)
    └──▶ Rejected  (terminal)
```

- `Accepted` and `Rejected` are terminal — no further transitions.
- Transitioning to `Accepted` or `Rejected` requires **Admin** or **Operations** role (403 otherwise).
- `reviewed_by` / `reviewed_at` are set only on `Accepted` / `Rejected`.
- `accepted_parse_attempt_id` is set on acceptance, linking the form to the parse that produced it.

## 6. Form types

`Noon` (voyage-level) · `Arrival` · `Departure` · `Bunkering` · `Statement of Facts` (port-call-level).

Voyage-level forms require `voyage_id`; port-call-level require `port_call_id`. Both are validated by XOR CHECK in the DB — exactly one must be set.

## 7. LLM parse failure handling

A failed parse (invalid JSON after one retry, or provider timeout) returns **HTTP 201** with the form in `Received` and `parse_failed: true`. The form is preserved for manual review — it is never discarded.

The operator can:
1. Edit the `raw_fields` manually via `PATCH /api/v1/forms/{id}`.
2. Transition it normally once corrected.

The `FormParseAttempt` audit rows record both the initial attempt and the retry, including the error message, token counts, and cost estimate.

## 8. Cost tracking

Every parse call writes a `FormParseAttempt` row with:
- `provider`, `model`, `prompt_version`, `schema_version`
- `input_tokens`, `output_tokens`, `cost_estimate` (static price map in `src/modules/forms/llm/pricing.py`)
- `latency_ms`, `retry_no`, `status`, `error_message`

Query cost by period:

```sql
SELECT date(created_at) AS day,
       SUM(cost_estimate) AS total_cost,
       SUM(input_tokens + output_tokens) AS total_tokens,
       COUNT(*) AS parse_count
FROM form_parse_attempts
WHERE status = 'SUCCESS'
GROUP BY day
ORDER BY day DESC;
```

## 9. Test commands

```bash
# Full backend suite
make test                          # 360 passed, 1 skipped

# Forms module only + coverage
uv run pytest tests/modules/forms --cov=src/modules/forms --cov-report=term-missing
# Expected: 69 passed, 1 skipped, ≥95% coverage

# Golden corpus (offline prompt quality — no live model)
uv run pytest tests/modules/forms/test_golden.py -v

# Live LLM evals (manual only, never CI)
RUN_LLM_EVALS=1 uv run pytest tests/modules/forms/test_live_eval.py -v -s

# Frontend unit tests
cd frontend && pnpm run test       # 66 passed

# Frontend e2e (always --workers=1, locally and CI)
cd frontend && pnpm run test:e2e --workers=1
```

## 10. Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `POST /forms/parse` returns 201 with `parse_failed: true` | LLM returned invalid JSON after retry, or provider timeout | Review form manually; check `FormParseAttempt` for error message |
| `POST /forms/parse` returns 422 | Invalid `form_type`, missing `raw_text`, or both/neither anchor set | Fix the request payload |
| `POST /forms/{id}/transition` returns 403 | Caller lacks Admin/Operations role | Use a privileged account |
| `POST /forms/{id}/transition` returns 409 | Illegal FSM transition, or form is already terminal | Check current status; terminal forms cannot be re-transitioned |
| `PATCH /forms/{id}` returns 409 | Form is already Accepted or Rejected | Cannot edit terminal forms |
| `openai.AuthenticationError` | `OPENAI_API_KEY` missing or invalid | Set the env var |
| `openai.Timeout` | Provider latency exceeded `FORMS_LLM_TIMEOUT_S` | Increase timeout or retry; parse attempt is recorded |
| Frontend `tsc` fails with TS2502 | Recursive `JsonValue` leaked into OpenAPI schema | `types.py` must use `dict[str, object]` — see commit `10a70c8` |

## 11. Deferred / known debt

- **Ollama local fallback** — seam exists (`OPENAI_BASE_URL`); `OllamaStructuredClient` not built. See `OPEN_DECISIONS §19`.
- **IMAP live ingest** — phased design; paste/submit only in V1a. Seam: `FormDetail.raw_source_ref` + `raw_text_hash` + `source_type`. See `OPEN_DECISIONS §10`.
- **Live LLM eval CI gate** — evals run manually behind `RUN_LLM_EVALS=1`. Promote to nightly job when golden corpus is large enough.
- **`maxItems` missing from sanitizer `FORBIDDEN_KEYS`** — minor gap in `src/modules/forms/llm/schema.py`; add `"maxItems"` to `FORBIDDEN_KEYS`.
- **Provider name sniffed from class name** — `parser.py:177` detects provider from `client.__class__.__name__`; should be a `StructuredClient` property.
- **`act()`/hydrate warnings in role-aware component tests** — same pattern as Block 6 `OPEN_DECISIONS §18`; cosmetic noise, tests pass.
