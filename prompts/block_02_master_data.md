# Block 2 Verification Prompt — Master Data
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

These govern what we include in every block:

**Simplicity:** Every field must justify its existence by being demanded by a module above it. No field exists speculatively. If Voyage, Port Call, Forms, Bunkers, or Delays don't need it — it doesn't exist in V1. Fewest concepts that make the system fully work.

**Functionality:** The field set must be complete enough that every operational module above it works *fully*. A missing field that breaks a Voyage or Port Call is a functionality failure, not a simplicity win. Simple data that produces incomplete operations is worthless.

**Testability (TDD lens):** Every field we include must be expressible as a concrete, verifiable business behavior. Examples:
- "Given a vessel with IMO X, a voyage can be created and references that vessel."
- "Given a port with UNLOCODE Y, an ETA can be calculated in the correct timezone."
- "Given a counterparty with role Agent, it can be nominated to a port call."

If a field cannot be expressed as a testable operational outcome, it does not belong in V1.

---

## Block 2: Master Data

The foundational layer. Every module (Voyage, Port Call, Forms, Bunkers, Tasks, Alerts) references these records. Built first because nothing else can exist without it.

### Vessel
- Name
- IMO number
- Vessel type (Tanker / Bulker / Container / General Cargo / Other)
- Owner (reference to Counterparty)
- Technical manager (reference to Counterparty)
- Ops manager (reference to User in the system)

### Port
- Name
- UNLOCODE
- Country
- Timezone

### Counterparty
- Name
- Role: Owner / Charterer / Agent / Supplier
- Primary contact (name, email, phone)

---

## Research Questions

Answer based on verified maritime ERP/operations practice only. No hallucinations. Cite your source per answer.

**1. Simplicity check — is every field justified?**
For each entity (Vessel, Port, Counterparty): does each field we listed get directly used by Voyage, Port Call, Forms, Bunkers, or Alerts? Flag any field that is present only for completeness and does not drive an operational outcome in those modules.

**2. Functionality check — what is missing that will break modules above?**
For each entity: what field is absent from our list that will cause Voyage creation, Port Call execution, agent nomination, or reporting to fail or be incomplete? Only fields that create a real operational gap — not nice-to-haves.

**3. Testability check — can every field be expressed as a business behavior?**
Review our field lists. Flag any field that cannot be expressed as a concrete, operator-observable outcome. A field that only exists as metadata with no testable consequence does not belong in V1.

**4. Counterparty abstraction — one entity or separate?**
We use one Counterparty entity with a Role field (Owner / Charterer / Agent / Supplier). From maritime ERP practice: is this the correct abstraction for an ops MLP, or does conflating these roles create operational failures (e.g., an agent being nominated where only a charterer should appear)?

**5. Master data gaps that cause real operational failures**
From maritime ERP implementations: what master data omissions most commonly cause operational failures — wrong ETA, failed agent nomination, misrouted voyage instructions? Only confirmed, observed failure modes — no speculation.

---

## Required Output Format

For each question:
- **Finding** (direct, no padding)
- **Verdict**: Correct / Add [field] / Remove [field] / Restructure
- **Source**: Specific system, standard, or industry reference (e.g., IMOS field documentation, BIMCO standard, ICS guidelines)

End with a **Block 2 Verdict**:
- APPROVED — build as defined
- APPROVED WITH CHANGES — exact field-level changes listed
- REJECTED — reason + alternative proposed
