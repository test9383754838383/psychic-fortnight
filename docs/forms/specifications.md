# Block 7a — Forms (LLM Email-to-Form Ingest) · Specifications

Tech stack is mostly references to existing ADRs. New to this block: the LLM
boundary. Binding contract is `docs/forms/locked_decisions.md` (D-LOCK-1..21).

## 1. Tech stack (references)

| Concern | Choice | Source |
|---|---|---|
| Module pattern | New `forms` module in the monolith | [ADR-0001] |
| Backend | Python 3.12 + FastAPI + advanced-alchemy + Pydantic v2 | [ADR-0002] |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic (batch mode) | [ADR-0003] |
| DB | SQLite (dev/CI) · Postgres 18 (prod) | [ADR-0004] |
| LLM structured output | OpenAI SDK + Pydantic v2 native Structured Outputs (`response_format: json_schema`, `strict: true`). No Instructor. | [ADR-0014], D-LOCK-1 |
| Provider abstraction | `StructuredClient` protocol + `OpenAIStructuredClient` (Ollama seam only) | D-LOCK-2/3 |
| Boundary enforcement | Tach — LLM SDK confined to `src/modules/forms/llm/`; no reverse imports of `forms` | [ADR-0010], D-LOCK-4/15 |
| Auth | Session-based; `require_role({Admin, Operations})` on accept/reject | [ADR-0016], D-LOCK-18 |
| Tests | pytest real-DB (LLM faked); Vitest + RTL; Playwright | [ADR-0011], D-LOCK-20 |
| Frontend | React + Vite + TS strict; openapi-typescript/openapi-fetch; TanStack Query | [ADR-0005], OPEN_DECISIONS §15 |

**New dependency:** `openai` (official Python SDK). Added to `pyproject.toml`.
No `instructor`, no `langchain`, no `langgraph`. No new frontend deps expected.

## 2. New environment variables (12-Factor Agent — config not code)

| Var | Purpose | Notes |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI auth | Required in prod; unused in CI (LLM faked) |
| `FORMS_LLM_MODEL` | Model id | Default `gpt-4o-mini` [D-ENTRY-1] |
| `OPENAI_BASE_URL` | Provider endpoint override | Optional; the Ollama seam, unused in V1a |
| `FORMS_LLM_TIMEOUT_S` | Per-call timeout | Default 30 [D-ENTRY-2] |
| `RUN_LLM_EVALS` | Gate for live-model eval suite | Unset in CI; `1` to run manual evals [D-LOCK-20] |

The domain never reads these directly — they are loaded at the `llm/` boundary
and passed in. No provider/model string appears in `service/` or `api/`.

## 3. API surface

All routes under `/api/v1`. All require `get_current_user` [D-LOCK-18]. Request
and response bodies are Pydantic DTOs; the parsed-fields payload is the validated
per-form-type model serialised.

### 3.1 Parse (LLM)

```
POST /api/v1/forms/parse
```
```jsonc
// ParseRequestDTO
{
  "raw_text": "string (required, the email body)",
  "form_type": "Noon | Arrival | Departure | Bunkering | Statement of Facts",
  "voyage_id": "uuid?  (XOR port_call_id)",
  "port_call_id": "uuid?  (XOR voyage_id)"
}
```
- 201 → `FormReadDTO` (the created `Form`, its `FormDetail`, and the
  `FormParseAttempt` summary incl. token/cost).
- Synchronous: awaits the provider with `FORMS_LLM_TIMEOUT_S` [D-LOCK-17].
- On unrecoverable parse failure after one retry: still 201, with the form in
  `Received` + `parse_failed` flag and the raw text preserved for manual fix.
  (A failed *parse* is a valid *form awaiting human work*, not an HTTP error.)
- 422 on bad DTO (missing raw_text, both/neither anchor, unknown form_type).

### 3.2 Manual create (no LLM, fallback)

```
POST /api/v1/forms
```
```jsonc
// FormCreateDTO
{
  "form_type": "…",
  "voyage_id": "uuid?",        // XOR
  "port_call_id": "uuid?",     // XOR
  "raw_fields": { },           // operator-entered structured payload
  "raw_source_ref": "string?",
  "notes": "string?"
}
```
- 201 → `FormReadDTO`. Creates `Form(Received)` + `FormDetail`, no
  `FormParseAttempt` (no LLM call).

### 3.3 Read / queue

```
GET /api/v1/forms?status=&form_type=&voyage_id=&port_call_id=
GET /api/v1/forms/{id}
```
- List → `FormReadDTO[]` (review queue; default newest first). Filters optional.
- Detail → `FormReadDTO` incl. `FormDetail.raw_fields`, `raw_source_ref`, and the
  attempt history.

### 3.4 Edit pre-accept

```
PATCH /api/v1/forms/{id}
```
```jsonc
// FormUpdateDTO  (all optional; only pre-terminal states)
{ "raw_fields": { }, "voyage_id": "uuid?", "port_call_id": "uuid?",
  "assigned_to": "uuid?", "notes": "string?" }
```
- 200 → `FormReadDTO`. 409 if the form is already `Accepted`/`Rejected`
  (terminal — immutable).

### 3.5 Transition (FSM + role gate)

