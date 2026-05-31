import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useCurrentUser } from "../../auth/AuthContext";
import { ReportForm } from "./ReportForm";
import { ReportTransitionControl } from "./ReportTransitionControl";
import { MUTATION_ROLES } from "../../lib/operationalReportingConstants";
import type { components } from "../../api/schema";

interface ReportsPanelProps {
  voyageId: string;
  portCallId: string | null;
}

export function ReportsPanel({ voyageId, portCallId }: ReportsPanelProps) {
  const { currentUser, loading: authLoading } = useCurrentUser();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReport, setEditingReport] = useState<components["schemas"]["OperationalReportResponseDTO"] | null>(null);

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["voyage", voyageId, "reports"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/voyages/{voyage_id}/reports",
        { params: { path: { voyage_id: voyageId } } }
      );
      if (!response.ok) throw new Error("Failed to fetch reports");
      return data ?? [];
    },
  });

  const canMutate =
    currentUser?.roles.some((role) => MUTATION_ROLES.has(role)) ?? false;

  const isLoading = authLoading || reportsLoading;

  if (isLoading) {
    return <div className="loading-text">Loading reports…</div>;
  }

  if (showAddForm) {
    return (
      <div className="glass-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}>
        <ReportForm
          voyageId={voyageId}
          portCallId={portCallId}
          onSuccess={() => setShowAddForm(false)}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  if (editingReport) {
    return (
      <div className="glass-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}>
        <ReportForm
          voyageId={voyageId}
          portCallId={portCallId}
          report={editingReport}
          onSuccess={() => setEditingReport(null)}
          onCancel={() => setEditingReport(null)}
        />
      </div>
    );
  }

  // Filter reports: Noon reports (voyage-level) are shown; others must match portCallId.
  const filteredReports = reports.filter((report) => {
    if (report.report_type === "Noon") return true;
    return report.port_call_id === portCallId;
  });

  return (
    <section className="reports-panel glass-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 className="panel-heading" style={{ margin: 0 }}>Operational Reports</h3>
        {canMutate && (
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowAddForm(true)}
          >
            + Add Report
          </button>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">No reports found</div>
      ) : (
        <div className="report-list" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filteredReports.map((report) => {
            const isPending = report.status === "Pending";
            return (
              <div
                key={report.id}
                className="report-card glass-panel"
                data-testid={`report-card-${report.id}`}
                style={{ padding: "1.25rem", border: "1px solid var(--border-glass)", margin: 0, boxShadow: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>{report.report_type}</span>
                      <span className={`status-chip status-chip--${report.status.toLowerCase()}`}>
                        {report.status}
                      </span>
                    </h4>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Submitted at: {report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "-"} by {report.submitted_by_user_id}
                    </div>
                    {report.supersedes_report_id && (
                      <div style={{ fontSize: "0.75rem", color: "var(--accent-secondary)", marginTop: "0.25rem" }}>
                        Supersedes: {report.supersedes_report_id}
                      </div>
                    )}
                  </div>
                  {isPending && canMutate && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setEditingReport(report)}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {report.report_type === "Noon" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", fontSize: "0.875rem", marginBottom: "1rem", opacity: 0.9 }}>
                    <div>
                      <strong>Lat/Lon:</strong> {report.position_lat ?? "-"} / {report.position_lon ?? "-"}
                    </div>
                    <div>
                      <strong>Speed:</strong> {report.speed_24h ?? "-"} kts
                    </div>
                    <div>
                      <strong>DTG:</strong> {report.distance_to_go ?? "-"} nm
                    </div>
                  </div>
                )}

                <ReportTransitionControl
                  report={report}
                  currentUser={currentUser}
                  voyageId={voyageId}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
