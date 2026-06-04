"""
operational_reporting public surface.

External modules may only import from here — never from sub-packages
(repositories/*, models/*) directly (D-LOCK-1 / Tach boundary).
"""

from src.modules.operational_reporting.api.port_activity import (
    port_call_events_router,
    port_call_log_router,
    PortActivityEventType,
)
from src.modules.operational_reporting.api.operational_report import (
    voyage_reports_router,
    port_call_reports_router,
    reports_member_router,
    OperationalReportType,
    OperationalReportStatus,
)
from src.modules.operational_reporting.api.activity_report import (
    voyage_router as activity_report_voyage_router,
    member_router as activity_report_member_router,
    bunker_line_router as activity_report_bunker_line_router,
)

__all__ = [
    # Routers
    "port_call_events_router",
    "port_call_log_router",
    "voyage_reports_router",
    "port_call_reports_router",
    "reports_member_router",
    "activity_report_voyage_router",
    "activity_report_member_router",
    "activity_report_bunker_line_router",
    # Public types
    "PortActivityEventType",
    "OperationalReportType",
    "OperationalReportStatus",
]
