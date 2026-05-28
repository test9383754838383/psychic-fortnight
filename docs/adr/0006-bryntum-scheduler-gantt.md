# ADR-0006 — Bryntum Scheduler for the Vessel Schedule Gantt

**Status:** Superseded by [ADR-0017] — 2026-05-29 (budget unavailable; Apache ECharts adopted)

## Context

The Vessel Schedule (Block 4) is the V1 home screen and the operator's anchor surface. It must render 20–200 vessel rows with multiple voyage bars across a multi-month horizontal timeline at 60fps without rendering lag.

Four candidates surveyed:
1. **Planby** — originally recommended; pushback recheck found it's actually an EPG (TV-guide) library with contradictory pricing across its own pages and unverified performance claims.
2. **Bryntum Scheduler** — commercial, purpose-built resource scheduler, ~$800/developer one-time.
3. **DHTMLX Scheduler/Gantt** — commercial; free tier is GPL (unusable for closed-source).
4. **Custom build** — React + react-window + SVG/Canvas; 1–2 weeks of focused engineering, full control, free.

The MLP bar is *lovable*. The home screen has to feel right on day one. A half-good Gantt sinks the product.

## Decision

**Bryntum Scheduler.** Per-developer one-time license. Founder budget approval is the gating action; the engineering decision is locked.

## Consequences

- Purpose-built data model (resources = vessels, events = voyages) matches our domain natively — no adapting EPG semantics.
- Production-grade virtualization, drag-and-drop, time-axis controls, accessibility — all out of the box.
- One-time per-seat cost is mathematically negligible vs the engineering weeks saved.
- Custom-build path remains the documented fallback if Bryntum's licensing terms become unworkable; would re-open this ADR with a superseding decision.
- Planby rejected — adapted EPG library with marketing-only performance claims.
- DHTMLX rejected — comparable price, no decisive advantage, GPL free tier blocks closed-source distribution.
- Custom build deferred — viable but carries first-impression risk on the MLP's anchor surface.
