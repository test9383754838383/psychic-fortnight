"""Golden corpus fixture: Bunkering Report — email 1."""

RAW_EMAIL = """\
From: master@mvnoonstar.com
To: ops@dimmare.com
Subject: Bunkering Report - MV Noon Star - Rotterdam

Bunkering completed at Rotterdam.

Vessel: MV NOON STAR
Port: Rotterdam
Bunkering Start: 30 May 2026 0800 UTC
Bunkering End:   30 May 2026 1600 UTC

Received:
  FO: 150.0 MT
  DO: 20.0 MT

Supplier: Shell Marine

Master
"""

EXPECTED_JSON = {
    "vessel_name": "MV NOON STAR",
    "port_name": "Rotterdam",
    "bunkering_start_time": "2026-05-30T08:00:00+00:00",
    "bunkering_end_time": "2026-05-30T16:00:00+00:00",
    "bunker_fo_received_mt": "150.0",
    "bunker_do_received_mt": "20.0",
    "bunker_supplier": "Shell Marine",
}
