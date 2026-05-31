# Block 7a — Forms (LLM Email-to-Form Ingest) · Plan

M0 coordinator + three milestone terminals (hard cap is 3; three is justified
here because the LLM boundary, the persistence/FSM layer, and the frontend are
three distinct contexts — D-LOCK-21). Each milestone is a fresh, self-contained
terminal. Founder reviews between milestones. Binding contract:
`docs/forms/locked_decisions.md` (D-LOCK-1..21).

Dependency order: **M1 → M2 → M3.** M2 imports the schemas/parser from M1; M3
consumes the API from M2.

---

## M0 — Coordinator prompt

```
You are the M0 coordinator for Block 7a — Forms (LLM email-to-form ingest) of the
Vessel & Voyage Operations Control System. You coordinate; you do not write code.

Read first, in full:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/architecture/locked_summary.md
- docs/forms/project_description.md
- docs/forms/architecture.md
- docs/forms/specifications.md
- docs/forms/locked_decisions.md   (D-LOCK-1..21 — the binding contract)
- docs/adr/0014-openai-sdk-supersedes-instructor.md
- docs/adr/0010, 0011, 0016
- OPEN_DECISIONS.md §10, §19
- docs/operational_reporting/runbook.md   (the immediately prior module's pattern)

Then drive M1 → M2 → M3, one fresh terminal each, in order. For each milestone:
hand the coder the milestone prompt below; when they report done, INDEPENDENTLY
VERIFY before accepting — do not rubber-stamp. Run the gates yourself:
`make lint`, `make typecheck`, `make tach-check`, `make test`, and for M3 the
frontend gates (`pnpm typecheck/lint/test/test:e2e`, `pnpm audit`). Confirm the
LLM SDK is imported ONLY under src/modules/forms/llm/ and that CI never calls a
live model. Land each milestone via branch + PR (never push main directly — the
harness blocks it). Merge only on the founder's explicit say-so. Co-author trailer:
"Claude Opus 4.8 <noreply@anthropic.com>".

Non-negotiables: TDD (RED→GREEN→REFACTOR), real-DB tests with the LLM FAKED (never
the DB), mypy --strict, no `any`, no eslint-disable, Tach boundaries, 95% coverage
on src/modules/forms/, SQLite + Postgres 18 migration. No future-proofing
(no FormSource entity, no IMAP, no Ollama impl — D-LOCK-3/8).

When all three are green and merged, write docs/forms/runbook.md and close the
block (update PROJECT_CONTEXT.md, log any debt in OPEN_DECISIONS.md).
```

---

## M1 — LLM core (extraction boundary)

