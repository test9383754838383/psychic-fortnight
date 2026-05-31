"""Golden corpus fixture: Statement of Facts — email 2."""

RAW_EMAIL = """\
SOF – MV ATLANTIC PRINCESS – SINGAPORE

Arrival: 02/06/2026 1445 UTC
Departure: 03/06/2026 0800 UTC
Cargo Loaded: 52000 MT

Demurrage Rate: N/A
No remarks.
"""

EXPECTED_JSON = {
    "vessel_name": "MV ATLANTIC PRINCESS",
    "port_name": "Singapore",
    "arrival_time": "2026-06-02T14:45:00+00:00",
    "departure_time": "2026-06-03T08:00:00+00:00",
    "cargo_quantity_mt": "52000.0",
    "demurrage_rate_usd_per_day": None,
    "remarks": None,
}
