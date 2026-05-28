# Open Decisions

Deferred-debt tracker. One row per decision. Each item has:

- **Status:** OPEN / DECIDED / DEFERRED
- **Decision shape:** `[ ] TBD` or `[x] DECIDED: <option> — <date>`
- For DEFERRED items: explicit **"becomes blocking when X"** condition.

Never let a deferred item hide. If a deferred item's blocking condition arrives, promote it to OPEN.

---

## 1. Bryntum Scheduler license budget approval

- **Status:** DECIDED — closed by [ADR-0017]
- **Decision shape:** `[x] DECIDED: Bryntum dropped (budget unavailable). Apache ECharts (Apache-2.0, free) adopted for Block 4 Vessel Schedule Gantt — 2026-05-29.`
- **Context:** Deep research confirmed Apache ECharts covers all Block 4 requirements. Custom `renderItem` layer (~80 lines) replaces the Bryntum bar renderer. No license cost. [ADR-0006] superseded by [ADR-0017].

## 2. Multi-tenancy

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — single-tenant vs multi-vessel-pool tenancy data model.`
- **Context:** V1 is single-tenant by working assumption ([ADR-0007]). Multi-tenant onboarding has not been ruled in or out.
- **Becomes blocking when:** a second ship-management company is signed as a customer, OR before any data is written to a production database (whichever is sooner).

## 3. Real auth + RBAC implementation

- **Status:** DECIDED
- **Decision shape:** `[x] DECIDED: dedicated Block 3.5 — Auth + RBAC — 2026-05-28. Lands between Voyage Spine (Block 3) and Vessel Schedule (Block 4). Session-based per [ADR-0007]. Single-tenant role catalogue. No MFA/SSO/password-reset in V1.`
- **Context:** Block 2 ships with `get_current_user_stub`. Block 3.5 replaces it with the real implementation so every block from 4 onward inherits real auth from day one. Specific auth library still to be chosen at Block 3.5 spec time (D-entry, not architectural).

## 4. Bulk import (CSV / Excel paste)

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — defaulting to NEVER unless reversed.`
- **Context:** Master data is created one record at a time via API. No bulk import in V1; not even V2-scoped.
- **Becomes blocking when:** an operator pilot reports that one-by-one entry is unworkable for vessel/port onboarding.

## 5. Audit log / change history on entities

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — full audit log block scope.`
- **Context:** Block 2 ships only `created_at` / `updated_at`. A real audit log is its own block.
- **Becomes blocking when:** compliance, dispute defence, or operator-traceability requirements demand it, OR by V2 launch.

## 6. Port distance table & routing engine

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — distance/routing data source and engine.`
- **Context:** `Port.distance_table_ref` exists in the model; the distance data itself and any routing logic are out of Block 2 and likely out of V1.
- **Becomes blocking when:** Block 3 (Voyage Spine) or any later block needs to compute leg distance from itinerary ports.

## 7. CounterpartyRole → Port hard FK

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — keep `ports_serviced` as soft list of UNLOCODEs, or promote to FK?`
- **Context:** Block 2 stores `ports_serviced` as a JSON list of UNLOCODE strings on the Agent role. No referential integrity to `Port` rows.
- **Becomes blocking when:** a block needs to query "all agents that service Port X" with referential integrity, OR when a UNLOCODE change makes the soft list unmanageable.

## 8. Real-time UI synchronization (WebSockets vs polling)

- **Status:** DECIDED
- **Decision shape:** `[x] DECIDED: HTTP polling for V1 — 2026-05-27.`
- **Context:** WebSockets / SSE inflate monolith complexity (Redis pub/sub, ASGI channels). MLP can ship with periodic polling on the Vessel Schedule.
- **Becomes blocking when:** operator pilot reports stale-state friction that polling cannot solve. Would re-open with a new ADR.

## 9. Frontend boundary enforcement tool

- **Status:** OPEN
- **Decision shape:** `[ ] TBD — likely eslint-plugin-boundaries; validate at start of frontend scaffold milestone in Block 3 M2.`
- **Context:** [ADR-0005] locks the principle; the specific tool is a D-entry, not architectural. Decision now binds at Block 3 M2 (frontend scaffold), not Block 4.
- **Becomes blocking when:** Block 3 M2 starts.

## 10. Inbound email parser test harness (GreenMail vs pure-Python stub)

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — GreenMail (JVM in Docker) vs pure-Python IMAP stub.`
- **Context:** Block 7 ingest channel. GreenMail is mature but brings a JVM dependency into the test environment. A pure-Python stub avoids that but is custom.
- **Becomes blocking when:** start of Block 7 (Forms & Checklists).

