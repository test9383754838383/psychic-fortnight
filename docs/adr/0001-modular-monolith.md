# ADR-0001 — Modular Monolith Architecture

**Status:** Accepted — 2026-05-27

## Context

V1 of the Vessel & Voyage Operations Control System is a greenfield ERP for one shore-based ops department. Team size is small. Deployment target is on-prem Docker Compose. The eleven build blocks of V1 share a single data model and a single set of users.

Common alternatives at this point:
- Microservices with per-domain databases.
- Service-oriented architecture with a shared DB.
- A single-process Django-style monolith with framework-prescribed structure.

## Decision

Build a **modular monolith.** One codebase, one process, one shared database. Internal domain boundaries are enforced statically (see ADR-0010) so modules stay decoupled without paying the operational tax of separate services.

Splitability is a property of clean module boundaries, not of the deployment unit. If a module needs to become its own service later, the boundary it already lives behind makes that possible without rewriting it.

## Consequences

- One thing to deploy, one DB to back up, one log stream to read.
- No network calls between domains. Inter-module communication is a Python function call against a typed public surface.
- No microservice tooling (service mesh, K8s, distributed tracing) at launch.
- Boundary discipline must be enforced by tooling (ADR-0010), not just by convention, or the monolith degrades into a ball of mud.
- A future extraction is possible but never *automatic* — it would be its own ADR.
