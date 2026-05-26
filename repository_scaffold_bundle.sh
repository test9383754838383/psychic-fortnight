#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

mkdir -p workflow prompts/templates ingest outputs templates

cat > 'README.md' <<'__FILE__'
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

__FILE__

cat > 'workflow/master_workflow.md' <<'__FILE__'
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

__FILE__

cat > 'workflow/clarification_policy.md' <<'__FILE__'
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

__FILE__

cat > 'prompts/templates/prompt_a_template.md' <<'__FILE__'
# Prompt A Template: Baseline Repository Selection

## Role

You are a senior technical researcher.

Your job is to find 1-2 existing, proven repositories or documented solutions that best match the project flow below.

No hallucination is allowed. Every recommendation must include real, verifiable links.

If no candidate passes hard filters, return `NO_FIT`.

## Project Context

[PASTE PROJECT DESCRIPTION]

## Workflow Context

[PASTE STEP-BY-STEP WORKFLOW]

## Scope

In scope:
- AI-driven intake validation flow (read -> evaluate -> flag -> clarify -> categorize -> output)
- Buildable software skeletons and production-relevant reference implementations

Out of scope:
- UI-only repositories
- Academic-only work without operational implementation
- Catalog-only or domain data-only solutions without intake validation workflow

## Hard Constraints

1. Must be actively maintained.
2. Must have a permissive or acceptable license for commercial use.
3. Must show test evidence.
4. Must show production-grade signals (issue hygiene, release activity, adoption indicators, documentation quality).
5. Must avoid over-agentic complexity that violates simplicity.

If any candidate fails hard constraints, reject it.

## Evaluation Criteria (priority order)

1. Simplicity
2. Functionality (full flow coverage)
3. Test maturity
4. Production readiness
5. Budget flexibility (tiebreaker)

## Research Instructions

1. Search broadly across relevant industries.
2. Use primary sources first (repository, official docs, release notes).
3. Do not recommend partial matches without explicit fit percentage.
4. Prefer concise decision rationale, not hidden reasoning.

## Required Output Format

### A) Candidate Table

For each candidate:
- Name
- URL
- License
- Last active signal (date)
- Fit percentage to target flow
- Coverage map (which steps are native vs missing)
- Test evidence summary
- Production evidence summary
- Complexity risk notes

### B) Scoring

Score each candidate (1-10) on:
- Simplicity
- Functionality
- Test maturity
- Production readiness
- Budget flexibility

### C) Gap-to-Build List

For each candidate, list exactly what must be built on top.

### D) Final Decision

Return one of:
1. `RECOMMEND: <candidate>` with brief rationale
2. `NO_FIT` with closest alternatives and exact failure reasons

__FILE__

cat > 'prompts/templates/prompt_b_template.md' <<'__FILE__'
# Prompt B Template: Tech Stack Around Chosen Repository

## Role

You are a senior technical architect.

Propose a complete, production-ready stack around the selected baseline repository.

No hallucination is allowed. Every recommendation must be real and actively maintained.

If uncertain about maturity/fit, flag uncertainty explicitly.

## Inputs

### Baseline Repository (Locked)

- Name: [PASTE NAME]
- URL: [PASTE URL]
- Why selected: [PASTE SUMMARY]
- Known gaps to build: [PASTE GAP LIST]

### Project Description

[PASTE PROJECT DESCRIPTION]

### Workflow

[PASTE STEP-BY-STEP WORKFLOW]

### Non-Negotiable Principles

Apply and prioritize:
- Simplicity
- Full functionality end-to-end
- TDD and testability
- Budget awareness
- 12-factor app and 12-factor agent alignment

## Required Decision Layers

1. Frontend
2. Backend/API
3. AI layer (provider strategy, model operations)
4. Database
5. Authentication and authorization
6. Testing strategy
7. Deployment and infra (Docker, on-prem)

## Constraints

1. Python-first backend and AI layer
2. On-prem deployable in Docker
3. Budget-friendly
4. Monolith-first (no microservices or Kubernetes at launch)

## Required Output Format

### A) Layer-by-Layer Recommendation

For each layer provide:
- Recommendation (tool + relevant version guidance)
- Why this over alternatives (name alternatives and reject reason)
- Integration boundaries (how it connects above/below)
- Testing approach

### B) Full Stack Table

One table with all layers, chosen tools, and one-line justification.

### C) Decision Gates

List decisions that require founder approval before build starts.

### D) Risk Flags

List uncertainty, scale risks, migration risks, and operational caveats.

__FILE__

cat > 'prompts/prompt_a_repo_selection.md' <<'__FILE__'
# Prompt A (Generated)

Status: not generated yet.

When ready, generate this file from:
- `prompts/templates/prompt_a_template.md`
- latest project description input
- latest workflow input
- current clarification answers

Do not run external research automatically. User executes prompt manually.

__FILE__

cat > 'prompts/prompt_b_stack_design.md' <<'__FILE__'
# Prompt B (Generated)

Status: not generated yet.

When ready, generate this file from:
- `prompts/templates/prompt_b_template.md`
- locked baseline repository result from Prompt A
- latest project description input
- latest workflow input
- current clarification answers

Do not run external research automatically. User executes prompt manually.

