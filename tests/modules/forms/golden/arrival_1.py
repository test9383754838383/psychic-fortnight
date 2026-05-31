"""Golden corpus fixture: Arrival Report — email 1."""

RAW_EMAIL = """\
From: master@mvnoonstar.com
To: ops@dimmare.com
Subject: Arrival Report - MV Noon Star - Rotterdam

Dear Ops,

We are pleased to report that MV NOON STAR arrived at Rotterdam
on 29 May 2026 at 0630 UTC.

Bunkers ROB on Arrival:
  FO: 380.5 MT
  DO: 48.2 MT

Draft:
  Fore: 9.8 m
  Aft: 10.2 m

Yours faithfully,
Master
"""

EXPECTED_JSON = {
    "vessel_name": "MV NOON STAR",
    "port_name": "Rotterdam",
    "arrival_time": "2026-05-29T06:30:00+00:00",
    "bunker_fo_rob_mt": "380.5",
    "bunker_do_rob_mt": "48.2",
    "draft_fore_m": "9.8",
    "draft_aft_m": "10.2",
}
