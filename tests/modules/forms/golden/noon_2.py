"""Golden corpus fixture: Noon Report — email 2."""

RAW_EMAIL = """\
From: master@mvatlantic.com
To: ops@company.com
Subject: Noon Report – MV Atlantic Princess – 01 June 2026

Noon Report – 01 June 2026 1200 UTC

Vessel: MV ATLANTIC PRINCESS
Position: 10°30.0'N / 045°15.0'W
GPS Speed: 13.8 Knots
LOG Speed: 13.5 Knots
Distance to go: 890 NM

Bunker ROB: FO 620.0 MT / DO 42.5 MT
Wind: BF 3

Master
"""

EXPECTED_JSON = {
    "vessel_name": "MV ATLANTIC PRINCESS",
    "report_time": "2026-06-01T12:00:00+00:00",
    "latitude": "10.500",
    "longitude": "-45.250",
    "speed_gps": "13.8",
    "speed_log": "13.5",
    "distance_to_go": "890.0",
    "bunker_fo_rob_mt": "620.0",
    "bunker_do_rob_mt": "42.5",
    "wind_force_beaufort": 3,
}
