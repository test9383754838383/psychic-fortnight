# ERP Operations File Notes

These notes treat each `.html` article as one operational file. The `_files` folders are just downloaded page assets and are not included.

## Core Operations Views

- `Alert List - Alerts / IMOS - Alert List`: The exception inbox for operations. This is where missed updates, overdue actions, and rule-based warnings surface before they become claims, delays, or missed customer communication.
- `Berth Schedule / IMOS - Berth Schedule`: The berth planning view for active voyages. Operators use it to see who is alongside, who is waiting, and how berth rotation will affect cargo handling and idle time.
- `Fleet Map / IMOS - Fleet Map`: Real-time situational awareness across the fleet. If AIS/native positions are not trusted here, ETAs, customer advice, and weather or piracy decisions are made on bad assumptions.
- `Port Calls / IMOS - Port Calls`: The list of all port call records and linked forms. This is where an operator checks the operational truth of a call; if statuses are wrong, reporting, DA handling, and event history all drift.
- `Port Schedule / IMOS - Port Schedule`: A portfolio view of time spent in port. Useful for spotting congestion, long stays, and poor turnaround that may become demurrage or owner performance questions.
- `Task List : Tasks / IMOS - Task List`: The shared action queue. If this is not managed well, handovers fail silently and the operation starts relying on memory instead of controlled follow-up.
- `Vessel schedude / IMOS - Vessel Schedule`: The fleet Gantt view across past, current, and future voyages. This is what planners use to understand availability and overlaps; if wrong, vessels get promised where they cannot realistically be.

## Bunkers

- `Bunker Requirement : Bunkers / IMOS - Bunker Requirement`: The main list of bunker requirements raised by office or vessel. It is the control point for whether fuel procurement is moving or stalled.
- `Bunker Requirement : Bunkers / Bunker Manager / IMOS - Bunker Manager`: The processing page for a bunker requirement. This is where ownership, status, and commercial follow-up become explicit, which matters because unowned bunker jobs quickly become emergency supply cases.
- `Bunker Requirement : Bunkers / Bunker Requirement - Operator Tasks / IMOS - Bunker Requirement - Operator Tasks`: The operator's initiation workflow for requesting bunkers. It captures the need early enough for procurement to act before the vessel reaches a port with no fuel margin.

## Claims

- `Claims / IMOS - Claim`: The claim master record. Think of it as the operational and financial folder for a dispute, where supporting invoices sit and the exposure is tracked until resolved.
- `Claims / Claim Invoice / IMOS - Claim Invoice`: The actual billing document inside a claim. This is where operational facts become money receivable or payable, so coding, commissionability, and supporting detail matter.
- `Claims / Claim Commissions / IMOS - Claim Commissions`: Handles broker commissions on claim-related invoicing. If misunderstood, you either underpay a broker, overstate net recovery, or post the wrong commercial result.
- `Claims / Claim Types / IMOS - Claim Types`: The classification list for claim categories such as cargo damage or pollution. Good setup matters because management reporting and root-cause analysis depend on this coding.
- `Claims / Claim Subtypes / IMOS - Claim Subtypes`: Adds a second level of claim tagging. Operators use this to separate lookalike claims into meaningful buckets for trend review and accountability.
- `Claims / Laytime Claim Types / IMOS - Laytime Claim Types`: Specific categorization for laytime-related claims. This is important when demurrage and laytime disputes need to be analyzed beyond one generic label.
- `Claims / Claim Invoice / Why is the "cargoItinAllocationDetails" section missing from the Claim invoice XML?`: A troubleshooting note for outbound claim XML. Operationally this protects integrations, because an unconfirmed cargo can make the invoice payload incomplete for downstream systems.

## Forms

- `Forms / IMOS - Forms`: The office-side control room for vessel and agent forms. This is where reported events enter shore-side control, so weak discipline here means weak operational truth.
- `Forms / Details - Forms / IMOS - Details - Forms`: The review and action page for a single submitted form. Approve, reject, resubmit, and print all happen here, so this is where bad data is either stopped or allowed to contaminate the voyage record.
- `Forms / Map - Forms / IMOS - Map - Forms`: Geographic view of voyage and vessel form context. Useful when validating whether a reported movement, route, or event makes physical sense.
- `Forms / Why do I have an icon for a Pending form...`: A housekeeping fix for stuck form indicators. It matters because a false pending icon causes operators to chase nonexistent work and distrust the reporting queue.

## Onboard

