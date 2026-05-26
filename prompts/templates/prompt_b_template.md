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
