# Block 7a — Forms (LLM Email-to-Form Ingest) · Architecture

Cites ADRs and `docs/forms/locked_decisions.md` (D-LOCK-1..21). Where this doc and
the locked decisions disagree, the locked decisions win.

## 1. System overview

`forms` is a new module in the modular monolith [ADR-0001]. It adds an LLM intake
pipeline on top of the existing voyage/port-call spine. The module has two
responsibilities that are deliberately kept separate:

1. **Extraction** — turn raw email text into a validated, typed candidate
   (the LLM boundary; the only place the LLM SDK lives).
2. **Review workflow** — persist that candidate as an untrusted `Form`, let a
   human accept/query/reject it, and record an audit trail.

The boundary between them is the rule that makes the block safe: **extraction
produces candidates; only human acceptance confers trust** [D-LOCK-13]. No
parsed value flows into any trusted entity (`OperationalReport`, `PortCall`)
automatically.

```
            ┌─────────────────────────── forms module ───────────────────────────┐
 raw email  │  api/ ──▶ service/ ──▶ llm/  (FormParserService, StructuredClient)  │
   text ───▶│                │            └─▶ OpenAIStructuredClient ─▶ OpenAI API │
 (paste)    │                ▼                                                     │
            │           repository/ ──▶ Form · FormDetail · FormParseAttempt (DB)  │
            └─────────────────────────────────────────────────────────────────────┘
                 outward deps (scalar FK only): voyage_spine · port_call ·
                 master_data · auth        [Tach-enforced, no reverse imports]
```

## 2. Layers

Same layering as every prior module (api → service → repository → models), plus a
dedicated `llm/` sub-package for the agent boundary.

```
src/modules/forms/
  api/            FastAPI routers + request/response DTOs (Pydantic)
  service/        FormService (workflow/FSM), FormParserService (orchestration)
  repository/     advanced-alchemy repos for Form, FormDetail, FormParseAttempt
  models/         SQLAlchemy ORM models + the per-form-type Pydantic schemas
  llm/            ── the ONLY place the LLM SDK is imported ── [D-LOCK-4]
    client.py     StructuredClient protocol + OpenAIStructuredClient
    schema.py     model_json_schema() export + strict-mode sanitizer
    prompts/      one versioned prompt per form_type            [D-LOCK-5]
  constants.py    FORM_TYPES (local copy), LEGAL_TRANSITIONS
```

- **`api/`** — thin. Validates DTOs, calls a service, maps domain errors to HTTP.
  No business logic, no LLM imports.
- **`service/`**
  - `FormParserService.parse(raw_text, form_type, ...)` orchestrates: pick
    schema + prompt → call the `StructuredClient` → validate into the Pydantic
    model → on failure, one bounded retry → persist `FormParseAttempt` (always) →
    on success, create `Form(Received)` + `FormDetail`. [D-LOCK-7, D-LOCK-8]
  - `FormService` owns the review workflow: FSM transitions, role checks,
    in-place lifecycle mutation, append-only audit rows. [D-LOCK-12, D-LOCK-14]
- **`repository/`** — real-DB persistence only [ADR-0011]. No business rules.
- **`llm/`** — provider adapter behind a protocol; the SDK never escapes here.

## 3. The LLM boundary (12-Factor Agent)

```python
class StructuredClient(Protocol):
    def complete_structured(
        self, *, prompt: str, raw_text: str, json_schema: dict, model: str
    ) -> StructuredResult: ...   # returns raw JSON string + token/latency usage
```

- **One concrete adapter in V1a:** `OpenAIStructuredClient`, using
  `response_format={"type": "json_schema", "json_schema": {...}, "strict": True}`
  [ADR-0014, D-LOCK-2]. The interface exists so `OllamaStructuredClient` is a
  drop-in later — **not built in V1a** [D-LOCK-3, OPEN_DECISIONS §19].
- **Config, not code:** provider, model, `OPENAI_BASE_URL`, API key are read from
  the environment [12-Factor Agent]. Domain code names none of them.
- **Schema discipline** [D-LOCK-6]: one flat Pydantic model per `form_type`;
  `model_json_schema()` is run through a **sanitizer** that removes strict-mode-
  unsupported keywords (`pattern`, `format`, `minLength`/`maxLength`,
  `minimum`/`maximum`, `minItems`, top-level `anyOf`) and marks every property
  required (optional = nullable-required). Business constraints (ranges, formats)
  are enforced afterward by Pydantic validators, not by the JSON Schema.
- **Prompts are owned artifacts** [D-LOCK-5]: one file per form type under
  `llm/prompts/`, each carrying a `prompt_version`. Prompts are never inline
  string literals in service code.
- **Bounded retry** [D-LOCK-7]: validation failure → ONE re-prompt that includes
  the validation error → still invalid ⇒ the parse is marked failed and the form
  is surfaced for manual review. No loop, no infinite spend.

## 4. Core flow

### Parse (paste/submit) — synchronous [D-LOCK-17]

