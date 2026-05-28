# ADR-0009 — Instructor + Pydantic for LLM Structured Output

**Status:** Superseded by [ADR-0014] — 2026-05-28
**Originally accepted:** 2026-05-27

## Context

Block 7 (Forms & Checklists) parses semi-structured operational emails — noon reports, arrival/departure notices, Statements of Facts — into strict relational rows. Raw LLM completions are too unreliable to write directly to the database; we need schema-enforced extraction with automatic retry on validation failure.

Three patterns considered: hand-rolled prompt + JSON.loads + manual validation; LangChain output parsers; Instructor.

The 12-Factor Agent principle requires the LLM boundary to be isolatable — the provider, the model, and the prompt are environment configuration, not domain code.

## Decision

**Instructor + Pydantic v2.** The domain defines `Pydantic` models per form type; Instructor patches the LLM client to enforce that schema, retrying on validation failure with the validation error fed back as a correction prompt.

Provider strategy:
- **Cloud (default production):** OpenAI `gpt-4o-mini`. ~$0.0006 per typical form ingestion.
- **Local/offline (dev, CI, air-gapped):** Ollama running `phi4` or similar. Same Instructor API; pointed at `http://localhost:11434/v1` via env var.

The LLM SDK is never imported outside `src/modules/forms/llm/`. The rest of the codebase calls `FormParserService.parse(raw_text) -> Form`.

## Consequences

- Schema violations become retries, not bad rows.
- Provider swap is one env var. No vendor lock-in.
- LangChain rejected — too much abstraction surface, fast-moving API, weak typing story.
- Hand-rolled rejected — every team that goes this route reinvents Instructor poorly.
- Parsed forms ship as `Draft / Pending Review` per the human-in-the-loop risk mitigation; no LLM output mutates downstream state without operator approval.
- Per-call cost is captured on the form record (12-Factor Agent compliance) so spend is auditable.
- This ADR is dormant until Block 7. Block 2 has no LLM dependencies.
