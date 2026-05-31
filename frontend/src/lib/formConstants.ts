export const FORM_TYPES = [
  "Noon",
  "Arrival",
  "Departure",
  "Bunkering",
  "Statement of Facts",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

export const FORM_STATUSES = [
  "Received",
  "Under Review",
  "Queried",
  "Accepted",
  "Rejected",
] as const;

export type FormStatus = (typeof FORM_STATUSES)[number];

export const LEGAL_TRANSITIONS: Record<string, string[]> = {
  Received: ["Under Review", "Accepted", "Rejected"],
  "Under Review": ["Queried", "Accepted", "Rejected"],
  Queried: ["Under Review", "Rejected"],
  Accepted: [],
  Rejected: [],
};

export const TERMINAL_STATUSES = new Set<string>(["Accepted", "Rejected"]);

export const ROLE_CAN_ACCEPT_REJECT = new Set<string>(["Admin", "Operations"]);
