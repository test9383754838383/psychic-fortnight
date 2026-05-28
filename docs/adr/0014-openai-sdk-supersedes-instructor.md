# ADR-0014 — OpenAI SDK + Pydantic Direct Supersedes Instructor

**Status:** Accepted — 2026-05-28
**Supersedes:** [ADR-0009]

## Context

[ADR-0009] selected Instructor + Pydantic v2 for LLM structured-output enforcement in Block 7 (Forms & Checklists). At the time, Instructor was the cleanest abstraction for retrying LLM completions against a Pydantic schema until validation passed.

OpenAI subsequently shipped native **Structured Outputs** (`response_format` with `json_schema` and `strict: true`), which guarantees the response conforms to a developer-supplied JSON Schema at the API level. The schema is enforced by the provider, not by client-side retry loops. Pydantic v2 produces JSON Schema natively from its models.

A stack verification (Prompt B, 2026-05-28) flagged Instructor as redundant when the provider enforces structured output natively. The verification also confirmed Ollama supports structured outputs against a JSON Schema for the local-fallback path.

The 12-Factor Agent principle from [ADR-0009] still applies: the LLM boundary must be isolatable; provider, model, and prompt are environment configuration.

## Decision

**OpenAI SDK + Pydantic v2 directly**, no Instructor wrapper.

- Domain defines `Pydantic` models per form type as before.
- The Forms module exports each model's JSON Schema via `model.model_json_schema()` and passes it to the OpenAI SDK as `response_format={"type": "json_schema", "json_schema": {...}, "strict": True}`.
- The SDK returns a string that is guaranteed to match the schema; the module parses it into the Pydantic model with `Model.model_validate_json(...)`.
- Validation failures (rare under strict mode) raise a typed `LLMValidationError` mapped to a retry policy in the service layer — not at the SDK boundary.

Provider strategy retained from [ADR-0009]:
- **Cloud (default production):** OpenAI `gpt-4o-mini` (or the current cost-equivalent model at Block 7 build time).
- **Local / offline (dev, CI, air-gapped):** Ollama with structured-output JSON Schema support, same model-validation pattern, pointed at `http://localhost:11434/v1` via env var.

The LLM SDK is never imported outside `src/modules/forms/llm/`. The rest of the codebase calls `FormParserService.parse(raw_text) -> Form`.

## Consequences

- One fewer dependency in the AI pipeline (`instructor` removed from `pyproject.toml`).
- Retry logic moves from library magic into explicit service-layer code, which is testable and inspectable.
- Provider lock-in risk is unchanged — the boundary contract (`FormParserService`) hides the SDK; swapping to Anthropic, local Ollama, or another provider remains a one-file change.
- Instructor itself remains a sound library; it is rejected here only because the function it provides is now provided by the provider.
- LangChain rejected — same reasons as [ADR-0009]: abstraction surface and fast-moving API.
- Per-call cost is captured on the form record (12-Factor Agent compliance) so spend is auditable, unchanged from [ADR-0009].
- ADR-0009 is marked superseded; its content is preserved for historical reference.
- This ADR is dormant until Block 7. Block 2 and Block 3 have no LLM dependencies.

## Trigger to revisit

Revisit if any of the following becomes true:
- A non-OpenAI provider becomes primary and lacks native structured-output enforcement of comparable strength.
- Multi-provider routing logic outgrows what a thin domain wrapper can express; at that point evaluate Instructor / Pydantic AI / a successor fresh.
- The schema-validation retry loop becomes complex enough that re-introducing a library wrapper is cheaper than maintaining the bespoke code.
