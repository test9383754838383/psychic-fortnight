CHECKLIST_TYPE_PRE_ARRIVAL = "Pre-Arrival"
CHECKLIST_TYPE_PRE_DEPARTURE = "Pre-Departure"
CHECKLIST_TYPES = (
    CHECKLIST_TYPE_PRE_ARRIVAL,
    CHECKLIST_TYPE_PRE_DEPARTURE,
)

CHECKLIST_STATUS_OPEN = "Open"
CHECKLIST_STATUS_COMPLETED = "Completed"
CHECKLIST_STATUSES = (
    CHECKLIST_STATUS_OPEN,
    CHECKLIST_STATUS_COMPLETED,
)

ITEM_STATUS_PENDING = "Pending"
ITEM_STATUS_SIGNED_OFF = "Signed Off"
ITEM_STATUSES = (
    ITEM_STATUS_PENDING,
    ITEM_STATUS_SIGNED_OFF,
)

DEFAULT_ITEMS = {
    CHECKLIST_TYPE_PRE_ARRIVAL: [
        "Pre-arrival notice sent to agent",
        "Berth/anchorage confirmed",
        "Pilot booked",
        "Cargo documents received",
        "NOR tender readiness confirmed",
    ],
    CHECKLIST_TYPE_PRE_DEPARTURE: [
        "Cargo operations completed",
        "Statement of Facts signed",
        "Outstanding disbursements reviewed",
        "Departure clearance obtained",
        "Next-port ETA communicated",
    ],
}