- `Onboard / IMOS - Onboard`: The vessel-side operating concept for Veslink Onboard. It is about pushing the master to report from a controlled data model instead of emails, spreadsheets, and memory.
- `Onboard / Onboard Voyages & Port Calls / IMOS - Onboard Voyages & Port Calls`: The vessel user's main working screen. This is where the ship sees the current voyage and port context; if wrong, the ship reports against the wrong leg or port.
- `Onboard / Itinerary - Onboard / IMOS - Itinerary - Onboard`: The vessel-facing itinerary and berth view. It matters because berth order, port sequence, and call timing drive what the vessel reports and when.
- `Onboard / Cargoes - Onboard / IMOS - Cargoes - Onboard`: Shows cargo contract information available to vessel and office users. This helps the ship align cargo operations with the commercial expectation rather than working blind.
- `Onboard / Forms - Onboard / IMOS - Forms - Onboard`: The onboard form submission area. This is the point where vessel observations become structured operational records.
- `Onboard / Reports - Onboard / IMOS - Reports - Onboard`: Vessel-side report execution. Useful for extracting filtered operational information without asking shore staff to build it manually.
- `Onboard / Setup - Onboard / IMOS - Setup - Onboard`: The admin setup entry for Onboard. If this is configured badly, vessel reporting issues are systemic, not one-off.
- `Onboard / Setup - Onboard / Creating an Onboard User - Onboard / Onboard - Creating an Onboard User`: User provisioning guidance. Access control is operational here, because the wrong rights let the wrong person submit or see voyage data.
- `Onboard / Setup - Onboard / How to Reset Password for Onboard User - Onboard / How to Reset Password for Onboard User`: Password reset procedure for onboard users. This is basic continuity control: if the vessel cannot log in, reporting falls back to uncontrolled channels.
- `Onboard / Setup - Onboard / Training Manual - Onboard / Onboard - Training Manual`: Full-user training material for vessel reporting. This is the bridge between software capability and actual reporting behavior onboard.
- `Onboard / How to Reset Password for Onboard User - Onboard / IMOS - Integrating Veslink Onboard with Port Agents`: Setup guidance for letting port agents submit or view reports on behalf of the vessel. Operationally this matters at busy ports where the master needs local help but data control must still be governed.
- `Onboard / Onboard Locally Hosted Vessel Site Installation - Onboard / IMOS - Onboard Locally Hosted Vessel Site Installation`: Installation guide for locally hosted vessel sites. If this fails, the ship does not just lose convenience; it loses its reporting channel.

## Voyages: Master and Navigation

- `Voyages / IMOS - Voyages`: The core voyage workspace. This is where commercial terms, operational execution, and accounting start to meet, so errors here spread everywhere else.
- `Voyages / Dropdowns / Summary - Voyage / IMOS - Summary - Voyage`: The operator's quick dashboard for the voyage. It is the fastest way to assess whether a voyage is under control or already drifting into issues.
- `Voyages / Dropdowns / Properties - Voyages / IMOS - Properties - Voyage`: The voyage's base identity and control data. Wrong company code, LOB, or other core properties will misroute postings and distort reporting.
- `Voyages / Dropdowns / Cargoes - Voyage / IMOS - Cargoes - Voyage`: The voyage-level cargo list. This is how an operator verifies what is actually supposed to move on the voyage.
- `Voyages / Dropdowns / Contacts - Voyages / IMOS - Contacts - Voyage`: The counterparty contact panel for the voyage. Practical value: when something goes wrong at 0200, this is where the operator finds who to call.
- `Voyages / Dropdowns / Voyage Notes Panel - Voyages / IMOS - Voyage Notes Panel`: Freeform voyage notes for institutional memory. If the team does not capture decisions here, important context dies at shift change.
- `Voyages / Dropdowns / Voyage Instructions - Voyages / IMOS - Voyage Instructions - Voyage`: Controls voyage instructions and revisions. This matters because the ship and agents should act on the latest instruction set, not a stale one.
- `Voyages / Dropdowns / Voyage Manager, Map View - Voyages / IMOS - Voyage Manager, Map View`: Voyage-specific map view. Operators use it to pressure-test routes, ECA exposure, and piracy routing rather than accepting the itinerary as theory.
- `Voyages / Dropdowns / Voyage Reports - Voyages / IMOS - Voyage Reports`: The menu of voyage reports. This is how the system turns live voyage data into management, owner, and customer-facing output.
- `Voyages / Dropdowns / Voyage Reports - Voyages / Bunker Details Report - Voyages / IMOS - Bunker Details Report`: A detailed bunker consumption and pricing output. This becomes important when fuel performance or off-hire bunker settlement is challenged.