## 11. Structured logging library

- **Status:** DECIDED
- **Decision shape:** `[x] DECIDED: structlog (JSON to stdout) + Vector for log shipping + GlitchTip optional for error tracking — 2026-05-28.`
- **Context:** structlog confirmed by independent stack verification (Prompt B, 2026-05-28). Vector chosen for on-prem log shipping (MPL-2.0, lightweight). GlitchTip optional for Sentry-compatible error tracking on-prem (FSL-license-free path). No metrics, no distributed tracing in V1.
- **Promote to ADR when:** first production deploy is being prepared (likely Block 10 spec time).

## 12. Reverse proxy + TLS termination for production

- **Status:** DECIDED — closed by [ADR-0015]
- **Decision shape:** `[x] DECIDED: Caddy 2.x with automatic HTTPS — 2026-05-28.`
- **Context:** See [ADR-0015]. Alternative-proxy fallback (Nginx, Traefik, or customer-supplied edge LB) documented in the future deployment runbook.

## 13. Password hashing library + auth approach (Block 3.5 Auth)

- **Status:** DECIDED — closed by [ADR-0016]
- **Decision shape:** `[x] DECIDED: argon2-cffi + first-party DB-backed sessions, custom FastAPI dependency, slowapi brute-force, hybrid TTL (30-min idle / 8-hr absolute), case-insensitive usernames — 2026-05-28. Promoted to [ADR-0016].`
- **Context:** Confirmed by Prompt B and recheck. Block 3.5 Prompt A (NO_FIT) + Prompt B full-stack verification expanded and confirmed all sub-decisions. starlette-session overridden (inactive); slowapi added for V1 brute-force; TTL and username decisions resolved. Full detail in [ADR-0016].

## 14. Postgres integration-test harness in CI

- **Status:** DECIDED
- **Decision shape:** `[x] DECIDED: Testcontainers for the Postgres CI gate — 2026-05-28.`
- **Context:** Formalizes what Block 2 already does ad-hoc (ephemeral Postgres container for migration smoke test). Testcontainers gives a clean Python API for booting Postgres in a CI job and pointing tests at it. Backstop to [ADR-0011]'s dual-DB strategy.
- **Promote to ADR when:** the migration-smoke CI job is hardened, or when the first non-Block-2 module needs the Postgres gate.

## 15. Frontend OpenAPI → TypeScript codegen toolchain

- **Status:** DECIDED
- **Decision shape:** `[x] DECIDED: openapi-typescript + openapi-fetch — 2026-05-28.`
- **Context:** Block 3 M2 (frontend scaffold) consumes the FastAPI OpenAPI schema and generates TypeScript types + a typed fetch client. openapi-typescript produces the types; openapi-fetch is the minimal typed fetch wrapper from the same maintainer. Both MIT, both actively maintained per Prompt B verification.
- **Companion picks (frontend scaffold D-entries, locked at Block 3 M2 spec time):**
  - Server-state client: **TanStack Query** (MIT, current stable in 2026).
  - Router: **TanStack Router** — supply-chain incident May 11–15, 2026 verified resolved per official TanStack postmortem (`tanstack.com/blog/npm-supply-chain-compromise-postmortem`); current versions safe. Lock exact versions via lockfile + npm audit gate in CI.
  - Language: **TypeScript 6.x** (current stable, 6.0.3 per recheck 2026-05-28).
  - Build tool: **Vite 8.x** (current stable, 8.0.14 per recheck 2026-05-28).
  - Lint / format: ESLint + typescript-eslint + Prettier.
  - Tests: Vitest + React Testing Library + Playwright.
  - Frontend module boundary: eslint-plugin-boundaries.
- **Promote to ADR when:** Block 3 M2 specifications.md is drafted.

## 16. Tach Beta classifier acknowledgement

- **Status:** ACKNOWLEDGED
- **Decision shape:** `[x] DECIDED: keep Tach per [ADR-0010] — 2026-05-28. Maintainer self-classification is Beta on PyPI (Development Status :: 4); project is active in practice (~2.7k stars, frequent 2026 releases, used in Block 2 CI without issue).`
- **Context:** Recheck verified the Beta classifier as literally correct but flagged that import-linter is `Development Status :: 5 - Production/Stable`. The borderline call landed on "keep" because Block 2 already ships with `tach.toml` and a green CI Tach-check, and the project is mature in practice. The Beta label is the maintainer's conservative self-assessment.
- **Becomes blocking when:** any genuine instability surfaces (false positives, false negatives, missed import violations in CI, breaking releases). At that point, switch to import-linter without further research.
