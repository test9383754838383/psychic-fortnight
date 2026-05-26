# 12-Factor Agents — AI Enforcement Specification (HumanLayer / “12-factor-agents”)

This file is **law** for building production agents.  
Follow it exactly. Do not “improve” beyond compliance. Stop when done.

---

## Enforcement Modes (Critical Distinction)

### Mode A — Continuous Build Rules (CBR)
Enforce **while building** (every change).  
Violation = fix immediately before continuing.

### Mode B — End-State Verification (ESV)
Enforce **at the end** (release-readiness / audit).  
Violation = fix before declaring “done”.

### Mode C — Hybrid (CBR + ESV)
Enforce continuously and verify at the end.

---

## Operating Definition (Non-Negotiable)

- The **LLM** is a probabilistic function that outputs text/JSON.
- **Tools** are deterministic code invoked from structured model outputs.
- Your job is to keep the system **reliable, debuggable, resumable, and controlled**.

---

## 1) Natural Language → Tool Calls

### Enforcement Mode
CBR + ESV

### Principle
Convert user intent into **validated, schema-correct tool calls**. Free text is not an action plan.

### Context
You are building a system where the LLM’s primary value is turning ambiguous language into **structured intent** that deterministic code can safely execute. You must assume unstructured “plans” are fragile and non-executable.

### Example
- User: “Deploy backend v1.2.3 to prod.”
- Model output (tool call intent):
  - `{"intent":"deploy_backend","version":"1.2.3","env":"prod","risk":"high"}`
- Deterministic code validates schema and routes execution.

### Stopping Condition
Stop when:
- Every actionable step is represented as a **typed / schema-validated** tool call.
- Invalid tool calls are rejected with structured errors (not silently “handled”).

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-01-natural-language-to-tool-calls.md

---

## 2) Own Your Prompts

### Enforcement Mode
CBR + ESV

### Principle
Prompts are **source code**. Version them. Review them. Test them. Ship them deliberately.

### Context
You are not “prompting.” You are defining the primary interface between deterministic code and the model. You must assume prompt drift = product drift.

### Example
- Prompts live in repo files (e.g., `prompts/router.md`, `prompts/extract_order.baml`).
- Changes to prompts require:
  - review
  - eval/test updates
  - release notes (if behavior changes)

### Stopping Condition
Stop when:
- Prompts are first-class artifacts in version control.
- Prompt changes are tested/evaluated like code changes.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-02-own-your-prompts.md

---

## 3) Own Your Context Window

### Enforcement Mode
CBR + ESV

### Principle
You control what enters the context window. Nothing goes in “by accident.”

### Context
The model is only as good as the context you feed it. You must assume:
- irrelevant tokens reduce accuracy
- missing critical state causes hallucination
- raw dumps create confusion

### Example
- Build a deterministic “context builder” that composes:
  - stable instructions
  - current task goal
  - minimal prior events
  - retrieved facts (only what’s needed)
  - tool results in structured form

### Stopping Condition
Stop when:
- Context assembly is explicit (a function/module you can inspect).
- Context is minimal, relevant, and structured.
- You can explain (deterministically) why every context block is included.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-03-own-your-context-window.md

---

## 4) Tools Are Just Structured Outputs

### Enforcement Mode
CBR + ESV

### Principle
Tools are not magic. Tools are **structured outputs** that trigger deterministic code.

### Context
You must treat “tool use” as: model outputs JSON → code executes.  
Assume every tool call must be parseable, validatable, and replayable.

### Example
- Define tool schemas (JSON schema / typed structs).
- Reject:
  - partial JSON
  - undefined fields
  - missing required fields
- Log tool call + validated params as an event.

### Stopping Condition
Stop when:
- All tools have explicit schemas.
- Tool execution is deterministic given the tool payload.
- Tool calls are replayable from logs.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-04-tools-are-structured-outputs.md

---

## 5) Unify Execution State and Business State

### Enforcement Mode
CBR + ESV

### Principle
Maintain **one coherent state model** that includes both:
- what the agent *did / will do* (execution)
- what the business *is* (business state)

### Context
Separate “agent execution state” from “business truth” and you will lose debuggability and resumability. You must assume state splits create ghosts (actions you can’t explain).

### Example
Use an append-only thread/event log:
- `user_message`
- `tool_call`
- `tool_result`
- `human_approval`
- `error`
This log is the source of truth for both execution progress and business outcomes.

### Stopping Condition
Stop when:
- A single state model can reconstruct the agent run end-to-end.
- You can answer: “Why did it do that?” from stored state alone.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-05-unify-execution-state.md

---

## 6) Launch / Pause / Resume With Simple APIs

### Enforcement Mode
CBR + ESV

### Principle
Agents must be launchable, pausable, and resumable via **simple, explicit APIs**.

### Context
Agents are programs. Programs must be controllable. You must assume:
- long-running operations happen
- humans must intervene
- processes die
So “pause/resume” is not optional.