## Voyages: Cargo and Port Execution

- `Voyages / Dropdowns / Cargo Handling - Voyages / IMOS - Cargo Handling`: The detailed handling page for a cargo operation at a load or discharge port. This is where BL-related and port-operation facts get anchored.
- `Voyages / Dropdowns / Cargo Handling - Voyages / Cargo Suppliers and Cargo Receivers - Voyages / IMOS - Cargo Suppliers and Cargo Receivers`: Captures supplier and receiver details for each cargo movement. Operationally this matters for documentary accuracy and for knowing exactly who delivered or received.
- `Voyages / Dropdowns / Cargo Handling - Voyages / IMOS - Cargo Handling - Voyage`: The voyage-level panel view of cargo handling. Useful for seeing the overall handling picture without drilling port by port.
- `Voyages / Dropdowns / Port Activities - Voyages / IMOS - Port Activities`: The statement-of-facts engine for port calls. Arrival and departure sequencing here directly drives port status, activity reports, and later demurrage logic.
- `Voyages / Dropdowns / Activity Log - Voyages / IMOS - Activity Log`: A synchronized operational event log for delays, cargo handling, and other activity. This is the operator's transactional diary, and it needs to match reality.
- `Voyages / Dropdowns / Activity Reports - Voyages / IMOS - Activity Reports`: The vessel movement reporting trail across the voyage. These reports are what shore teams rely on when they say the vessel arrived, sailed, waited, or shifted.
- `Voyages / Dropdowns / Activity Reports - Voyages / Extra Information for Report - Voyages / IMOS - Extra Information for Report`: The deeper performance page behind an activity report. This is where ROBs, weather, consumption, and delay details become auditable rather than anecdotal.
- `Voyages / Dropdowns / Activity Reports - Voyages / Tank Conditions - Voyages / IMOS - Tank Conditions`: Special reporting for tank status on tanker, gas, and LNG operations. If this is wrong, the office is making cargo and readiness decisions on false tank information.
- `Voyages / Dropdowns / Activity Reports - Voyages / Reverting Port Activities and Activity Reports - Voyages / IMOS - Reverting Port Activities and Activity Reports`: The controlled rollback procedure when approved reporting data is wrong. This is critical because correcting bad timestamps carelessly can corrupt the whole voyage timeline.
- `Voyages / Dropdowns / Berth Management - Voyages / IMOS - Berth Management`: Builds berth rotation inside a port call. This matters whenever one port has multiple berths or cargo stages and the sequence affects time, notices, and costs.
- `Voyages / Dropdowns / Leg Delays:Events - Voyage / IMOS - Leg Delays/Events`: Records delays or events tied to a voyage leg. This is where the operator isolates disruption to a specific leg instead of blurring it across the whole voyage.
- `Voyages / Dropdowns / Forms - Voyages / IMOS - Forms - Voyage`: Voyage-specific view of reporting forms. Useful when the operator wants the reporting history for one voyage rather than the global forms queue.
- `Voyages / Dropdowns / Agents and Notices - Voyages / IMOS - Agents and Notices`: The nomination and contact record for port agents. If mishandled, the wrong agent acts, notices go nowhere, and DA coordination breaks.
- `Voyages / Dropdowns / Agents and Notices - Voyages / How do I confirm that an Agent Appointment or Update is sent from a voyage and received?`: A practical control note for proving an appointment email actually left and was received. This exists because "I clicked send" is not evidence when a port call goes wrong.

## Voyages: Commercial and Financial Control

