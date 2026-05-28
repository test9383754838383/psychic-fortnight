# ADR-0013 — APScheduler Supersedes Huey for Background Jobs

**Status:** Accepted — 2026-05-28
**Supersedes:** [ADR-0008]

## Context

[ADR-0008] selected Huey with SqliteHuey for dev / RedisHuey for production. The motivation at the time was a generic "background jobs" mental model — broker abstraction, persistent jobs, retry logic, periodic tasks.

A subsequent stack verification (Prompt B, 2026-05-28) examined the actual scale and workload:

- **Background-job traffic in V1:** one alert-engine pass every few minutes (Block 10), plus LLM form-extraction calls (Block 7) which can run synchronously off the email-ingest endpoint or queue locally.
- **Concurrency:** ~5–20 operators per tenant; single-tenant deployment.
- **Operational target:** on-prem Docker, one command boot, minimum dependencies.

A broker-based queue (Huey/Celery/RQ/Dramatiq) is over-provisioned for this workload. The Redis dependency in production exists only to serve a job rate that an in-process scheduler can handle on a single thread.

## Decision

**APScheduler** as the background-job and scheduling layer.

- One scheduler process from the same Docker image as the FastAPI app.
- Persistent job store: SQLAlchemy-backed (re-uses the application DB; no new infrastructure).
- Periodic jobs declared in code; no broker, no worker pool, no Redis.
- License: MIT.

Provider strategy retained from [ADR-0008] in spirit but simplified:
- **Dev / CI:** in-process scheduler against SQLite.
- **Production:** in-process scheduler against Postgres.

The same process runs FastAPI requests and the scheduler. If the scheduler workload grows beyond what one process can handle, splitting it into a sidecar container is a future change — not a V1 concern.

## Consequences

- Redis is removed from `docker-compose.yml` until and unless a real concurrency-driven need appears.
- Local-first stays true: `make dev` boots the full stack with no Redis prerequisite.
- Production gains operational simplicity: one fewer service to monitor, fewer failure modes.
- Huey is rejected — broker abstraction is unused given the workload; SqliteHuey's serialized-write bottleneck never applies at this scale because we never need parallel workers.
- Celery / RQ / Dramatiq rejected — same reason: broker dependency for no concurrency benefit at V1 scale.
- ADR-0008 is marked superseded; its content is preserved for historical reference.
- This ADR is dormant until Block 7 (LLM extraction) or Block 10 (Alerts) — whichever needs scheduling first.

## Trigger to revisit

Revisit if any of the following becomes true:
- Background-job traffic exceeds what a single in-process scheduler can handle (sustained CPU saturation from job execution).
- The application needs distributed job execution across multiple app instances.
- Job retry semantics require a broker-grade message queue.

At that point, evaluate Celery / Huey with Redis fresh — do not re-derive from this ADR.
