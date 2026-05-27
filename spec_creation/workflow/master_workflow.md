# Master Workflow

## Objective

Produce 4 consistent project markdowns using a controlled, principle-driven process with external deep research and in-terminal decision review.

## Stage 0: Load Constraints

1. Read and apply:
- `technical_principles/Claude.MD`
- `technical_principles/12_factor_app.md`
- `technical_principles/12_factor_agent.md`
2. Treat these as hard constraints, not guidance.

## Stage 1: Intake

Collect two mandatory inputs:
1. Full project description
2. Step-by-step operational workflow

If either is missing, do not move forward.

## Stage 2: Clarification Gate (Prompt A Readiness)

1. Ask clarifying questions until required information is complete.
2. Use `workflow/clarification_policy.md`.
3. Stop only when checklist is fully passed.

## Stage 3: Generate Prompt A

Gate: pause and confirm with user before drafting Prompt A.

1. Build Prompt A from `prompts/templates/prompt_a_template.md`.
2. Save project-specific output to `prompts/prompt_a_repo_selection.md`.
3. Do not run deep research automatically.

## Stage 4: Ingest and Review Research A

1. User runs Prompt A externally.
2. User pastes result back in required format:
- `ingest/research_a_result_format.md`
3. Validate evidence quality, fit, and principle compliance.
4. Lock the selected baseline repository with explicit user agreement.

## Stage 5: Clarification Gate (Prompt B Readiness)

1. Ask stack-specific clarifying questions.
2. Ensure constraints from Stage 4 are included.
3. Ensure unresolved decisions are explicit.

## Stage 6: Generate Prompt B

Gate: pause and confirm with user before drafting Prompt B.

1. Build Prompt B from `prompts/templates/prompt_b_template.md`.
2. Save project-specific output to `prompts/prompt_b_stack_design.md`.
3. Do not run deep research automatically.

## Stage 7: Ingest and Review Research B

1. User runs Prompt B externally.
2. User pastes result back in required format:
- `ingest/research_b_result_format.md`
3. Validate stack coherence and principle compliance.
4. Lock final stack with explicit user agreement.

## Stage 8: Generate Final Outputs Sequentially

Generate one file at a time, with user approval at each step:
1. `outputs/project_description.md`
2. `outputs/architecture.md`
3. `outputs/specifications.md`
4. `outputs/plan.md`

Each file must remain consistent with previously approved files.

For each file above:
1. Pause before generation.
2. Present assumptions and tradeoffs briefly.
3. Wait for explicit user confirmation.

## Decision Authority

1. User has final decision authority for workflow direction and document outcomes.
2. Assistant contributes recommendations and risk flags, then waits for user decision at each gate.
3. If user direction conflicts with hard constraints in `technical_principles/`, stop and resolve conflict before continuing.
4. Decision sequencing for this workflow is: vision -> marketing -> product documentation.

## Stage 9: Final Consistency Pass

Before completion, verify:
1. Terminology consistency across all 4 outputs
2. Path A / Path B logic consistency
3. Constraints and principles reflected in architecture, specs, and plan
4. No unresolved contradictions

## Stop Conditions

Stop and ask clarifying questions if:
1. Mandatory inputs are missing
2. Research evidence is weak or unverifiable
3. Proposed choices conflict with technical principles
4. Cross-file contradictions appear
