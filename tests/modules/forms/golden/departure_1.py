"""Golden corpus fixture: Departure Report — email 1."""

RAW_EMAIL = """\
From: master@mvnoonstar.com
To: ops@dimmare.com
Subject: Departure Report - MV Noon Star - Rotterdam

Dear Ops,

MV NOON STAR departed Rotterdam on 31 May 2026 at 1400 UTC.
Next port: Antwerp.

Bunkers on Departure:
  FO: 450.0 MT
  DO: 55.0 MT

Drafts: Fore 9.5 m / Aft 10.0 m

Regards,
Master
"""

EXPECTED_JSON = {
    "vessel_name": "MV NOON STAR",
    "port_name": "Rotterdam",
    "departure_time": "2026-05-31T14:00:00+00:00",
    "next_port_name": "Antwerp",
    "bunker_fo_rob_mt": "450.0",
    "bunker_do_rob_mt": "55.0",
    "draft_fore_m": "9.5",
    "draft_aft_m": "10.0",
}
