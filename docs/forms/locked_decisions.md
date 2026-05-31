# Block 7a — Forms (LLM Email-to-Form Ingest) · Locked Decisions

Implementation contract. Derived from Prompt A (`NO_FIT`) + Prompt B (stack
verification, 2026-05-31) + founder gates. `D-LOCK-n` items are binding on the
coding terminals. Where Prompt B overrode a preliminary decision, the override is
the locked position.

## Headline

- **D-LOCK-1 — ADR-0014 stands.** Build with the OpenAI SDK + Pydantic v2
  provider-native Structured Outputs (`response_format: json_schema`,
  `strict:true`). **Do NOT re-adopt Instructor.** A bounded service-layer retry
  replaces Instructor's retry; that is a few lines, auditable, no wrapper dep.

## LLM boundary (12-Factor Agent)

- **D-LOCK-2 — Provider adapter, not a blind base-URL swap.** Define a
  `StructuredClient` interface; ship one concrete `OpenAIStructuredClient`.
  Provider, model, base URL, API key are env config — never in domain code.
  (Overrides the ADR-0014 assumption that Ollama is a drop-in `OPENAI_BASE_URL`
  swap.)
- **D-LOCK-3 — Ollama fallback is a SEAM ONLY in V1a.** No working
  `OllamaStructuredClient`, no Ollama tests. Founder decision; logged
  `OPEN_DECISIONS §19`. The interface exists so it is a drop-in later.
- **D-LOCK-4 — SDK isolation.** The LLM SDK is imported ONLY inside
  `src/modules/forms/llm/`. The rest of the app calls
  `FormParserService.parse(raw_text, form_type, schema_version, prompt_version)`.
  Tach enforces the boundary.
- **D-LOCK-5 — Versioned prompts.** One prompt per `form_type`, stored as
  versioned artifacts under `src/modules/forms/llm/prompts/` (not inline
  literals). `prompt_version` is captured per call.
- **D-LOCK-6 — One flat schema per form type.** No top-level `anyOf`, no
  discriminated union across the 5 form types. Strict mode forbids `pattern`,
  `format`, `min*/max*`, etc. — optional fields are modelled as nullable-required
  keys; business constraints are enforced by Pydantic post-validation, not JSON
  Schema. A schema sanitizer strips unsupported keywords before the strict call.
- **D-LOCK-7 — Bounded retry.** On strict-mode/Pydantic validation failure: ONE
  re-prompt including the validation error, then fail to manual review. No loop.

## Data model

- **D-LOCK-8 — Three persisted entities + minimal source fields (no FormSource
  entity).**
  - `Form` — workflow/queryable: `form_id`, `form_type`, `voyage_id?`,
    `port_call_id?`, `status`, `submitted_by`, `submitted_at`, `received_at`,
    `assigned_to?`, `reviewed_by?`, `reviewed_at?`, `notes?`,
    `accepted_parse_attempt_id?`.
  - `FormDetail` — one-to-one with Form (unique FK): `raw_fields` (JSON/JSONB
    secondary parsed data), `raw_source_ref`, `raw_text_hash`, `source_type`
    (`paste` in V1a). **These minimal source fields ARE the IMAP seam.**
  - `FormParseAttempt` — audit row (NOT overloaded onto Form): `provider`,
    `model`, `prompt_version`, `schema_version`, `retry_no`, `input_tokens`,
    `output_tokens`, `cost_estimate`, `latency_ms`, `status`, `error_message`,
    `form_id?` (nullable until a Form is created).
  - **Override of Prompt B:** NO standalone `FormSource` entity with email
    headers (`subject`/`from`/`to`/`external_message_id`/`attachment_refs`) in
    V1a — that is IMAP-channel future-proofing, banned by `CLAUDE.md §1`. The
    `FormDetail` source fields + `raw_text_hash` idempotency key are sufficient
    to add a `FormSource` table later as a clean Alembic append.
- **D-LOCK-9 — `form_type` = String + CheckConstraint (5 values).** No lookup
  table. Values: `Noon`, `Arrival`, `Departure`, `Bunkering`,
  `Statement of Facts`.
- **D-LOCK-10 — `voyage_id` XOR `port_call_id` CHECK** (same pattern as Block 6
  `OperationalReport`). The parser may *suggest* the anchor; the service
  validates the XOR; the operator can correct it. No silent inference.
- **D-LOCK-11 — Duplicate the form-type enum locally.** `forms` does NOT depend
  on `operational_reporting`. A unit test asserts
  `set(FORM_TYPES) == {"Noon","Arrival","Departure","Bunkering","Statement of Facts"}`
  to keep the two modules' vocabularies aligned.

