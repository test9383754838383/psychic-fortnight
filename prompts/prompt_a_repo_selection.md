# Prompt A: Baseline Repository Selection
# Three-Way Match Engine — Maritime Procurement

## Role

You are a senior technical researcher.

Your job is to find 1–2 existing, proven repositories or documented solutions that best match the project and AI architecture described below.

No hallucination is allowed. Every recommendation must include real, verifiable links.

If no candidate passes hard filters, return `NO_FIT`.

---

## Project Description

A web-based document matching tool for maritime procurement.

The user uploads 2 or 3 documents from the same order:
- Purchase Order (PO) — what was commercially agreed
- Delivery Note — what physically arrived on the vessel
- Invoice — what the supplier is billing

Each document type can arrive as one or multiple files (split PDFs, scanned photos). All files per slot belong to the same document.

The system reads all uploaded files, extracts structured line-item data from each, and compares them. It returns one of three verdicts:

- **MATCH** — documents agree. Work is done.
- **MISMATCH** — documents disagree. Plain-language list of what doesn't agree (e.g., "Engine Oil 5L — PO: €45/unit · Invoice: €52/unit · Gap: €70").
- **UNABLE TO PROCESS** — AI could not extract data from a file. Plain-language message identifying which file failed.

The result is stored. The user can return to the same case and re-run with additional documents.

The core problem: maritime procurement documents are structurally fragmented and physically messy. A vendor can split one order across multiple invoices. A vessel crew can receive fewer items than ordered and mark the delivery note by hand — crossing out 15 and writing 12. A delivery note may be a low-quality photo taken on deck. The matching logic must handle this reality, not assume clean digital documents.

---

## Workflow

1. User logs in with username and password.
2. User sees one screen with three upload slots: PO, Delivery Note, Invoice.
3. User uploads whichever documents they have (minimum 2 slots, maximum 3). Each slot accepts one or multiple files.
4. User clicks Match.
5. System checks: if fewer than 2 slots have files, stop and show error.
6. System reads each uploaded file. Detects document type. Extracts structured line items using AI (OCR + LLM understanding for messy/handwritten/scanned documents).
7. System normalizes extracted data into a clean internal structure.
8. System runs 2-way or 3-way comparison depending on how many document types were uploaded.
9. System returns verdict: MATCH, MISMATCH, or UNABLE TO PROCESS.
10. Result is displayed and stored (files, extracted data, verdict, timestamp).
11. User can reopen the same case, upload a new document, and re-run matching.

---

## AI Architecture (Critical — Must Be Matched)

The system is **mostly deterministic**. AI is used at exactly two steps:

**AI Step 1 — Extraction:**
AI reads each uploaded file and outputs structured data (line items, quantities, prices, references, document identifiers). Required because documents are messy: handwritten corrections, poor scan quality, fragmented multi-file invoices, mixed languages.

**AI Step 2 — Matching:**
AI compares structured outputs across documents and identifies discrepancies. Required because matches are not always literal — item names may differ across documents for the same physical product, and handwritten overrides must be interpreted correctly.

**Everything else is deterministic software:**
File upload, session management, authentication, storage, result display — no AI involved.

This is the 12-Factor Agent pattern: a mostly deterministic pipeline with LLM steps at specific extraction and comparison points. The AI does not own control flow. The system does.

Repositories that are fully agentic (agent owns the loop) are **out of scope**. Repositories that are pure OCR without structured comparison are **out of scope**.

---

## Scope

In scope:
- Document extraction pipelines (PDF + image → structured line items) using LLMs or LLM-assisted OCR
- Document comparison / reconciliation logic at line-item level
- Production-grade implementations of invoice parsing, PO matching, or three-way match
- Buildable software skeletons usable as a foundation for this system

Out of scope:
- UI-only repositories
- Academic-only OCR work without production implementation
- Full ERP or accounting systems (too heavy, wrong abstraction level)
- Fully agentic frameworks where the LLM owns control flow
- Catalog-only or domain-data-only solutions without document processing logic

---

## Hard Constraints

1. Must be actively maintained (last commit within 12 months).
2. Must have a permissive or commercially acceptable license (MIT, Apache 2.0, or equivalent).
3. Must show test evidence.
4. Must show production-grade signals: issue hygiene, release activity, adoption indicators, documentation quality.
5. Must not introduce over-agentic complexity. AI steps must be isolatable components, not the control layer.

If any candidate fails any hard constraint, reject it.

---

## Evaluation Criteria (priority order)

1. Simplicity — fewest moving parts that still cover the flow
2. Functionality — covers extraction + comparison, handles messy/scanned docs
3. Test maturity — behavioral tests, not just unit tests
4. Production readiness — runs locally first, deployable to cloud
5. Budget flexibility — avoids lock-in to expensive APIs where cheaper options suffice

---

## Research Instructions

1. Search broadly: fintech, logistics, procurement, document AI, invoice processing.
2. Use primary sources first: repository, official docs, release notes.
3. Do not recommend partial matches without explicit fit percentage.
4. Prefer concise decision rationale, not hidden reasoning.
5. Evaluate fit against the two-step AI architecture (extract + match), not general document AI capability.

---

## Required Output Format

### A) Candidate Table

For each candidate:
- Name
- URL
- License
- Last active signal (date)
- Fit percentage to target flow
- Coverage map (which steps are native vs must be built)
- Test evidence summary
- Production evidence summary
- Complexity risk notes

### B) Scoring

Score each candidate (1–10) on:
- Simplicity
- Functionality
- Test maturity
- Production readiness
- Budget flexibility

### C) Gap-to-Build List

For each candidate, list exactly what must be built on top.

### D) Final Decision

Return one of:
1. `RECOMMEND: <candidate>` with brief rationale
2. `NO_FIT` with closest alternatives and exact failure reasons
