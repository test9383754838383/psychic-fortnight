# ADR-0008 — Huey for Background Jobs (SQLite Local, Redis Production)

**Status:** Superseded by [ADR-0013] — 2026-05-28
**Originally accepted:** 2026-05-27

## Context

Block 7 (Forms & Checklists) ingests operational emails and parses them via an LLM. LLM calls cannot block the HTTP request cycle. A task queue is needed by Block 7; nothing before it requires one.

Two candidates: Celery (industry default, requires Redis or RabbitMQ broker, heavy config) and Huey (lightweight, supports SQLite/Redis brokers).

A primary-source pushback found that Huey-on-SQLite is officially supported and safe for low-concurrency workloads but serializes all writes through a single lock. For local-first dev with one worker, SQLite is ideal; for production with concurrent workers, SQLite is a throughput bottleneck.

## Decision

**Huey** with environment-driven broker selection:
- **Dev/CI:** `SqliteHuey` against the same SQLite file as the app. Zero extra infrastructure for local TDD.
- **Production:** `RedisHuey` against a Redis container in `docker-compose.yml`. One extra service; eliminates write contention.

The broker URL is a 12-Factor env var (`HUEY_BROKER_URL`); no code path differs between environments.

## Consequences

- Local-first remains true: `make dev` boots app + worker + queue with no Redis required.
- Production gets a real queue from day one — no migration in production after launch.
- Celery rejected — broker requirement (Redis/RabbitMQ) violates local-first; configuration complexity is large for a small team.
- Huey isn't provisioned in `docker-compose.yml` until Block 7 needs it. Adding it earlier is premature.
- Periodic tasks (cron-style) use Huey's built-in scheduler. No separate cron container.