```
Implement the LLM extraction boundary for Block 7a — module src/modules/forms/.
TDD throughout. This milestone has NO database models and NO HTTP routes — it is
the pure parse/validate core that M2 will persist behind.

Read CLAUDE.md, docs/forms/locked_decisions.md (D-LOCK-1..7, 11, 20), and
docs/forms/architecture.md §3 before writing anything.

Build, behind failing tests first:

1. src/modules/forms/constants.py — FORM_TYPES = {"Noon","Arrival","Departure",
   "Bunkering","Statement of Facts"}. A test asserts this set exactly (D-LOCK-11).

2. src/modules/forms/models/schemas.py — one FLAT Pydantic v2 model per form_type
   (D-LOCK-6). Optional values are nullable-required (Field(default=None) but
   present in the schema). Business constraints (ranges/formats) live in Pydantic
   @field_validators, NOT in JSON Schema. Fix the field lists against the golden
   corpus fixtures (step 6) — do not invent fields no fixture email carries.

3. src/modules/forms/llm/schema.py —
   - export_schema(model) -> dict via model.model_json_schema()
   - sanitize_strict(schema) -> dict that removes strict-mode-unsupported keywords
     (pattern, format, minLength, maxLength, minimum, maximum, minItems, top-level
     anyOf) and marks every property required / additionalProperties:false.
   Unit-test the sanitizer directly (D-LOCK-6).

4. src/modules/forms/llm/client.py —
   - StructuredClient Protocol: complete_structured(*, prompt, raw_text,
     json_schema, model) -> StructuredResult (raw_json: str, input_tokens,
     output_tokens, latency_ms).
   - OpenAIStructuredClient implementing it via the openai SDK with
     response_format={"type":"json_schema","json_schema":{...},"strict":True}.
   - The openai import lives ONLY in this file. No other module imports openai.
   - Provider/model/base_url/api_key/timeout come from env at construction
     (D-LOCK-2; vars per specifications.md §2). NO Ollama client (D-LOCK-3).

5. src/modules/forms/llm/prompts/ — one versioned prompt artifact per form_type,
   each exposing a prompt_version string (D-LOCK-5). No inline prompt literals.

6. tests/modules/forms/golden/ — a golden corpus: ≥2 stored raw-email fixtures per
   form_type (10+ total) with their expected parsed Pydantic objects. Offline
   tests assert the parse-and-validate path against a FAKE StructuredClient that
   returns the fixture's canned JSON. CI NEVER calls a live model (D-LOCK-20).

7. src/modules/forms/service/parser.py — FormParserService.parse_only(raw_text,
   form_type, *, client) -> ParseOutcome. ParseOutcome carries the validated model
   (or failure) plus attempt metadata (provider, model, prompt_version,
   schema_version, tokens, latency, retry_no, status, error). It does ONE bounded
   retry on validation failure, re-prompting with the error, then fails to a
   manual-review outcome (D-LOCK-7). NO persistence here — return the outcome.
   (M2 wraps this with DB writes.)

   Optional live eval: a separate test module skipped unless RUN_LLM_EVALS=1
   (D-LOCK-20). Never runs in CI.

Tests cover: sanitizer keyword stripping; valid JSON -> validated model; invalid
JSON -> retry -> manual outcome; client error/timeout -> handled outcome; the
FORM_TYPES alignment assertion; full golden corpus.

Gates: make lint, make typecheck, make tach-check (forms.llm isolation), make test,
coverage. No DB, no routes, no frontend in this milestone. Report what you built
with the actual gate output.
```

---

## M2 — Persistence + FSM + API

```
Implement persistence, the review FSM, and the HTTP API for Block 7a, on top of
M1's parser. Module src/modules/forms/. TDD, real-DB tests (LLM faked, never the
DB — D-LOCK-20).

Read CLAUDE.md, docs/forms/locked_decisions.md (D-LOCK-8..18), and
docs/forms/specifications.md §3 before writing.

Build, behind failing tests first:

1. src/modules/forms/models/ — SQLAlchemy 2.0 async models:
   - Form (D-LOCK-8 field list): form_type String+CheckConstraint(5 values,
     D-LOCK-9); voyage_id XOR port_call_id CHECK (D-LOCK-10); status
     String+CheckConstraint(FSM states). accepted_parse_attempt_id nullable FK.
   - FormDetail: one-to-one (unique FK), raw_fields JSON, raw_source_ref,
     raw_text_hash, source_type (default "paste").
   - FormParseAttempt: append-only audit (provider, model, prompt_version,
     schema_version, retry_no, input/output_tokens, cost_estimate, latency_ms,
     status, error_message, nullable form_id).
   Cross-module references are SCALAR FKs only — no ORM relationship into forms
   (D-LOCK-15). Alembic migration; must run clean on SQLite AND Postgres 18.

2. src/modules/forms/constants.py — extend with LEGAL_TRANSITIONS dict
   (D-LOCK-12): Received->{Under Review,Accepted,Rejected};
   Under Review->{Queried,Accepted,Rejected}; Queried->{Under Review,Rejected};
   Accepted->{}; Rejected->{}.

3. src/modules/forms/repository/ — advanced-alchemy repos for the three models.

4. src/modules/forms/service/form_service.py —
   - parse(raw_text, form_type, anchor, *, client, user): calls
     FormParserService.parse_only (M1), ALWAYS writes a FormParseAttempt, on
     success creates Form(Received)+FormDetail, on failure creates
     Form(Received, parse_failed) preserving raw_text (D-LOCK-7/13).
   - create_manual(...): Form(Received)+FormDetail, no attempt row.
   - update_pre_accept(...): rejects edits on terminal forms (409).
   - transition(form_id, target, user): validates LEGAL_TRANSITIONS (409 on
     illegal); requires Admin/Operations for Accepted/Rejected (403 otherwise,
     D-LOCK-18); sets reviewed_by/reviewed_at; sets accepted_parse_attempt_id on
     accept. Cost estimate from the static price map (D-ENTRY-6).

5. src/modules/forms/api/ — routers + DTOs exactly per specifications.md §3
   (ParseRequestDTO, FormCreateDTO, FormUpdateDTO, FormTransitionDTO,
   FormReadDTO). Synchronous parse with FORMS_LLM_TIMEOUT_S (D-LOCK-17). Error
   mapping per §3.6. A failed parse returns 201 with the form flagged, NOT an
   error. All routes require get_current_user.

6. Register the module; Tach config for forms (outward deps only:
   voyage_spine, port_call, master_data, auth — D-LOCK-15). Regenerate and commit
   openapi/openapi.json.

Tests (real DB, fake LLM client injected): parse->Received+attempt row;
invalid->retry->parse_failed form; manual create; XOR anchor enforcement;
full FSM legality incl. terminal immutability; role gate on accept/reject
(403 for non-privileged, 200 for Operations/Admin); cross-module FK validation;
queue filters. Coverage >=95% on src/modules/forms/.

Gates: make lint, make typecheck, make tach-check, make test; verify the Postgres
18 migration smoke path. Report with actual gate output.
```

