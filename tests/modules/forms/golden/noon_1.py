"""Golden corpus fixture: Noon Report — email 1."""

RAW_EMAIL = """\
To: ops@dimmare.com
From: master@mvnoonstar.com
Subject: Noon Report - MV Noon Star - 2026-05-31

Dear Ops,

Noon Report for MV NOON STAR, 31 May 2026, 12:00 UTC

Position: LAT 35°07.4'N, LON 120°39.2'W
Speed (GPS): 12.5 kts
Speed (Log): 12.2 kts
Distance to Go: 1250.5 NM
Wind Force: BF5

Bunkers ROB:
  FO: 450.2 MT
  DO: 55.8 MT

Regards,
Master
"""

EXPECTED_JSON = {
    "vessel_name": "MV NOON STAR",
    "report_time": "2026-05-31T12:00:00+00:00",
    "latitude": "35.123",
    "longitude": "-120.654",
    "speed_gps": "12.5",
    "speed_log": "12.2",
    "distance_to_go": "1250.5",
    "bunker_fo_rob_mt": "450.2",
    "bunker_do_rob_mt": "55.8",
    "wind_force_beaufort": 5,
}
