# ADR-0015 — Caddy as Production Reverse Proxy with Automatic TLS

**Status:** Accepted — 2026-05-28
**Closes:** [OPEN_DECISIONS §12]

## Context

Production deployment of the modular monolith places `uvicorn` behind a reverse proxy that terminates TLS, serves static assets, and forwards HTTP to the FastAPI app. The choice was deferred in [OPEN_DECISIONS §12] until a real deployment was near.

The candidates were Nginx, Caddy, and Traefik.

A stack verification (Prompt B, 2026-05-28) examined the actual operational shape:

- **Topology:** single Docker Compose stack on customer infrastructure. One app container, one DB container, one reverse proxy.
- **TLS:** Let's Encrypt acceptable in the default case; customer-supplied certificates in air-gapped or enterprise-mandated installations.
- **Operator profile:** the customer's on-prem ops team may not be deep-Nginx specialists.
- **Configuration surface:** a few routes (`/api/*` to backend, `/` to static frontend bundle) plus standard security headers.

## Decision

**Caddy 2.x** as the production reverse proxy.

- Apache-2.0 licensed.
- Automatic HTTPS via Let's Encrypt out of the box; manual TLS for air-gapped deployments via standard config.
- One Caddyfile per deployment, kept under ~30 lines for the V1 topology.
- Runs as a container in `docker-compose.yml` alongside `app` and `postgres`.

Dev mode does not use Caddy. `make dev` boots `uvicorn` directly on `localhost:8000` and Vite on `localhost:5173`. Caddy enters the stack only at production-profile compose-up.

## Consequences

- TLS provisioning becomes a non-issue for the default customer install — Caddy handles ACME end-to-end.
- Customer environments that mandate Nginx, Traefik, or an existing edge load balancer can run `uvicorn` directly behind that and skip Caddy. The deployment runbook will document this path as a supported alternative.
- Nginx rejected as default — more configuration surface, manual ACME integration via Certbot adds moving parts.
- Traefik rejected as default — strong in dynamic Docker-native discovery, but our static Compose topology does not need its discovery features.
- Caddy itself is one more service in the stack but operates as a small, well-bounded edge component.
- The deployment runbook (to be written at Block 10 spec time per the V1_ROADMAP deployment gap) documents the Caddyfile shape, the TLS strategy, and the alternative-proxy fallback.

## Trigger to revisit

Revisit if any of the following becomes true:
- A customer environment refuses Apache-2.0 dependencies (unlikely; flagged here for completeness).
- Multi-instance horizontal scaling moves the load-balancing concern from Caddy to a separate component.
- TLS automation moves out of the deployment scope (e.g., a corporate edge proxy already handles it).
