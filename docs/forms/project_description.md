# Block 7a — Forms (LLM Email-to-Form Ingest) · Project Description

## What this block is

Block 7a builds the **Forms** layer: the intake pipeline that turns the
semi-structured operational emails shore operators receive from vessels — noon
reports, arrival/departure notices, bunkering notes, Statements of Facts — into
strict, reviewable relational records. It is the project's **first LLM
integration** and its first 12-Factor-Agent surface.

The block delivers the parsing core plus a human review workflow. An operator
pastes (or submits) a raw vessel email; an LLM extracts the fields against a
strict per-form-type schema; the result lands as an untrusted `Received` form in
a review queue; an operator reviews the parsed fields beside the raw source and
approves, queries, or rejects. **No LLM output mutates any downstream state
automatically** — acceptance by a human is the trust gate.

This is **Block 7a** of a two-way split. Block 7b (Checklists) is a separate,
later block with no LLM. (`V1_ROADMAP.md §Block 7a`.)

## Why it exists

Operators today retype vessel emails into structured systems by hand — slow,
error-prone, and the single most repetitive task in the shore Ops workflow. The
emails have no fixed format: every vessel, master, and agent writes them
differently (field order, labels, units, prose mixed with numbers). A
template/regex parser would need a rule per sender and break on every rewording.
LLM extraction against a strict JSON schema handles that variance while the
human-approval gate keeps bad data out of the trusted record.

## What it delivers

**FormParserService (the LLM boundary)**
- `parse(raw_text, form_type, schema_version, prompt_version)` → a validated
  Pydantic model for that form type.
- OpenAI SDK + Pydantic v2 provider-native Structured Outputs
  (`response_format: json_schema`, `strict: true`). No Instructor. [ADR-0014]
- A `StructuredClient` provider-adapter interface with one concrete
  `OpenAIStructuredClient`. Ollama is a documented seam only — not implemented in
  V1a. [D-LOCK-2, D-LOCK-3, OPEN_DECISIONS §19]
- One flat schema + one versioned prompt per form type; a schema sanitizer
  strips strict-mode-unsupported keywords; business rules live in Pydantic
  post-validation. [D-LOCK-5, D-LOCK-6]
- One bounded retry on validation failure, then fail to manual review. No loop.
  [D-LOCK-7]
- The LLM SDK is imported only inside `src/modules/forms/llm/`. [D-LOCK-4]

**Form + FormDetail + FormParseAttempt (persistence)**
- `Form` — the queryable workflow record: type, voyage XOR port-call anchor,
  status, submitter/reviewer, notes.
- `FormDetail` — one-to-one: parsed secondary fields (`raw_fields` JSON),
  `raw_source_ref`, `raw_text_hash`, `source_type` (`paste` in V1a). These
  minimal source fields are the IMAP seam.
- `FormParseAttempt` — append-only audit per LLM call: provider, model, prompt &
  schema version, token counts, cost estimate, latency, status, error. Cost is
  auditable per 12-Factor Agent. [D-LOCK-8]

**Review workflow**
- Status lifecycle `Received → Under Review → Queried → Accepted / Rejected`,
  explicit-dict legal transitions; `Accepted`/`Rejected` terminal; a clean parse
  may go `Received → Accepted` directly. [D-LOCK-12]
- Transition to `Accepted`/`Rejected` is gated to Admin/Operations. [D-LOCK-18]

**Frontend**
- A new `/forms` review-queue route: list with status chips, plus a review view
  showing parsed fields beside raw source with approve/query/reject controls and
  a paste-to-parse box. Optional Voyage Workspace panel listing the open
  voyage's forms. [D-LOCK-19]

## Scope: phased ingest

V1a builds the **paste/submit** channel only — the operator supplies the raw
email text. A clean seam (the `parse()` signature + `FormDetail` source fields +
`raw_text_hash` idempotency key) is left so an IMAP poller can be added later
without rework. **No live mail server, no IMAP, no APScheduler in this block.**
(`V1_ROADMAP.md §Block 7a`; `OPEN_DECISIONS §10` stays deferred.)

## What it is NOT

- **Not** an auto-filing system. Parsed forms are candidates; a human accepts
  them. No LLM output writes to `OperationalReport`, `PortCall`, or any trusted
  entity automatically.
- **Not** live email ingestion. No IMAP/SMTP, no mailbox polling in V1a.
- **Not** a file store. `raw_source_ref` is an opaque string reference; no
  attachment storage.
- **Not** Checklists — that is Block 7b.
- **Not** a duplicate of `OperationalReport`. The strongly-typed primary
  telemetry fields live on `OperationalReport` (Block 6) and are not copied into
  `FormDetail`. [D-LOCK-8, roadmap rule]
- **Not** an Ollama/offline deployment. Local-model fallback is a seam only.
  [OPEN_DECISIONS §19]
- No charts, no maps, no AIS.

## Success criteria

- Operator pastes a noon-report email + picks `Noon` + a voyage → a `Form`
  appears in the review queue as `Received` with parsed fields shown beside the
  raw text.
- A malformed/garbage email → one bounded retry → if still invalid, the form is
  flagged for manual review (no crash, no bad row written).
- Operator opens a `Received` form → reviews parsed-vs-raw → transitions it
  `Under Review → Accepted`; an Operator/Admin role is required to accept/reject.
- A non-privileged user cannot accept/reject (403).
- Manual-entry fallback (`POST /forms`, no LLM) creates a form directly.
- Every `parse` call writes a `FormParseAttempt` audit row with token counts and
  a cost estimate.
- CI runs with the LLM **faked** — no live OpenAI/Ollama call in CI. A golden
  corpus of stored email fixtures asserts parse quality offline.
- `make test` green within the CI budget; `make lint`, `make typecheck`,
  `tach check` pass (Tach confirms the LLM SDK is confined to
  `src/modules/forms/llm/` and `forms` has no reverse imports).
- Coverage on `src/modules/forms/` ≥ 95% line.
- Migration creates all tables/constraints; runs clean on SQLite and Postgres 18.
- Frontend `pnpm run typecheck`, `lint`, `test`, `test:e2e`,
  `pnpm audit --audit-level=high` all pass.
- `openapi/openapi.json` regenerated and committed.

## Constraints

- TDD. Real-DB backend tests only; the LLM client is faked, never the database.
  [ADR-0011, D-LOCK-20]
- `mypy --strict`. No `any`. [ADR-0002]
- Tach boundaries enforced; LLM SDK isolated to `src/modules/forms/llm/`.
  [ADR-0010, D-LOCK-4]
- Provider/model/key/base-URL are environment config, never domain code.
  [12-Factor Agent, D-LOCK-2]
- No future-proofing: no `FormSource` entity, no IMAP schema, no Ollama impl
  until actually required. [CLAUDE.md §1, D-LOCK-8, OPEN_DECISIONS §19]
- 12-Factor App; 12-Factor Agent at the LLM boundary.
