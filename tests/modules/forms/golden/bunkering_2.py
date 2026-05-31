"""Golden corpus fixture: Bunkering Report — email 2."""

RAW_EMAIL = """\
BUNKERING COMPLETION REPORT

MV ATLANTIC PRINCESS
Port: Fujairah
Bunker Start: 04/06/2026 0600Z
Bunker End:   04/06/2026 1200Z

Quantity Received:
FO: 200 MT
DO: 15 MT

No supplier name provided.
"""

EXPECTED_JSON = {
    "vessel_name": "MV ATLANTIC PRINCESS",
    "port_name": "Fujairah",
    "bunkering_start_time": "2026-06-04T06:00:00+00:00",
    "bunkering_end_time": "2026-06-04T12:00:00+00:00",
    "bunker_fo_received_mt": "200.0",
    "bunker_do_received_mt": "15.0",
    "bunker_supplier": None,
}
