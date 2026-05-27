# Open Decisions

Deferred-debt tracker. One row per decision. Each item has:

- **Status:** OPEN / DECIDED / DEFERRED
- **Decision shape:** `[ ] TBD` or `[x] DECIDED: <option> — <date>`
- For DEFERRED items: explicit **"becomes blocking when X"** condition.

Never let a deferred item hide. If a deferred item's blocking condition arrives, promote it to OPEN.

---

## 1. Bryntum Scheduler license budget approval

- **Status:** OPEN
- **Decision shape:** `[ ] TBD — founder budget approval for ~$800/developer one-time Bryntum Scheduler seat(s).`
- **Context:** Engineering decision is locked in [ADR-0006]; only the budget gate remains.
- **Becomes blocking when:** start of Block 4 (Vessel Schedule). Has no impact on Blocks 2 or 3.

## 2. Multi-tenancy

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — single-tenant vs multi-vessel-pool tenancy data model.`
- **Context:** V1 is single-tenant by working assumption ([ADR-0007]). Multi-tenant onboarding has not been ruled in or out.
- **Becomes blocking when:** a second ship-management company is signed as a customer, OR before any data is written to a production database (whichever is sooner).

## 3. Real auth + RBAC implementation

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — exact auth library and RBAC role catalogue.`
- **Context:** Session-based pattern is locked ([ADR-0007]). Block 2 ships with `get_current_user_stub`. The full implementation needs its own block.
- **Becomes blocking when:** any block other than master-data starts writing user-scoped data, OR before any production cutover.

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
- **Decision shape:** `[ ] TBD — likely eslint-plugin-boundaries; validate at start of frontend work.`
- **Context:** [ADR-0005] locks the principle; the specific tool is a D-entry, not architectural.
- **Becomes blocking when:** the first frontend module is created (no earlier than Block 4).

## 10. Inbound email parser test harness (GreenMail vs pure-Python stub)

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — GreenMail (JVM in Docker) vs pure-Python IMAP stub.`
- **Context:** Block 7 ingest channel. GreenMail is mature but brings a JVM dependency into the test environment. A pure-Python stub avoids that but is custom.
- **Becomes blocking when:** start of Block 7 (Forms & Checklists).

## 11. Structured logging library

- **Status:** OPEN
- **Decision shape:** `[ ] TBD — likely structlog; trivial to lock when first useful.`
- **Context:** 12-Factor mandates structured logs to stdout. Library choice is a D-entry.
- **Becomes blocking when:** first production deploy, OR when the first incident requires log-aggregator filters.

## 12. Reverse proxy + TLS termination for production

- **Status:** DEFERRED
- **Decision shape:** `[ ] TBD — nginx vs Caddy vs Traefik in front of uvicorn.`
- **Context:** Production topology beyond `docker-compose.yml` not yet sketched. All three are viable.
- **Becomes blocking when:** preparing the first production deploy of V1.