__FILE__

cat > 'ingest/research_a_result_format.md' <<'__FILE__'
# Research A Result Ingest Format

Paste external deep-research result A using this structure.

## 1) Search Scope

- Sources searched:
- Search boundaries/exclusions:
- Date of research:

## 2) Candidate Comparison Table

For each candidate include:
- Name
- URL
- License
- Last active signal
- Fit percentage
- Native coverage vs missing parts
- Test evidence
- Production evidence

## 3) Scoring

Score each candidate 1-10 for:
- Simplicity
- Functionality
- Test maturity
- Production readiness
- Budget flexibility

## 4) Recommendation

- Recommended candidate or `NO_FIT`
- Justification (short)
- Critical gaps to build
- Confidence (Low/Medium/High)

## 5) Evidence Links

List all links used as evidence.

__FILE__

cat > 'ingest/research_b_result_format.md' <<'__FILE__'
# Research B Result Ingest Format

Paste external deep-research result B using this structure.

## 1) Baseline Repository Context

- Chosen baseline repository:
- Locked constraints from stage A:
- Known implementation gaps:

## 2) Layer Decisions

For each layer include:
- Recommended technology
- Why chosen
- Alternatives considered + rejection reason
- Integration notes
- Testing notes

Required layers:
1. Frontend
2. Backend/API
3. AI operations/provider strategy
4. Database
5. Auth/RBAC
6. Testing
7. Deployment/infra

## 3) Stack Summary Table

One row per layer with tool choice and one-line rationale.

## 4) Risks and Open Decisions

- Risk flags
- Founder decisions required before implementation
- Confidence per risk area

## 5) Evidence Links

List all links used as evidence.

__FILE__

cat > 'templates/project_description.template.md' <<'__FILE__'
# [Project Name]

## What Is The Project?

[Define the system, user entry points, validation gate, and output behavior.]

## Why?

[Business rationale and failure costs addressed by the system.]

## What This Project Is Not

[Explicit out-of-scope boundaries.]

## Success Criteria

1. [Outcome metric 1]
2. [Outcome metric 2]
3. [Outcome metric 3]

## Core Constraints

- [Constraint 1]
- [Constraint 2]
- [Constraint 3]

__FILE__

cat > 'templates/architecture.template.md' <<'__FILE__'
# [Project Name] - Architecture

## 1. System Overview

[Runtime topology, major components, and network boundaries.]

## 2. Application Layers

[Presentation, routing/auth, ingestion, validation, persistence, integrations.]

## 3. Core Flow

### 3.1 Path A

[Primary auto-resolve sequence.]

### 3.2 Path B

[Clarification loop sequence.]

### 3.3 Additional Entry Points

[Email or other channels if in scope.]

## 4. Data Model

[Core entities and relationships.]

## 5. Auth and Authorization

[Role model and access boundaries.]

## 6. Streaming or Async Interactions

[Token/event streaming and delivery path if applicable.]

## 7. Learning Loop or Improvement Path

[How system quality improves over time.]

__FILE__

cat > 'templates/specifications.template.md' <<'__FILE__'
# [Project Name] - Specifications

## 0. Context and Constraints

[Operational context and non-negotiables.]

## 1. Tech Stack

### 1.1 Frontend

[Chosen tools and rationale.]

### 1.2 Backend/API

[Chosen tools and rationale.]

### 1.3 AI Layer

[Agent framework, model provider, prompt/tool strategy.]

### 1.4 Database

[Data platform, ORM, migrations, schema rationale.]

### 1.5 Authentication and Authorization

[Session/auth model and role controls.]

### 1.6 Testing Strategy

[Unit, integration, end-to-end strategy and tooling.]

### 1.7 Deployment and Infra

[Docker/on-prem topology and runtime choices.]

## 2. Rejected Alternatives

[Alternatives and concise rejection reasons by layer.]

## 3. Risks and Open Decisions

[Known risks and unresolved approvals needed.]

__FILE__

cat > 'templates/plan.template.md' <<'__FILE__'
# [Project Name] - Build Plan

## Context

[Project intent, module scope, and deployment context.]

## Dependency Graph

[Milestone dependencies and parallelizable branches.]

## Execution Sequence

[Step order and terminal/process coordination if applicable.]

## Milestones

### M0

[Coordinator setup and verification gates.]

### M1+

[Implementation milestones with completion criteria.]

## Verification Checklist

1. [Check 1]
2. [Check 2]
3. [Check 3]

## Final Acceptance Criteria

[Definition of done and compliance checks.]

__FILE__

cat > 'outputs/project_description.md' <<'__FILE__'
# project_description.md

Status: pending generation.

This file is generated during the final stage from approved inputs and decisions.

__FILE__

cat > 'outputs/architecture.md' <<'__FILE__'
# architecture.md

Status: pending generation.

This file is generated during the final stage from approved inputs and decisions.

__FILE__

cat > 'outputs/specifications.md' <<'__FILE__'
# specifications.md

Status: pending generation.

This file is generated during the final stage from approved inputs and decisions.

__FILE__

cat > 'outputs/plan.md' <<'__FILE__'
# plan.md

Status: pending generation.

This file is generated during the final stage from approved inputs and decisions.

__FILE__
