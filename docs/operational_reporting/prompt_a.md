# Block 6 — Operational Reporting · Prompt A (Baseline Search)

Paste this into a fresh research terminal.

---

```
You are a baseline research agent. Search for open-source repositories that could
serve as a reference implementation for Block 6 — Operational Reporting of a
vessel/voyage operations ERP system built on Python + FastAPI + SQLAlchemy +
React + TypeScript.

The block covers three entities:

1. PortActivity / OperationalEvent — timestamped event log per port call with
   21 event types: Arrived, Anchored, Berthed, All Fast, Commenced Loading,
   Completed Loading, Commenced Discharging, Completed Discharging,
   Hoses Connected, Hoses Disconnected, Departed, NOR Tendered, NOR Re-tendered,
   NOR Accepted, Free Pratique Granted, Tugs Engaged, Tugs Released,
   Bunkering Commenced, Bunkering Completed, Delay Commenced, Delay Ended.

2. ActivityLog — free-narrative remarks per port call (Master/agent notes for
   dispute defence). Separate from structured events.

3. OperationalReport — structured reports (Noon / Arrival / Departure /
   Bunkering / Statement of Facts) with fields: position_lat, position_lon,
   speed_24h, distance_to_go, eta_next_port, bunker_rob; plus a status lifecycle
   (Pending / Queried / Accepted / Rejected).

Search GitHub and the web for open-source projects that implement any of these
patterns on this stack. Evaluate each candidate against:

- Python backend (FastAPI or Django/Flask acceptable as reference)
- SQLAlchemy ORM or similar relational persistence
- React/TypeScript frontend (or any frontend as secondary reference)
- Timestamped operational event log for port/maritime operations
- Structured report model with status lifecycle
- Active maintenance (commits within 12 months)
- Permissive license (MIT / Apache-2.0 / BSD)

For each candidate found, state:
  repo URL · stack · what it implements relevant to Block 6 · license ·
  last commit date · FIT / PARTIAL_FIT / NO_FIT verdict

If no repo is a FIT or PARTIAL_FIT, state NO_FIT and explain what was searched
and why nothing qualifies.

Search terms to cover: maritime ops, port call reporting, vessel noon report,
statement of facts, operational event log, voyage reporting, port activity log,
ship management ERP open source.

Commercial products (IMOS, Veson, Danaos, etc.) are out of scope.
```
