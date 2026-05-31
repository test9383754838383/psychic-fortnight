/**
 * D-LOCK-4: PortActivity event_type values (21 values).
 * Single source of truth matching the backend CheckConstraint.
 */
export const EVENT_TYPES = [
  "Arrived",
  "Anchored",
  "Berthed",
  "All Fast",
  "Commenced Loading",
  "Completed Loading",
  "Commenced Discharging",
  "Completed Discharging",
  "Hoses Connected",
  "Hoses Disconnected",
  "Departed",
  "NOR Tendered",
  "NOR Re-tendered",
  "NOR Accepted",
  "Free Pratique Granted",
  "Tugs Engaged",
  "Tugs Released",
  "Bunkering Commenced",
  "Bunkering Completed",
  "Delay Commenced",
  "Delay Ended",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * D-LOCK-6: OperationalReport status machine.
 * Mirrors LEGAL_TRANSITIONS in operational_report_service.py.
 */
export const LEGAL_REPORT_TRANSITIONS: Record<string, string[]> = {
  Pending: ["Queried", "Accepted", "Rejected"],
  Queried: ["Accepted", "Rejected"],
  Accepted: [],
  Rejected: [],
};

/**
 * Report types — D-33 (D-LOCK-5):
 * Noon is voyage-anchored; the rest are port-call-anchored.
 */
export const REPORT_TYPES = [
  "Noon",
  "Arrival",
  "Departure",
  "Statement of Facts",
  "Bunkering",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const VOYAGE_ANCHORED_REPORT_TYPES: ReadonlySet<ReportType> = new Set([
  "Noon",
]);

/** Roles that may mutate operational records (D-LOCK-9). */
export const MUTATION_ROLES: ReadonlySet<string> = new Set([
  "Operations",
  "Admin",
]);
