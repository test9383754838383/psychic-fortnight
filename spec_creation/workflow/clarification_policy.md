# Clarification Policy

## Purpose

Clarifying questions are mandatory whenever decision-critical information is incomplete, ambiguous, or contradictory.

Questions are not limited to prompt drafting. They apply to the full workflow.

## Rules

1. Ask only questions that materially change decisions or outputs.
2. Prefer specific, constrained questions over broad open-ended prompts.
3. Resolve contradictions explicitly before progressing.
4. Do not generate Prompt A, Prompt B, or final outputs while checklist items are missing.

## Mandatory Checklist: Project Intake

All items must be known:

1. Problem definition
- Current failure mode
- Cost of failure
- Desired business outcome

2. User and actor map
- Primary users
- Secondary reviewers/approvers
- Ownership boundaries

3. Validation logic
- What blocks submission
- What triggers Path B
- What counts as resolved

4. Workflow detail
- Step-by-step flow from submission to PM consumption
- Required branches, loops, and exceptions
- Inputs and outputs at each major step

5. Constraints
- Technical constraints
- Budget constraints
- Deployment/environment constraints
- Compliance/principle constraints

6. Success criteria
- Operational KPIs
- Quality thresholds
- Adoption/usability criteria

## Mandatory Checklist: Prompt A Readiness

1. Problem and workflow are complete.
2. Scope exclusions are explicit.
3. Repository evaluation criteria are ranked and fixed.
4. Output format and evidence requirements are fixed.

## Mandatory Checklist: Prompt B Readiness

1. Baseline repository is locked.
2. Stack decision scope is complete by layer.
3. Integration constraints are explicit.
4. Rejected architecture patterns are explicit.

## Escalation Rule

If there is uncertainty after two question rounds, require the user to pick one explicit assumption and mark it as a temporary decision in writing.
