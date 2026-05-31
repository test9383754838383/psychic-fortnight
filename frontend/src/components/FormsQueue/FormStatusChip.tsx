interface FormStatusChipProps {
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  Received: "#3b82f6",
  "Under Review": "#f59e0b",
  Queried: "#8b5cf6",
  Accepted: "#10b981",
  Rejected: "#ef4444",
};

export function FormStatusChip({ status }: FormStatusChipProps) {
  const color = STATUS_COLOR[status] ?? "#6b7280";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#fff",
        backgroundColor: color,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
