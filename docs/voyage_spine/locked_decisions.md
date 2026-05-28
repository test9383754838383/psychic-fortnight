# Block 3 — Locked Implementation Decisions

Tactical implementation decisions locked before `architecture.md` and `specifications.md` are drafted. When those documents are written they will absorb and supersede this file; until then this is the source of truth for what has already been decided.

---

## Baseline repository research (Prompt A)

- **Status:** Run 2026-05-28. Result: `NO_FIT`.
- **Outcome:** No Python OSS maritime ERP exists that fits both the shore-side voyage-management domain and the locked Python / FastAPI / SQLAlchemy 2.0 stack. Available OSS in the maritime space is bifurcated between IoT vessel telemetry (e.g. `xbgmsharp/postgsail`) and GPL/copyleft proprietary ERP frameworks (ERPNext, Odoo) — neither vendorable.
- **Consequence:** Block 3 backend is built from scratch on top of the stack already locked in Block 2. No third-party domain code is vendored.

## D-LOCK-1 — `sqlalchemy.ext.orderinglist` for `ItineraryLine` sequence integrity

- **Decision:** The parent `Voyage.itinerary_lines` relationship uses `sqlalchemy.ext.orderinglist.ordering_list("sequence_no")` as its `collection_class`. Standard Python list semantics (`append`, `insert`, `pop`, `remove`) on the parent collection auto-renumber `sequence_no` in memory before the SQLAlchemy session flush.
- **Why this over alternatives:** Hand-rolling sequence renumbering in the service layer is fragile under concurrent edits and adds ~50 lines of state-management code for a problem that has a battle-tested core SQLAlchemy extension. `orderinglist` ships with SQLAlchemy core; no new dependency.
- **Rejected alternative:** Service-layer manual `UPDATE` statements after every insert/reorder/delete. Higher code volume, race-condition surface, and bug risk for zero gain.

## D-LOCK-2 — Flat-column persistence for `VoyageOperatingTerms`

- **Decision:** `VoyageOperatingTerms` is persisted as four flat columns on the `voyages` table: `terms_charterer_name`, `terms_cp_type`, `terms_cp_date`, `terms_cp_document_ref`. The API DTO surfaces them as a nested object (`terms: { charterer_name, cp_type, cp_date, cp_document_ref }`) but no nested Python or SQLAlchemy machinery is introduced.
- **Why this over alternatives:**
  - vs SQLAlchemy `Composite`: Composite is correct SQLAlchemy idiom for embedded value objects but introduces one more concept and a custom Python dataclass to maintain for a single field group on a single model. Block 2 used no `Composite` anywhere. Simplicity-first.
  - vs separate `voyage_operating_terms` table with 1:1 FK: forces a JOIN on every voyage read; the V1_ROADMAP explicitly calls these "reference fields on Voyage, not a separate entity."
- **Consequence:** Pydantic DTO does the nesting / unnesting at the API boundary. Service and repository layers see flat columns.

## D-LOCK-3 — Service-layer recompute for `expected_completing_datetime`

- **Decision:** `Voyage.expected_completing_datetime` is recomputed in `VoyageService` whenever an `ItineraryLine` under that voyage is created, updated (only if `planned_etd` changed), or deleted — unless the voyage has `expected_completing_manual_override = True`, in which case the recompute is skipped. The computation is: max `planned_etd` across the voyage's itinerary lines (which under `orderinglist` is also the last line by `sequence_no`).
- **Why this over alternatives:**
  - vs SQLAlchemy event hooks (`event.listens_for(...)`, `@validates`): event hooks scatter the business rule across model and service layers, making it harder to reason about and harder to test. The researcher's suggested `@observes` decorator does not exist in SQLAlchemy with the syntax they described — flagged as an inaccuracy.
  - vs Pydantic `model_validator`: validators run at API boundary, not at persistence boundary; they would miss any internal service mutations.
- **Consequence:** ~5 lines of code in the service layer; testable directly; no model-side magic.

## D-LOCK-4 — Service-layer state machine for `Voyage.status`

- **Decision:** Voyage status transitions are enforced in `VoyageService` against an explicit transition matrix (a `dict[VoyageStatus, set[VoyageStatus]]`). Illegal transitions raise a typed `IllegalVoyageStatusTransitionError` mapped to HTTP 409. No state-machine library.
- **Allowed transitions:**
  - `Scheduled → Commenced | Cancelled`
  - `Commenced → Completed | Cancelled`
  - `Completed → Closed`
  - `Closed → ∅` (terminal)
  - `Cancelled → ∅` (terminal)
- **Why this over alternatives:** A `transitions` / `python-statemachine` library would add a dependency for ~10 lines of code. Block 2 set no precedent for state-machine libraries.
- **Consequence:** Transition matrix lives in `services/voyage_service.py`. Tested directly.

---

## Items still open — deferred to specifications.md or external research

- **Frontend tool picks** — router, OpenAPI→TS codegen, boundary enforcement, lint chain, server-state client. Going to external verification via Prompt B (frontend-only narrow scope).
- **`VoyageStatus` enum on the DB side** — String + CheckConstraint (matching Block 2's Vessel pattern) is the assumed default but will be explicit in `architecture.md`.
- **Soft-delete vs hard-delete for cancelled/closed voyages** — Block 2 set the soft-delete precedent (status flip). Voyages already have terminal statuses (`Closed`, `Cancelled`); revisit if any operator workflow demands true deletion. Default: no hard delete.

---

## History

- **2026-05-28** — File created after Prompt A returned `NO_FIT`. Three implementation decisions locked (orderinglist, flat columns, service-layer recompute, service-layer state machine). Prompt B (frontend-only) queued for external verification.