---

## M3 — Frontend review queue

```
Implement the Forms review-queue frontend for Block 7a. React + Vite + TS strict.
TDD (Vitest + RTL); Playwright e2e. No `any`, no eslint-disable.

Read CLAUDE.md, docs/forms/locked_decisions.md (D-LOCK-19), and
docs/forms/specifications.md §3 before writing. Regenerate the typed client from
the committed openapi/openapi.json (openapi-typescript/openapi-fetch) — do not
hand-write types.

Build, behind failing tests first:

1. A new /forms route (D-LOCK-19): a review queue listing forms with status chips,
   form_type, anchor, received_at; filter by status/type. Newest first
   (D-ENTRY-4).

2. A form review view: parsed fields shown BESIDE the raw source text (a
   diff-style parsed-vs-raw layout), with approve / query / reject controls that
   call POST /forms/{id}/transition, and a paste-to-parse box that calls
   POST /forms/parse (raw_text + form_type + anchor picker). Pre-accept field
   edits call PATCH /forms/{id}.

3. Accept/reject controls are visible/enabled only for Admin/Operations (mirror
   the server gate; the server is still the source of truth). A failed parse shows
   the form flagged for manual review with the raw text editable.

4. Optional: a small panel inside the existing Voyage Workspace listing forms
   linked to the open voyage (read-only list linking into /forms).

5. No charts, no maps (D-LOCK-19/D-LOCK-R).

Tests: Vitest + RTL for the queue, the review view, role-gated controls, and the
paste-to-parse flow (MSW handlers; no live backend). Playwright e2e:
paste -> parse (backend with a FAKED/stubbed LLM, or a seeded canned response)
-> review parsed-vs-raw -> transition to Accepted -> form locked.

E2e seeding must follow the Block 6 note: CI runs Playwright workers:1; run
locally with --workers=1 (OPEN_DECISIONS §17). The e2e must not require a live
OpenAI call — stub the parse response at the backend or via a fixture.

Gates: pnpm run typecheck, lint, test, test:e2e (--workers=1 locally),
pnpm audit --audit-level=high. Run `npx eslint --no-inline-config` to confirm no
hidden disables. Report with actual gate output.
```

---

## After M3

When M1–M3 are green and merged: write `docs/forms/runbook.md` (startup, env
vars, paste-to-parse curl example, the FSM + role gate, golden-corpus + eval
commands, failure-mode table, test commands incl. `--workers=1`), then close the
block — update `PROJECT_CONTEXT.md`, confirm `OPEN_DECISIONS §10/§19` still
accurate, and point the next step at Block 7b (Checklists).
```
