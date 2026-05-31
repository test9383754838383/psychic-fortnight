import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { FormStatusChip } from "./FormStatusChip";
import { FORM_TYPES, FORM_STATUSES } from "../../lib/formConstants";
import type { components } from "../../api/schema";

type FormReadDTO = components["schemas"]["FormReadDTO"];

interface FormsQueueProps {
  onSelect: (formId: string) => void;
  selectedId: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatAnchor(form: FormReadDTO): string {
  if (form.voyage_id) return form.voyage_id;
  if (form.port_call_id) return form.port_call_id;
  return "—";
}

export function FormsQueue({ onSelect, selectedId }: FormsQueueProps) {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data: forms, isLoading } = useQuery({
    queryKey: ["forms", statusFilter, typeFilter],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (statusFilter) query.status = statusFilter;
      if (typeFilter) query.form_type = typeFilter;

      const { data, response } = await apiClient.GET("/api/v1/forms", {
        params: { query },
      });
      if (!response.ok) throw new Error("Failed to fetch forms");
      return data ?? [];
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem" }}>
          <span>Status</span>
          <select
            aria-label="status filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginTop: "0.2rem", padding: "0.25rem" }}
          >
            <option value="">All</option>
            {FORM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem" }}>
          <span>Type</span>
          <select
            aria-label="type filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ marginTop: "0.2rem", padding: "0.25rem" }}
          >
            <option value="">All</option>
            {FORM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <div>Loading forms…</div>}

      {!isLoading && forms?.length === 0 && (
        <div style={{ color: "var(--text-secondary)", padding: "1rem 0" }}>
          No forms found.
        </div>
      )}

      {forms && forms.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color, #374151)" }}>
              <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>
                Status
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>
                Type
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>
                Anchor
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>
                Received
              </th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr
                key={form.id}
                data-testid={`form-row-${form.id}`}
                aria-selected={selectedId === form.id ? "true" : "false"}
                onClick={() => onSelect(form.id)}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedId === form.id
                      ? "rgba(59,130,246,0.15)"
                      : "transparent",
                  borderBottom: "1px solid var(--border-color, #1f2937)",
                }}
              >
                <td style={{ padding: "0.5rem" }}>
                  <FormStatusChip status={form.status} />
                </td>
                <td style={{ padding: "0.5rem" }}>{form.form_type}</td>
                <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {formatAnchor(form)}
                </td>
                <td style={{ padding: "0.5rem" }}>{formatDate(form.received_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
