# Block 7a — Forms (LLM Email-to-Form Ingest) · Prompt A (Baseline Search)

Paste this into a fresh research terminal. Record the verdict back into this file
and log it in `PROJECT_CONTEXT.md`.

---

```
You are a baseline research agent. Search for open-source repositories that could
serve as a reference implementation for Block 7a — Forms (LLM email-to-form
ingest) of a vessel/voyage operations ERP built on Python + FastAPI +
SQLAlchemy (async) + Pydantic v2 + React + TypeScript.

The block turns semi-structured operational emails from vessels — noon reports,
arrival/departure notices, Statements of Facts — into strict relational rows,
using an LLM with provider-enforced structured output. It covers two entities
plus an LLM boundary:

1. Form — form_id, form_type, linked_entity (Voyage or PortCall ref),
   submitted_by, submitted_at, received_at; status lifecycle
   (Received / Under Review / Queried / Accepted / Rejected); assigned_to,
   reviewed_by, reviewed_at, notes. Parsed forms land as `Received` and require
   human operator approval — no LLM output mutates downstream state
   automatically.

2. FormDetail — form_ref; raw_fields (JSON blob for secondary/compliance data),
   raw_source_ref (original file/email reference).

3. FormParserService — the LLM boundary. Input is raw email text; output is a
   validated Pydantic model per form type. Stack is locked: OpenAI SDK +
   Pydantic v2 structured outputs (response_format json_schema, strict: true),
   with Ollama as the local/offline fallback against the same JSON Schema.
   The LLM SDK is isolated to a single module; the rest of the app calls
   FormParserService.parse(raw_text) -> Form. Per-call cost is captured on the
   form record. Ingest is phased: a paste/submit endpoint now, an IMAP poller
   seam left for later (no live mail server in this block).

Search GitHub and the web for open-source projects that implement any of these
patterns on this stack. Evaluate each candidate against:

- Python backend (FastAPI preferred; Django/Flask acceptable as reference)
- SQLAlchemy/SQLModel or similar relational persistence
- LLM structured extraction of semi-structured documents/emails into typed
  schemas (OpenAI structured outputs, Instructor, Pydantic-AI, or equivalent)
- A document/form ingest pipeline with a human-in-the-loop review/approval
  status lifecycle
- React/TypeScript frontend (secondary reference)
- Active maintenance (commits within 12 months)
- Permissive license (MIT / Apache-2.0 / BSD)

For each candidate found, state:
  repo URL · stack · what it implements relevant to Block 7a · license ·
  last commit date · FIT / PARTIAL_FIT / NO_FIT verdict

If no repo is a FIT or PARTIAL_FIT, state NO_FIT and explain what was searched
and why nothing qualifies.

Search terms to cover: LLM email parsing to structured data, document extraction
pipeline FastAPI, Pydantic structured output OpenAI, maritime noon report
parser, statement of facts extraction, email-to-database LLM, human-in-the-loop
form review LLM, invoice/document ingest open source, IMAP LLM ingest.

Commercial products (IMOS, Veson, Danaos, and closed SaaS document-AI vendors)
are out of scope.
```

---

## Verdict · 2026-05-31

**Run by:** external baseline research agent. **Aggregate: NO_FIT** — no single OSS
repo covers the Block 7a spec. Maritime domain is greenfield (no noon-report / SoF
LLM extraction repos exist), confirming the Block 6 pattern.

**PARTIAL_FIT candidates (reference value only):**

| Repo | Relevant pattern | License | Disposition |
|---|---|---|---|
| `instructor-ai/instructor` | LLM→Pydantic extraction primitive | MIT | **Rejected as a dependency** — conflicts with [ADR-0014], which removed Instructor in favour of provider-native structured output. Kept as a reference for the parse/validate shape only. |
| `Zipstack/unstract` | extraction pipeline + maker-checker HITL | **AGPL-3.0** | Reference-only. Copyleft — never a dependency in a proprietary on-prem product. |
| `shcherbak-ai/contextgem` | LLM extraction w/ Ollama + source refs | MIT | Reference for the Ollama-fallback + source-reference pattern. |
| `LeonAchata/InvoiceParser-AI` | FastAPI + Postgres + LLM ingest sketch | Unconfirmed | Reference only; unconfirmed license/maintenance. |
| `KirtiJha/langgraph-interrupt-workflow-template` | HITL approve/reject loop | Unconfirmed | Reference only; LangGraph not in our stack. |
| `benavlabs/FastAPI-boilerplate` | async FastAPI starter | MIT | **Not adopted** — we already have a mature 6-block codebase; `forms` follows the existing module pattern, not a boilerplate. |

**Decision:** build the `forms` module from scratch on the existing codebase, same as
prior blocks. **The lone material flag** — a fresh agent independently reached for
Instructor, which we removed in [ADR-0014]. This is carried into Prompt B as an
explicit re-test of the ADR-0014 thesis (is provider-native structured output mature
enough in mid-2026 that the Instructor wrapper buys nothing?), not as grounds to
reverse the ADR. The agent's suggested "Prompt C/D" steps are not our workflow
([ADR-0012]: Prompt A → Prompt B → five-doc spec).

**Ecosystem gaps (must be built, all expected):** Form/FormDetail async-SQLAlchemy
schema; Received→Under Review→Queried→Accepted/Rejected FSM; operator approval gate
(no auto-mutation); per-call LLM cost capture on the Form; FormParserService SDK
isolation; OpenAI `json_schema/strict:true` + Ollama same-schema fallback;
React/TS review-queue UI.