```
POST /api/v1/forms/{id}/transition
```
```jsonc
// FormTransitionDTO
{ "status": "Under Review | Queried | Accepted | Rejected" }
```
- 200 → `FormReadDTO`. Sets `reviewed_by`/`reviewed_at` on accept/reject.
- 403 if target is `Accepted`/`Rejected` and caller lacks Admin/Operations.
- 409 on an illegal transition (per `LEGAL_TRANSITIONS`, D-LOCK-12).

### 3.6 Error mapping

| Condition | HTTP |
|---|---|
| Bad DTO / XOR violation / unknown enum | 422 |
| Illegal FSM transition | 409 |
| Edit/transition on terminal form | 409 |
| Accept/reject without Admin/Operations | 403 |
| Unauthenticated | 401 |
| Form not found | 404 |

PUT/DELETE are not offered (no hard delete; forms carry their own terminal
states).

## 4. D-entries (tunable values — not architectural)

| ID | Value | Default | Rationale |
|---|---|---|---|
| D-ENTRY-1 | LLM model | `gpt-4o-mini` | Cheap, structured-output-capable ($0.15/$0.60 per 1M tok). Env-overridable. |
| D-ENTRY-2 | Parse timeout | 30 s | Comfortable for gpt-4o-mini single-email latency; fail to manual on timeout. |
| D-ENTRY-3 | Retry count | 1 | One re-prompt with the validation error, then manual. [D-LOCK-7] |
| D-ENTRY-4 | Queue default sort | `received_at` desc | Newest intake first for the operator. |
| D-ENTRY-5 | Queue page size | 50 | Matches existing list endpoints; revisit if volume grows. |
| D-ENTRY-6 | `cost_estimate` source | static per-1M-token price map in `llm/` | No live billing API call; map updated when pricing changes. |
| D-ENTRY-7 | Golden corpus size | ≥ 2 fixtures per form_type (10+) | Enough to catch prompt regressions offline; grows with real samples. |

## 5. Per-form-type schemas (M1 deliverable)

One flat Pydantic model per `form_type`, each → sanitized JSON Schema for strict
mode [D-LOCK-6]. Primary telemetry that overlaps `OperationalReport` (position,
speed, ROB, etc.) is parsed into the typed model but the **trusted** copy stays
on `OperationalReport` — `FormDetail.raw_fields` holds secondary/compliance data
only [D-LOCK-8, roadmap rule]. Exact field lists per type are fixed in M1 against
the golden-corpus fixtures; the spec fixes only the rule, not every field, to
avoid guessing fields no real email carries.

## 6. Rejected alternatives

| Rejected | Why |
|---|---|
| Instructor wrapper | Provider-native strict output makes the retry wrapper redundant [ADR-0014]; a fresh agent recommended it but without ADR context — re-tested in Prompt B R-0 and rejected. |
| LangChain / LangGraph | Abstraction surface + fast-moving API + weak typing [ADR-0009/0014]. |
| Ollama fallback in V1a | Not strict-mode parity; needs its own adapter + manual evals; no offline customer yet [OPEN_DECISIONS §19]. Seam only. |
| `FormSource` entity now | IMAP-channel future-proofing; banned by CLAUDE.md §1. Minimal `FormDetail` source fields suffice [D-LOCK-8]. |
| APScheduler / async parse | No ingestion stream in V1a; sync is right for one operator pasting one email [D-LOCK-17]. |
| Streaming token output | Operator needs the final validated object, not live tokens. |
| Top-level discriminated union across form types | Strict mode forbids top-level `anyOf`; one schema per type instead [D-LOCK-6]. |
| Coupling `forms → operational_reporting` for the enum | Duplicate the 5 strings + alignment test [D-LOCK-11]. |
| Live LLM calls in CI | Cost + flakiness + non-determinism; fake the client, golden corpus offline [D-LOCK-20]. |

## 7. Risks & open decisions

| Risk | Mitigation |
|---|---|
| Prompt quality — LLM mis-extracts fields | Human acceptance gate [D-LOCK-13]; golden corpus regression; bounded retry; failed parses go to manual review, never auto-written. |
| Strict-mode schema limits collide with a needed validator | Sanitizer strips unsupported keywords; Pydantic post-validation enforces business rules [D-LOCK-6]. |
| OpenAI cost/availability/data-residency | Per-call cost captured for audit [D-LOCK-8]; provider adapter makes a swap a one-file change; Ollama seam exists [D-LOCK-2/3]. |
| Field schemas guessed wrong without real emails | M1 fixes fields against golden-corpus fixtures, not speculation [§5]. |
| OpenAI Python SDK version drift / pricing change | Pin in lockfile; `cost_estimate` price map is a single edit [D-ENTRY-6]. |

**Open decisions touched:** `OPEN_DECISIONS §10` (IMAP harness) stays deferred —
binds only when IMAP is built. `OPEN_DECISIONS §19` (Ollama fallback) decided:
seam only. No new open decisions opened by this block.

## 8. Definition of done

All `project_description.md §Success criteria`, plus: `openapi/openapi.json`
regenerated; `docs/forms/runbook.md` written; coverage ≥ 95% on
`src/modules/forms/`; CI green incl. Postgres 18 migration smoke test; Tach
confirms LLM-SDK isolation and no reverse `forms` imports.
