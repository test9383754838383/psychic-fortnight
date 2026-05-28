# Block 3.5 — Auth + RBAC · Locked Decisions

Tactical implementation decisions locked before spec drafting. Source of truth until absorbed into architecture.md and specifications.md. Do not re-open without a superseding ADR.

All decisions verified by Prompt A (NO_FIT, 2026-05-28) and Prompt B (full-stack verification, 2026-05-28). Locked in [ADR-0016].

---

## D-LOCK-1 — Custom FastAPI dependency for session management (no library)

**Decision:** The `get_current_user` dependency reads `request.cookies.get("session_id")`, queries the `sessions` table async, validates TTL, and returns the authenticated user. No session middleware library.

**Why:** `starlette-session` is inactive. `starlette-session-middleware` is Beta/no production track record. Starlette's own `SessionMiddleware` is client-side signed cookies — wrong model. A 20-line custom dependency is fully auditable, zero extra deps, and the idiomatic FastAPI approach.

**Rejected:** starlette-session (inactive), starlette-session-middleware (Beta), Starlette SessionMiddleware (wrong model), fastapi-sessions (abandoned 2022).

---

## D-LOCK-2 — Argon2 test parameter override

**Decision:** `conftest.py` session-scoped fixture overrides the application's `PasswordHasher` to `time_cost=1, memory_cost=256` for all test runs. Production parameters (`time_cost=2, memory_cost=19456`) are tested by one dedicated "verify production Argon2 parameters" test.

**Why:** Production Argon2id defaults run 45–100ms per hash. 30+ auth tests would exceed the 30-second test-ceiling without this override. argon2-cffi docs confirm low parameters are valid for test environments with no real passwords.

---

## D-LOCK-3 — slowapi rate limiting on login endpoint, in V1

**Decision:** `slowapi>=0.1.9` applied to `POST /api/v1/auth/login`. Limit: 5 requests/minute/IP. In-memory store (no Redis). No other endpoints rate-limited in V1.

**Why:** Removes the brute-force attack surface without adding operational complexity. Cost is 5 lines of code. Founder approved inclusion in V1.

---

## D-LOCK-4 — Hybrid session TTL: 30-minute idle, 8-hour absolute

**Decision:** Every session row tracks `created_at` and `last_seen_at`. `get_current_user` enforces:
- Idle cutoff: `last_seen_at + 30 minutes`
- Absolute cutoff: `created_at + 8 hours`

Both values are configuration constants (`SESSION_IDLE_TIMEOUT_MINUTES`, `SESSION_ABSOLUTE_TIMEOUT_HOURS`), not hardcoded. APScheduler purge task runs every 6 hours to delete expired rows.

**Why:** OWASP Session Management Cheat Sheet recommends 4–8 hour absolute for office-worker shift usage. Founder confirmed this profile.

---

## D-LOCK-5 — Case-insensitive username (normalize to lowercase)

**Decision:** `users.username` stored as lowercase at creation. Login query normalizes input to lowercase before comparison. `UniqueConstraint` on `users.username` is enforced on the normalized form.

**Why:** Avoids operator confusion from case mismatches. Founder confirmed.

---

## D-LOCK-6 — Session fixation prevention: new row on every login

**Decision:** Every successful login creates a brand-new `sessions` row with a new `session_id`. Existing sessions for the same user are NOT updated or reused. Logout deletes the row. Cookie is cleared on logout.

**Why:** Re-using or updating an existing session ID is the session fixation vulnerability. OWASP mandates issuing a new session identifier on every authentication event.
