# Block 2 Verification Prompt — Master Data
# Vessel & Voyage Operations Control System

## Your Role

You are a senior maritime operations and ERP expert. You have hands-on experience with ship management companies and operational ERP systems (e.g., IMOS/Veson, DNV Nauticus, Danaos, ShipNet). You think in terms of what operators actually need daily, not what software vendors want to sell.

---

## Context: What We Are Building

A web-based **Vessel & Voyage Operations Control System** for the shore-based Operations Department of a ship management company.

This is a **Minimum Lovable Product (MLP)** — not an MVP (too thin), not a full ERP (too broad). The bar is: every feature included must be both *important* and *lovable* for a shipmanagement operator. We apply the Pareto principle: the 20% of data that drives 80% of operational decisions.

**What this system is NOT:**
- Not a chartering or commercial ERP
- Not a financial or accounting system
- Not a crewing or technical maintenance system
- Not a vessel-side portal

**What this system IS:**
- Shore-side operational control: voyage execution, port call management, vessel/agent reporting, tasks, alerts

---

## Block 2: Master Data

This is the foundational data layer. Every other module (Voyage, Port Call, Forms, Bunkers, etc.) references these records. We build this first because nothing else can exist without it.

**What we currently plan to include:**

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

Answer each question based on verified maritime ERP/operations practice only. No hallucinations. Cite your source(s) for each answer.

1. **Vessel record — is our field set right for a shipmanagement ops MLP?**
   - What fields do shipmanagement operators actually use daily when working with a vessel record?
   - Is anything critical missing from our list?
   - Is anything in our list unnecessary for V1 ops use (i.e., belongs in technical/crewing systems, not ops)?

2. **Port record — is our field set right?**
   - What port data does a shore-based operator need to execute voyages and port calls?
   - Is UNLOCODE + country + timezone sufficient, or is something operationally critical missing?

3. **Counterparty record — is our field set right?**
   - We use one Counterparty entity with a Role field (Owner/Charterer/Agent/Supplier). Is this the correct abstraction for a shipmanagement ops MLP, or should these be separate entities?
   - What contact/detail fields does the operator actually need on a counterparty for day-to-day ops?

4. **What is typically missing from master data that causes operational failures?**
   - From your experience with maritime ERP implementations, what master data gaps cause the most operational problems (wrong ETA, failed agent nomination, misrouted instructions)?

5. **Pareto check:**
   - If you had to cut our master data to the absolute minimum that still makes the voyage + port call modules functional, what stays and what goes?

---

## Required Output Format

For each question:
- **Answer** (direct, no padding)
- **Verdict**: Correct / Add X / Remove X / Restructure
- **Source**: The specific system, standard, or industry reference you are drawing from (e.g., IMOS field documentation, BIMCO standard, ICS guidelines, etc.)

End with a **Master Data Block Verdict**:
- APPROVED — build as defined
- APPROVED WITH CHANGES — list exact changes
- REJECTED — explain why and propose alternative
