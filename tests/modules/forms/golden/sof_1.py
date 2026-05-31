"""Golden corpus fixture: Statement of Facts — email 1."""

RAW_EMAIL = """\
From: master@mvnoonstar.com
To: ops@dimmare.com
Subject: Statement of Facts - MV Noon Star - Rotterdam

STATEMENT OF FACTS
Vessel: MV NOON STAR
Port: Rotterdam
Arrived: 29 May 2026 0630 UTC
Departed: 31 May 2026 1400 UTC

Cargo Discharged: 45000 MT

Demurrage Rate: USD 15000 per day

Remarks: Operations proceeded without delays.

Master
"""

EXPECTED_JSON = {
    "vessel_name": "MV NOON STAR",
    "port_name": "Rotterdam",
    "arrival_time": "2026-05-29T06:30:00+00:00",
    "departure_time": "2026-05-31T14:00:00+00:00",
    "cargo_quantity_mt": "45000.0",
    "demurrage_rate_usd_per_day": "15000.0",
    "remarks": "Operations proceeded without delays.",
}