- `Voyages / Dropdowns / Invoices - Voyages / IMOS - Invoices - Voyage`: The voyage-level billing control center. This is where operations can see whether the money side of the voyage is caught up with the physical side.
- `Voyages / Dropdowns / P&L - Voyages / IMOS - P&L - Voyage`: The financial performance view of the voyage. Operators and commercial teams use it to explain why the actual result diverged from the original expectation.
- `Voyages / Dropdowns / P&L - Voyages / P&L - P&L Calculation Options - Voyages / IMOS - P&L - P&L Calculation Options`: The rule set behind accrual and P&L calculation behavior. Small option changes here can move cost recognition between periods and materially change month-end numbers.
- `Voyages / Dropdowns / P&L - Voyages / P&L - P&L Calculation Options - Voyages / Apply & Adjust Portion Off Hire Calculation - Voyages / Apply & Adjust Portion Off Hire Calculation`: A specific guide to off-hire accrual treatment. This matters because off-hire timing is a classic source of month-end dispute between operations and accounting.
- `Voyages / Dropdowns / P&L - Voyages / P&L - Understanding the Different Snapshot Types in Voyage P&L - Voyages / IMOS - P&L - Understanding the Different Snapshot Types in Voyage P&L`: Explains saved P&L snapshots over time. Operators need this when management asks not "what is the P&L now?" but "what did we think it was last week and why did it move?"
- `Voyages / Dropdowns / Port Expenses Summary - Voyages / IMOS - Port Expenses Summary`: The entry point for PDA or port expense creation. This is where expected and actual port cost administration begins.
- `Voyages / Dropdowns / Port Expenses Summary - Voyages / Port Expense - Voyages / IMOS - Port Expense`: The detailed port expense record. Wrong entries here do not just affect cost reporting; they can also feed the wrong numbers into voyage profitability and rebills.
- `Voyages / Dropdowns / Voyage Expenses Rebill Management - Voyages / IMOS - Voyage Expenses Rebill Management`: Central screen for rebilling eligible voyage expenses. This is where the company decides which costs stay with it and which are pushed to charterers or other parties.
- `Voyages / Dropdowns / Rebills for Off Hire and Port Expenses - Voyages / IMOS - Rebills for Off Hire and Port Expenses`: Special rebill workflow for off-hire and port expenses outside a TC context. It matters when the operator needs to recover costs from a third party rather than absorb them.
- `Voyages / Dropdowns / CP Quantity Details - Voyages / IMOS - CP Quantity Details`: The contractual quantity control page. If quantities are wrong here, freight, deadfreight, and P&L all become mathematically wrong even before invoicing starts.
- `Voyages / Dropdowns / Deviation Estimate - Voyages / IMOS - Deviation Estimate`: A what-if estimate snapshot for itinerary changes. This is how an operator or chartering user tests whether a voyage change is commercially survivable before committing.
- `Voyages / Dropdowns / Deviation Analysis - Voyages / IMOS - Deviation Analysis`: Compares the cost effect of itinerary changes. This is the analysis behind statements like "that diversion cost us X in fuel and time."
- `Voyages / Dropdowns / Deviation TCE - Voyages / IMOS - Deviation TCE`: A round-trip/deviation scenario tool at estimate level. Its value is in commercial evaluation before execution, especially where ballast or repositioning changes the economics.

## Voyages: Delays and Bunkers

- `Voyages / Dropdowns / Delay - Voyages / IMOS - Delay`: The core delay-recording form. This is where off-hire, waiting, and delay facts become structured data instead of email narratives.
- `Voyages / Dropdowns / Delay - Voyages / Extra Delay Costs - Voyages / IMOS - Extra Delay Costs`: A supporting cost breakdown for a delay. It is mainly documentary, but still valuable when someone later asks what actually made up the claim or the operational inconvenience.
- `Voyages / Dropdowns / Delay - Voyages / Extra Delay Costs - Voyages / Bunker Price - Voyages / IMOS - Bunker Price`: Controls bunker price assumptions during delay calculations. Wrong fuel pricing here means wrong off-hire bunker settlements.
- `Voyages / Dropdowns / Delay - Voyages / Extra Delay Costs - Voyages / Bunker Price - Voyages / Record $0_MT for TC off Hire Bunkers`: A workaround note for zero-value off-hire bunker treatment. This matters because the system protects against accidental omission, but real edge cases still need a controlled method.
- `Voyages / Dropdowns / Delay - Voyages / Extra Delay Costs - Voyages / Bunker Price - Voyages / Adding Pre-Purchased Bunkers in IMOS After a Voyage Has Commenced`: A correction workflow for late bunker setup. It protects voyage consistency when fuel was commercially arranged before the system caught up.
- `Voyages / Dropdowns / Voyage Bunkers - Voyages / IMOS - Voyage Bunkers`: The planning and tracking page for voyage fuel. Operators use this to see future bunkering needs and whether procurement is aligned with voyage consumption.
- `Voyages / Dropdowns / Voyage Bunkers - Voyages / Add New Bunker Type to Voyage - Voyages / IMOS - Add New Bunker Type to Voyage`: A targeted fix for introducing a new fuel grade on an existing voyage. This matters more now because vessels may switch grades for ECA or technical reasons mid-program.

