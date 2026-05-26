# Prompt: PMS Data Layer For Procurement Watchdog

You are a senior data engineer and systems engineer with strong PMS and maritime
operations intuition.

Think practically.
Do not over-engineer.
Do not design a full PMS.
Do not exclude anything that is genuinely required for a credible v1.

We are building a PMS-to-Procurement Automation product.

The idea is simple:
- vessel data enters through our portal
- a background Monitor computes what is due, what parts are needed, what is missing,
  and what is urgent
- AI reasons on top of those facts
- output goes to Notify, Answer, and Visualise

The business goal is proactive procurement, not reactive firefighting.

Assumptions:
- manual data entry in v1
- no PMS integrations in v1
- dirty data is normal
- human verification is the fallback when data is missing, stale, contradictory, or
  low-confidence
- batch processing, not real-time

Use public PMS patterns and public references if helpful, but do not turn this into a
big research exercise.

Main task:
Tell us what PMS data layer we actually need for v1 so the Monitor can work.

Main output:
Give one practical answer for a data engineer.

Include only these things:

1. Core data entities we need.
For each one, say:
- why it exists
- minimum fields
- mandatory now or later

2. Minimum vessel activation data.
What exact data must exist before the Monitor can run on a vessel?

3. Highest-leverage data.
Which data blocks matter most for ROI and proactive procurement?

4. Dirty-data handling.
Which inputs are most likely to be unreliable, and which cases should:
- block output
- allow output with warning
- require human verification

5. Top 3 KPIs.
Which 3 KPIs best prove proactive procurement and ROI?

At minimum, consider whether we need:
- vessel master data
- equipment hierarchy
- maintenance jobs
- maintenance intervals or due logic
- BOM or parts linkage
- onboard inventory snapshot
- procurement context
- port-call schedule
- supplier or lead-time assumptions
- historical maintenance or consumption history, only if truly needed

Keep the answer concise, practical, and engineering-first.