```
POST /api/v1/forms/parse {raw_text, form_type, voyage_id|port_call_id}
  → FormParserService.parse(...)
      pick schema(form_type) + prompt(form_type, version)
      sanitize schema → StructuredClient.complete_structured(...)   [await, timeout]
      record FormParseAttempt(attempt 1, tokens, cost, latency, status)
      validate JSON → Pydantic model
        ├─ ok    → create Form(status=Received) + FormDetail(raw_fields, hash, paste)
        └─ fail  → ONE retry w/ error → record FormParseAttempt(attempt 2)
                     ├─ ok   → create Form(Received) + FormDetail
                     └─ fail → Form(Received) flagged parse_failed for manual fix
  → 201 {form_id, parsed fields, attempts}
```

Synchronous is correct for a single operator pasting one email and waiting; the
MLP has no ingestion stream yet, and APScheduler [ADR-0013] is reserved for the
future IMAP channel [D-LOCK-17].

### Review — in-place workflow [D-LOCK-12]

```
GET   /api/v1/forms                 review queue (filter status/type/anchor)
GET   /api/v1/forms/{id}            form + FormDetail (parsed vs raw)
PATCH /api/v1/forms/{id}            correct pre-accept fields
POST  /api/v1/forms/{id}/transition {status}  → FSM + role gate
```

## 5. Data model

```
Form                                 FormDetail (1:1)          FormParseAttempt (audit, append-only)
  id                                   form_id  UNIQUE FK         id
  form_type   CHECK(5 values)          raw_fields  JSON/JSONB     form_id  FK (nullable)
  voyage_id?      ┐ XOR CHECK          raw_source_ref             provider · model
  port_call_id?   ┘                    raw_text_hash              prompt_version · schema_version
  status      CHECK(FSM states)        source_type  (=paste)      retry_no
  submitted_by · submitted_at                                     input_tokens · output_tokens
  received_at                                                     cost_estimate · latency_ms
  assigned_to? · reviewed_by? · reviewed_at?                      status · error_message
  notes?
  accepted_parse_attempt_id?
```

- `form_type` and `status`: String + CheckConstraint, no lookup tables
  [D-LOCK-9, D-LOCK-12] — same pattern as Block 6.
- `voyage_id` XOR `port_call_id`: CHECK constraint [D-LOCK-10], same as Block 6
  `OperationalReport`. Parser may suggest; service validates; operator corrects.
- `FormDetail` minimal source fields (`raw_source_ref`, `raw_text_hash`,
  `source_type`) ARE the IMAP seam — **no `FormSource` entity, no email-header
  columns in V1a** [D-LOCK-8, CLAUDE.md §1].
- `FormParseAttempt` is append-only audit; `Form` is in-place mutable
  [D-LOCK-14]. Cost/token capture satisfies 12-Factor-Agent auditability.
- No ORM relationship reaches *into* `forms` from other modules; cross-module
  references are scalar FKs only [D-LOCK-15], navigated from the `forms` side.

## 6. Auth posture

Session auth [ADR-0016] as everywhere else. All endpoints require
`get_current_user`. The state-changing trust gate — transition to `Accepted` or
`Rejected` — additionally requires the **Admin** or **Operations** role
[D-LOCK-18], the same `require_role({Admin, Operations})` gate Block 6 used for
report acceptance. Parsing and manual creation need only an authenticated user.

## 7. Async / streaming

None in V1a. Parse is synchronous request/response [D-LOCK-17]. No streaming
token output (the operator needs the final validated object, not a live stream),
no background workers, no APScheduler. The async seam for the future IMAP poller
is the `parse()` signature plus `FormDetail` source fields — the poller would
create source records and enqueue parse jobs without knowing parsing rules
[D-LOCK-8, locked_decisions §"Seams"].

## 8. Learning loop

Deliberately minimal in V1a, but the data to support one is captured:
- Every parse writes a `FormParseAttempt` (prompt/schema version, tokens, cost,
  outcome). This is the audit substrate for later prompt iteration.
- The **golden corpus** (stored email fixtures → expected Pydantic objects) is
  the offline regression harness; prompt changes are validated against it
  without burning tokens in CI [D-LOCK-20].
- Live-model evals run manually/nightly behind `RUN_LLM_EVALS=1`, never a CI
  blocker initially. No automated fine-tuning, no feedback-to-model loop in V1a —
  the human accept/query/reject decision is the only "label," and it stays in the
  DB for future use.

## 9. Test architecture [D-LOCK-20]

- **Fake the LLM client, real DB** — `StructuredClient` is injected; tests supply
  a fake returning canned valid JSON / invalid JSON / timeout. CI never calls a
  live model.
- **Unit:** parser orchestration (valid → Form, invalid → retry → manual,
  error → handled); sanitizer keyword stripping; FSM legality.
- **Integration (real DB):** `Form`/`FormDetail`/`FormParseAttempt` persistence,
  full FSM incl. role gate, XOR anchor, cross-module FK validation.
- **Golden corpus:** offline prompt-quality fixtures.
- **Frontend:** Vitest + RTL; Playwright e2e paste → parse(faked) → review →
  accept.

## 10. Milestones

M1 LLM core · M2 persistence + FSM + API · M3 frontend [D-LOCK-21]. Detailed
terminal prompts in `plan.md`.
