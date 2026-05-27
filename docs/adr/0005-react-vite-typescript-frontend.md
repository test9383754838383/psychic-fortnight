# ADR-0005 — React + Vite + TypeScript (Strict) for Frontend

**Status:** Accepted — 2026-05-27

## Context

V1 has four main UI surfaces; the home screen is a data-dense Gantt rendering 20–200 vessel rows. Three frontend approaches were credible:
- React + Vite + TypeScript strict.
- Vue 3 + Vite + TypeScript.
- HTMX + server-rendered HTML (Python templating).

The Gantt requirement filters hard: a virtualized resource-scheduler component must integrate cleanly without rewriting around the framework's data model.

## Decision

**React + Vite + TypeScript in strict mode.**

## Consequences

- The chosen Gantt library (ADR-0006) is React-native; integration is a standard component import, not a wrapper layer.
- TypeScript strict + auto-generated client from FastAPI's OpenAPI schema gives end-to-end type safety across the network boundary.
- Frontend boundary discipline must mirror backend modules — `src/modules/<domain>/` on the frontend, enforced by ESLint (e.g. `eslint-plugin-boundaries`). Specific tool choice is a D-entry, not an ADR.
- HTMX rejected — would require massive custom JavaScript to build the virtualized Gantt, defeating its philosophical simplicity.
- Vue rejected — fewer enterprise Gantt options and a smaller hiring pool relative to React.
- The state-management library (Zustand vs Redux vs Context-only) is deliberately deferred until a real cross-component state need surfaces. Defaulting to nothing prevents premature complexity.
