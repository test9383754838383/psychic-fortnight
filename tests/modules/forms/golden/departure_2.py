"""Golden corpus fixture: Departure Report — email 2."""

RAW_EMAIL = """\
DEPARTURE REPORT

Vessel: MV ATLANTIC PRINCESS
Departed: Singapore, 03 June 2026 at 0800 UTC
Next Port: Port Klang

FO ROB at Departure: 508.5 MT
DO ROB at Departure: 33.0 MT
"""

EXPECTED_JSON = {
    "vessel_name": "MV ATLANTIC PRINCESS",
    "port_name": "Singapore",
    "departure_time": "2026-06-03T08:00:00+00:00",
    "next_port_name": "Port Klang",
    "bunker_fo_rob_mt": "508.5",
    "bunker_do_rob_mt": "33.0",
    "draft_fore_m": None,
    "draft_aft_m": None,
}
