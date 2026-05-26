# Project-to-4-Markdowns Repository

This repository is a reusable workflow for generating four project documents from:

1. Project description
2. Step-by-step workflow

The process is human-in-the-loop by design:
- Prompt A is generated and saved, then run externally in a deep-research model.
- Results are reviewed together.
- Prompt B is generated and saved, then run externally in a deep-research model.
- Results are reviewed together.
- Final 4 markdowns are generated one-by-one with explicit user approval at each step.

## Governing Principles

All stages are constrained by files in `technical_principles/`:
- `technical_principles/Claude.MD`
- `technical_principles/12_factor_app.md`
- `technical_principles/12_factor_agent.md`

If any recommendation conflicts with these principles, the recommendation is rejected and revised.

## Decision Authority And Review Gates

1. The process is mandatory stop-and-review at every major step:
- Before Prompt A generation
- Before Prompt B generation
- Before each final output file
2. The user has final approval authority on workflow and deliverable direction.
3. The assistant provides recommendations and tradeoffs, then pauses for user confirmation before proceeding to the next gated step.
4. If there is any conflict between recommendation and user direction, the user direction controls unless it violates hard constraints in `technical_principles/`.

## Repository Layout

- `workflow/master_workflow.md`: End-to-end operating protocol
- `workflow/clarification_policy.md`: Mandatory question and completeness gate
- `prompts/templates/prompt_a_template.md`: Template for repository selection deep research prompt
- `prompts/templates/prompt_b_template.md`: Template for stack design deep research prompt
- `prompts/prompt_a_repo_selection.md`: Generated prompt A (project-specific)
- `prompts/prompt_b_stack_design.md`: Generated prompt B (project-specific)
- `ingest/research_a_result_format.md`: Required format for deep research result A
- `ingest/research_b_result_format.md`: Required format for deep research result B
- `templates/*.template.md`: Canonical structure for the 4 final outputs
- `outputs/*.md`: Final generated docs (fixed filenames)

## Fixed Final Outputs

The workflow always produces exactly these files:
- `outputs/project_description.md`
- `outputs/architecture.md`
- `outputs/specifications.md`
- `outputs/plan.md`

## Operating Sequence

1. Load and enforce `technical_principles/*`.
2. Collect project description and step-by-step workflow.
3. Run clarification gate until complete.
4. Generate and save Prompt A.
5. Run Prompt A externally in deep research; paste result back using ingest format A.
6. Review and lock repository choice.
7. Run stack clarification gate.
8. Generate and save Prompt B.
9. Run Prompt B externally in deep research; paste result back using ingest format B.
10. Review and lock stack choice.
11. Generate the 4 output files in sequence with user approval between each.

## Notes

- This repository is docs-first. It defines contracts, templates, and process.
- Prompt generation and document generation are collaborative and review-gated, not fire-and-forget automation.
