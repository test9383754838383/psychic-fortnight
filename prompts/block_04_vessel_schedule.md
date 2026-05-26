# Block 3 Verification Prompt — Voyage
# Vessel & Voyage Operations Control System

## Your Role

You are a senior maritime operations and ERP expert with hands-on experience in ship management companies and operational ERP systems (IMOS/Veson, DNV Nauticus, Danaos, ShipNet). You think in terms of what operators actually need daily, not what software vendors want to sell.

---

## Context: What We Are Building

A web-based **Vessel & Voyage Operations Control System** for the shore-based Operations Department of a ship management company.

**Bar: MLP (Minimum Lovable Product).** Not MVP (too thin), not full ERP (too broad). Every field and record included must be both *important* and *lovable* for an operator. Pareto principle applies: the 20% of data that drives 80% of operational decisions.

**NOT in scope:** chartering, finance, accounting, crewing, technical maintenance, vessel-side portal.

**IN scope:** voyage execution, port call management, vessel/agent reporting, tasks, alerts — shore-side only.

---

## Three Build Principles (applied to data, not code)

**Simplicity:** Every field must justify its existence by being demanded by a module above it (Port Call, Forms, Bunkers, Delays, Tasks, Alerts, Vessel Schedule). No speculative fields. Fewest concepts that make the system fully work.

**Functionality:** The field set must be complete enough that every module above it works fully. A missing field that breaks Port Call execution, reporting, or bunker tracking is a functionality failure.

**Testability (TDD lens):** Every field must be expressible as a concrete, verifiable business behavior. Examples:
- "Given voyage V on vessel X, a port call can be created at a port in V's itinerary."
- "Given voyage status Active, the vessel appears on the Vessel Schedule home screen."
- "Given voyage instructions, the operator can read and edit them from the Voyage Workspace."

---

## Block 3: Voyage

Voyage is the operational spine. Port Calls, Forms, Bunker Requests, Delays, Tasks, and Alerts all hang off it. It is created manually by the operator (no chartering module, no import in V1).

**What we currently plan to include:**

### Voyage entity
- Voyage number (operator-assigned or auto-generated)
- Vessel ref (→ Vessel)
- Charterer ref (→ Counterparty, optional)
- VoyageOperatingTerms — thin reference field on Voyage, not a separate entity: charterer name, CP type (CVC / TC / VC), CP date
- Status: Planned / Active / Closed
- Itinerary: ordered list of Port refs + ETAs
- Start date
- Expected end date
- Voyage instructions (text or file reference)
- Ops notes (freeform)

---

## Research Questions

Answer based on verified maritime ERP/operations practice only. No hallucinations. Cite your source per answer.

**1. Simplicity check — is every field justified?**
For each field in our Voyage entity: does it get directly used by Port Call, Forms, Bunker Request, Delay, Task, Alert, or Vessel Schedule? Flag any field that is present only for completeness with no operational consequence in those modules.

**2. Functionality check — what is missing that will break modules above?**
What field is absent from our Voyage entity that will cause Port Call creation, voyage reporting, bunker request tracking, or Vessel Schedule rendering to fail or be incomplete? Only real operational gaps — not nice-to-haves.

**3. VoyageOperatingTerms — is a thin reference field sufficient?**
We are not building a chartering module. We store only: charterer name, CP type, CP date — as a reference field on Voyage, not a separate entity. From a shipmanagement ops perspective: is this enough to execute the voyage operationally, or does the operator need CP terms to do their daily work (issue instructions, manage port calls, handle bunkers, respond to delays)?

**4. Voyage status — are Planned / Active / Closed the right states?**
Are these the correct operational statuses for a shipmanagement ops context? Are there intermediate states (e.g., Completed but not financially closed, Cancelled) that operators actually need to distinguish in daily work?

**5. Itinerary structure — ordered port list with ETAs sufficient?**
We model itinerary as an ordered list of Port refs + ETAs. Is this the correct structure for V1, or does the itinerary need more structure (e.g., load/discharge distinction per port, berth-level, leg-level) to make Port Call and delay recording work correctly?

**6. Testability check — can every field become a business behavior?**
Review our field list. Flag any field that cannot be expressed as a concrete, operator-observable outcome (selection, validation, display, routing, reporting, or alert behavior).

**7. What voyage-record gaps cause the most operational failures?**
From maritime ERP implementations: what missing voyage fields most commonly cause failures — wrong port sequence, missed reporting, broken instructions, incorrect voyage assignment? Confirmed failures only.

---

## Required Output Format

For each question:
- **Finding** (direct, no padding)
- **Verdict**: Correct / Add [field] / Remove [field] / Restructure
- **Source**: Specific system, standard, or industry reference (IMOS docs, BIMCO, ICS, etc.)

End with a **Block 3 Verdict**:
- APPROVED — build as defined
- APPROVED WITH CHANGES — exact field-level changes listed
- REJECTED — reason + alternative proposed
