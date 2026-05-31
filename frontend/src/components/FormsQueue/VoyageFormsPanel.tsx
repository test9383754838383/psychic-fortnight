import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { apiClient } from "../../api/client";
import { FormStatusChip } from "./FormStatusChip";

interface VoyageFormsPanelProps {
  voyageId: string;
}

export function VoyageFormsPanel({ voyageId }: VoyageFormsPanelProps) {
  const { data: forms, isLoading } = useQuery({
    queryKey: ["forms", "voyage", voyageId],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/forms", {
        params: { query: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch voyage forms");
      return data ?? [];
    },
  });

  return (
    <div className="itinerary-section">
      <h3 style={{ fontFamily: "var(--font-title)", marginBottom: "0.75rem", fontSize: "1.1rem" }}>
        Forms
      </h3>
      <div className="glass-panel" style={{ padding: "1rem", maxWidth: "none" }}>
        {isLoading && <div>Loading forms…</div>}

        {!isLoading && forms?.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            No forms linked to this voyage.
          </div>
        )}

        {forms && forms.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color, #374151)" }}>
                <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>Type</th>
                <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>Received</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr
                  key={form.id}
                  style={{ borderBottom: "1px solid var(--border-color, #1f2937)" }}
                >
                  <td style={{ padding: "0.3rem 0.5rem" }}>
                    <FormStatusChip status={form.status} />
                  </td>
                  <td style={{ padding: "0.3rem 0.5rem" }}>{form.form_type}</td>
                  <td style={{ padding: "0.3rem 0.5rem" }}>
                    {new Date(form.received_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: "0.75rem" }}>
          <Link
            to="/forms"
            style={{ fontSize: "0.8rem", color: "var(--accent-primary)" }}
          >
            View all forms →
          </Link>
        </div>
      </div>
    </div>
  );
}
