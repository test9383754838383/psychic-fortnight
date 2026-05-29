export const STATUS_COLORS: Record<string, string> = {
  Scheduled: "#9ca3af", // grey
  Commenced: "#3b82f6", // blue
  Completed: "#10b981", // green
  Closed: "#4b5563",    // dark-grey
  Cancelled: "#ef4444", // red
};

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] ?? "#d1d5db"; // default light grey
};