### Example
- `POST /agents/run` (launch)
- `POST /agents/{id}/pause`
- `POST /agents/{id}/resume` (resume via webhook/event)
Persist enough state to resume without “starting over.”

### Stopping Condition
Stop when:
- Launch/pause/resume are real APIs (or equivalent CLI/library functions).
- Resume does not require hidden in-memory state.
- The agent can resume after crashes/restarts.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-06-launch-pause-resume.md

---

## 7) Contact Humans With Tool Calls

### Enforcement Mode
CBR + ESV

### Principle
Human involvement is a tool call with structure, logging, and resumability.

### Context
When stakes are high or uncertainty is high, the correct system behavior is not “guess harder.” It is:
- ask
- wait
- resume
You must assume unstructured “human in the loop” becomes chaos.

### Example
Tool call:
- `{"intent":"request_human_input","question":"Approve deploy to prod?","options":{"format":"yes_no","urgency":"high"}}`
Store response as an event:
- `{"type":"human_response","approved":true,"who":"alex","timestamp":"..."}`

### Stopping Condition
Stop when:
- Human requests are structured tool calls.
- The system can pause while waiting.
- Human responses are stored and replayable.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-07-contact-humans-with-tools.md

---

## 8) Own Your Control Flow

### Enforcement Mode
CBR + ESV

### Principle
You own the loop. The model suggests; deterministic code decides how execution proceeds.

### Context
Do not outsource control flow to the model. You must assume:
- the model will loop
- the model will drift
- high-stakes steps require deterministic gates
So you implement explicit control structures.

### Example
A deterministic loop that:
- routes by tool intent
- breaks to wait for human input
- pauses for long-running jobs
- compacts context
- enforces retry limits / timeouts

### Stopping Condition
Stop when:
- Control flow is explicit and inspectable (a switch/router + loop).
- The agent can be interrupted safely and resumed intentionally.
- There are deterministic exit conditions (done / wait / escalate / fail).

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-08-own-your-control-flow.md

---

## 9) Compact Errors Into the Context Window

### Enforcement Mode
CBR + ESV

### Principle
Errors are feedback. Feed them back **compactly and usefully** so the model can recover.

### Context
Agents “self-heal” only if errors are presented in a form the model can act on. You must assume raw stack traces are often too verbose and noisy.

### Example
On tool failure:
- capture error
- format into minimal structured block:
  - what failed
  - why (message)
  - what input triggered it
  - what to try next (optional deterministic hint)
Apply retry limits (e.g., max 3 consecutive errors).

### Stopping Condition
Stop when:
- Errors are represented in structured, compact form.
- Retries are bounded.
- Repeated failure triggers deterministic escalation (pause for human / abort).

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-09-compact-errors.md

---

## 10) Small, Focused Agents

### Enforcement Mode
CBR + ESV

### Principle
Build agents that do **one thing well**. Agents are one block inside a mostly deterministic system.

### Context
As tasks grow, context grows, and reliability drops. You must assume large “do everything” agents will degrade, drift, and become untestable.

### Example
Instead of one mega-agent:
- `QuoteExtractorAgent` (extracts structured RFQ)
- `VendorMatcherAgent` (finds best supplier candidates)
- `ApprovalAgent` (requests sign-off)
Each with tight scope and short horizons.

### Stopping Condition
Stop when:
- Each agent has a narrow, testable responsibility.
- Workflows are composed from small agents + deterministic glue.
- The typical agent run is short (few steps) and bounded.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-10-small-focused-agents.md

---

## 11) Trigger From Anywhere, Meet Users Where They Are

### Enforcement Mode
ESV

### Principle
Agents must be invokable and responsive across real user channels (Slack/email/SMS/webhooks/etc.).

### Context
Your agent is not a demo chat box. It is a system capability. You must assume users will demand: “run this from where I already work.”

### Example
- Slack message triggers agent run.
- Email thread triggers agent run.
- Cron/event triggers agent run (“outer loop”).
Responses return via the initiating channel.

### Stopping Condition
Stop when:
- External triggers can start/resume agents without deep platform coupling.
- Agent output can be delivered back through the same channel.
- Triggers are audited (who/what/when).

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-11-trigger-from-anywhere.md

---

## 12) Make Your Agent a Stateless Reducer

### Enforcement Mode
ESV (conceptual integrity check)

### Principle
Treat the agent like a reducer:
- input state + new event → output next action/state update
No hidden state. No magic memory.

### Context
You are building something you must be able to replay, debug, and resume. You must assume hidden state will eventually break you.

### Example
- `next_step = decide(state, event_log)`
- `state' = reduce(state, tool_result_event)`
Agent decisions depend only on provided state + events.

### Stopping Condition
Stop when:
- You can replay an agent run from persisted events/state and get consistent behavior.
- There is no critical hidden runtime-only state required for correctness.

Reference: https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-12-stateless-reducer.md

---

# END