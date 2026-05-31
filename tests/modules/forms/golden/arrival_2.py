"""Golden corpus fixture: Arrival Report — email 2."""

RAW_EMAIL = """\
To: voyage@operator.com
From: captain@mvatlantic.com

ARRIVAL REPORT

Vessel: MV ATLANTIC PRINCESS
Port: Singapore
Date/Time of Arrival: 02 June 2026 / 1445 UTC

Bunkers at Arrival:
FO ROB: 510 MT
DO ROB: 35.0 MT

Best regards,
Captain
"""

EXPECTED_JSON = {
    "vessel_name": "MV ATLANTIC PRINCESS",
    "port_name": "Singapore",
    "arrival_time": "2026-06-02T14:45:00+00:00",
    "bunker_fo_rob_mt": "510.0",
    "bunker_do_rob_mt": "35.0",
    "draft_fore_m": None,
    "draft_aft_m": None,
}