## State machine

- **D-LOCK-12 — `Form.status` FSM (explicit-dict LEGAL_TRANSITIONS, Block 6
  pattern):**
  - `Received → Under Review`, `Received → Accepted`, `Received → Rejected`
  - `Under Review → Queried`, `Under Review → Accepted`, `Under Review → Rejected`
  - `Queried → Under Review`, `Queried → Rejected`
  - `Accepted` terminal · `Rejected` terminal
  - Direct `Received → Accepted` allowed (clean parse, reviewed immediately).
- **D-LOCK-13 — Acceptance is the trust gate.** Parse creates UNTRUSTED candidate
  data (`Received`). No downstream state mutates automatically. Only an operator
  transition to `Accepted` confirms it.
- **D-LOCK-14 — Form lifecycle is in-place mutation** (`reviewed_by`/`reviewed_at`
  set on transition), unlike Block 6's append-only events. BUT
  `FormParseAttempt` rows are append-only audit, and transition history is
  recorded as append-only audit rows.

## Module boundaries

- **D-LOCK-15 — New `forms` Tach module.** Outward deps only:
  `forms → voyage_spine`, `forms → port_call`, `forms → master_data`,
  `forms → auth` (public surfaces, scalar FKs). Those modules must NOT import
  `forms`. NO `forms → operational_reporting` (see D-LOCK-11).

## API shape (phased — paste/submit, no IMAP)

- **D-LOCK-16 — Routes:**
  - `POST /api/v1/forms/parse` — `{raw_text, form_type, voyage_id|port_call_id}`
    → runs `FormParserService` synchronously → creates `Form(Received)` +
    `FormDetail` + `FormParseAttempt` → returns `form_id` + parsed result.
  - `POST /api/v1/forms` — manual-entry fallback (no LLM).
  - `GET /api/v1/forms` — review queue; filter by status/type/anchor.
  - `GET /api/v1/forms/{id}` — one form with `FormDetail`.
  - `PATCH /api/v1/forms/{id}` — edit pre-accept fields.
  - `POST /api/v1/forms/{id}/transition` — `{status}` FSM transition.
- **D-LOCK-17 — Synchronous parse.** Await the provider inline (with timeout)
  for the human paste flow. Do NOT use APScheduler (ADR-0013) here — that is for
  the future IMAP background channel only.

## Auth

- **D-LOCK-18 — All endpoints require `get_current_user`.** Transition to
  `Accepted`/`Rejected` requires Admin or Operations role (same gate as Block 6
  report acceptance).

## Frontend

- **D-LOCK-19 — New `/forms` review-queue route** (primary surface: queue +
  review), plus an optional Voyage Workspace panel listing forms linked to the
  open voyage. The review view shows parsed fields beside raw source with
  approve / query / reject controls and a paste-to-parse box. No charts, no maps.

## Testing

- **D-LOCK-20 — Fake the LLM client, real DB (ADR-0011).** CI NEVER calls a live
  model.
  - Unit: fake client returns valid JSON / invalid JSON / timeout-or-error.
  - Integration: real DB + fake parser → assert `Form`/`FormDetail`/
    `FormParseAttempt` persistence + full FSM incl. role checks + XOR anchor +
    cross-module FK validation.
  - Prompt-quality: offline GOLDEN CORPUS — stored maritime email fixtures →
    expected Pydantic objects. Live-model evals run manually/nightly behind
    `RUN_LLM_EVALS=1`, never a CI blocker initially.

## Milestones

- **D-LOCK-21 — Three milestones (the LLM boundary earns its own):**
  - M1 — LLM core: `StructuredClient` interface + `OpenAIStructuredClient` +
    per-form schemas/prompts + sanitizer + bounded retry + fake-client tests +
    golden corpus.
  - M2 — `Form`/`FormDetail`/`FormParseAttempt` persistence + FSM + auth + API +
    real-DB tests.
  - M3 — Frontend `/forms` review queue + paste-to-parse + Playwright e2e
    (paste → parse[faked] → review → accept).

## Seams that MUST be right now (for IMAP later, per Prompt B Q6)

1. `FormParserService.parse(raw_text, form_type, schema_version, prompt_version)`.
2. `FormDetail` source fields (`raw_source_ref`, `raw_text_hash`, `source_type`)
   sufficient to add a `FormSource` table later without rework.
3. Idempotency key: `raw_text_hash` (+ future `source_type` + `external_message_id`).
4. `FormParseAttempt` separated from accepted `Form` data.
5. No downstream mutation until operator acceptance.
