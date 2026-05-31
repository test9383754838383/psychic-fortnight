# Block 7a — Forms (LLM Email-to-Form Ingest) · Prompt B (Stack Verification)

Paste this into a fresh research terminal after Prompt A is complete. Record the
verdicts back here and log overrides in `PROJECT_CONTEXT.md` / `OPEN_DECISIONS.md`.

---

```
You are a stack verification agent for Block 7a — Forms (LLM email-to-form
ingest) of a vessel/voyage operations ERP. Prompt A returned NO_FIT — the
maritime LLM-extraction domain is greenfield. We are building from scratch on an
existing, mature codebase (6 blocks shipped: master_data, voyage_spine, auth,
vessel_schedule, port_call, operational_reporting).

Read the following project files in full before answering:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0009-instructor-pydantic-llm.md            (superseded — context)
- docs/adr/0014-openai-sdk-supersedes-instructor.md    (the LOCKED LLM stack)
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0013-apscheduler-supersedes-huey.md
- docs/adr/0016-session-auth-implementation.md
- spec_creation/technical_principles/12_factor_agent.md
- docs/operational_reporting/runbook.md
- OPEN_DECISIONS.md  (esp. §10 — email parser test harness, re-deferred)

Then read the Block 7a scope from V1_ROADMAP.md §Block 7a.

Your job: verify the planned implementation is sound across all layers, with
special rigor on the LLM boundary (this is the project's first LLM integration
and first 12-Factor-Agent surface). Challenge anything wrong. Confirm anything
right.

## Block 7a scope (from V1_ROADMAP.md)

Two entities + an LLM boundary. Phased ingest: build the LLM parse core + a
paste/submit endpoint now; leave a clean seam for an IMAP poller later (NO live
mail server in this block).

1. Form — form_id, form_type (Noon / Arrival / Departure / Bunkering /
   Statement of Facts — same vocabulary as OperationalReport.report_type),
   linked_entity (Voyage or PortCall ref), submitted_by, submitted_at,
   received_at; status (Received / Under Review / Queried / Accepted / Rejected);
   assigned_to, reviewed_by, reviewed_at, notes.

2. FormDetail — form_ref; raw_fields (JSON blob for secondary/compliance data),
   raw_source_ref (original email/file reference).

3. FormParserService — LLM boundary. parse(raw_text, form_type) -> validated
   Pydantic model. OpenAI SDK + Pydantic v2 structured outputs
   (response_format json_schema, strict:true); Ollama local fallback against the
   same JSON Schema. SDK isolated to src/modules/forms/llm/. Per-call cost
   captured on the Form. Parsed forms land Received; operator approves — no LLM
   output mutates downstream state automatically.

## HEADLINE RE-TEST (answer first, with evidence)

R-0. ADR-0014 removed Instructor in favour of provider-native structured output.
     A fresh Prompt A agent independently reached for `instructor-ai/instructor`.
     Re-test the ADR-0014 thesis as of mid-2026: is OpenAI's native Structured
     Outputs (response_format json_schema + strict:true) mature and reliable
     enough that the Instructor wrapper genuinely buys nothing for THIS use case
     (semi-structured maritime email → strict relational rows)? Specifically:
     (a) Does strict mode impose JSON-Schema limitations (no patterns, required
         all keys, limited nesting/anyOf) that collide with Pydantic v2 models
         for these forms? If so, name them.
     (b) Does Ollama support the same strict json_schema contract today, or only
         a looser "format: json"/json_schema mode? Is parity real?
     (c) Does the explicit service-layer retry (validate → re-prompt with the
         error) cost more code than it's worth vs Instructor's retry?
     Verdict: CONFIRM ADR-0014 stands, or OVERRIDE with evidence to reopen it.

## Preliminary implementation decisions (challenge or confirm each)

### LLM boundary (12-Factor Agent)
D-A. Provider default OpenAI gpt-4o-mini (or current cost-equivalent at build
     time); local/offline fallback Ollama via OPENAI_BASE_URL env var. Provider,
     model, base URL, API key are all environment config — never in domain code.
D-B. The LLM SDK is imported ONLY inside src/modules/forms/llm/. Rest of the app
     calls FormParserService.parse(...). Tach enforces this.
D-C. Prompts are versioned artifacts (files under src/modules/forms/llm/prompts/
     or constants), not inline string literals scattered in code. One prompt per
     form_type. 12-Factor-Agent: own your prompts.
D-D. Per-call cost + token counts + model + prompt version captured on the Form
     (or a FormParse audit row) for auditability.
D-E. LLMValidationError on strict-mode validation failure → bounded service-layer
     retry (e.g. 1 re-prompt with the validation error), then surface as a failed
     parse the operator resolves manually. No infinite retry.
D-F. Tests do NOT call a real LLM. The LLM client is behind a protocol/interface;
     tests inject a fake returning canned schema-valid (and schema-invalid) JSON.
     Real-DB still applies to persistence (ADR-0011); only the LLM call is faked.
     Confirm this is the correct boundary (fake the SDK, real DB).

### Data model
D-G. Form is the review/workflow entity; FormDetail holds raw_fields (JSON) +
     raw_source_ref. One-to-one Form↔FormDetail, or fold FormDetail into Form?
D-H. form_type stored as String + CheckConstraint (5 values), same pattern as
     OperationalReport.report_type. No lookup table.
D-I. linked_entity is voyage_id XOR port_call_id (same XOR CHECK pattern Block 6
     used for OperationalReport), inferred from form_type where possible.
D-J. raw_fields is JSON (SQLite JSON / Postgres JSONB) for the parsed secondary
     fields; the strongly-typed primary fields that overlap OperationalReport are
     NOT duplicated here (roadmap rule).
D-K. Forms are NOT append-only like Block 6 events — they have a review lifecycle
     with reviewed_by/reviewed_at mutated in place. Confirm in-place mutation is
     correct here (vs Block 6's append-only), and where the line sits.

### State machine
D-L. status: Received → Under Review → Queried → Accepted / Rejected. Explicit-
     dict LEGAL_TRANSITIONS, same pattern as Block 6. Define exactly which
     transitions are legal (e.g. may Received skip straight to Accepted? is
     Queried → Under Review allowed? are Accepted/Rejected terminal?).
D-M. Acceptance is the gate where form data becomes trusted. No downstream
     mutation occurs automatically on parse — only an operator transition to
     Accepted confirms it.

### Module boundaries
D-N. New `forms` Tach module. Direction: forms → voyage_spine, forms → port_call,
     forms → master_data, forms → auth (public surfaces, scalar FKs only). Those
     modules must NOT import forms. forms → operational_reporting? (Only if forms
     needs to read report vocabulary — prefer NO dependency; duplicate the 5-value
     enum as a local constant.) Confirm direction.

### API shape (phased — paste/submit, no IMAP)
D-O. Proposed routes:
     POST /api/v1/forms/parse        body {raw_text, form_type, linked_entity}
                                     → runs FormParserService, creates Form(Received)
     POST /api/v1/forms              manual-entry fallback (no LLM)
     GET  /api/v1/forms              list / review queue (filter by status)
     GET  /api/v1/forms/{id}         get one (with FormDetail)
     PATCH/api/v1/forms/{id}         edit pre-accept fields
     POST /api/v1/forms/{id}/transition   status transition
     Confirm shape, and whether parse should be sync (await LLM in request) or
     enqueued via APScheduler (ADR-0013). For a paste endpoint, is synchronous
     parse acceptable given gpt-4o-mini latency, or is async required?

### Auth
D-P. All endpoints require get_current_user. Transition to Accepted/Rejected
     requires Admin or Operations role (same gate as Block 6). Confirm.

### Frontend
D-Q. A Forms review-queue surface: list with status chips + a detail/review view
     showing parsed fields beside raw source, with approve/query/reject controls
     and a paste-to-parse entry box. Where does it live — new route, or a panel
     in the Voyage Workspace (Block 6 added panels there)? Recommend.
D-R. No charting/map. Tables, forms, a diff-style parsed-vs-raw view only.

### Testing
D-S. Backend: real-DB tests (ADR-0011); LLM faked (D-F). Cover parse→Received,
     schema-invalid→retry→manual, full FSM incl. role checks, XOR linked_entity,
     cross-module FK validation. Frontend: Vitest+RTL; Playwright e2e
     paste→parse(faked)→review→accept.

## Your task

Answer R-0 first with evidence. Then go through D-A..D-S: CONFIRM / OVERRIDE
(with specific replacement + rationale) / FLAG (hidden risk). Then answer:

1. Sync vs async parse for the paste endpoint — what's right for gpt-4o-mini
   latency and a single-operator MLP, given APScheduler is available (ADR-0013)?
2. Is faking the LLM at the SDK boundary (real DB, fake model) the correct test
   strategy, or is there a better seam? How do we test prompt quality without
   burning tokens in CI?
3. Fold FormDetail into Form, or keep the one-to-one split?
4. Should `forms` depend on `operational_reporting` for the form_type/report_type
   vocabulary, or duplicate the 5-value enum locally?
5. Is the M1 (backend + LLM) / M2 (frontend) split right, or does the LLM
   boundary warrant its own milestone (M1 LLM core, M2 form CRUD+FSM, M3
   frontend) within the 3-milestone cap?
6. Phased ingest: is the paste/submit endpoint + parse-core seam genuinely
   enough to add IMAP later without rework, or does deferring IMAP bake in a
   design that will need tearing up? Name any seam we must get right now.

Be specific. No fluff. Flag must-fix issues before build starts.
```
