import React from "react";
import { format, parseISO } from "date-fns";
import type { components } from "../api/schema";

type VoyageWorkspaceResponse = components["schemas"]["VoyageWorkspaceResponse"];

interface VoyageWorkspaceHeaderProps {
  voyage: VoyageWorkspaceResponse;
}

export const VoyageWorkspaceHeader: React.FC<VoyageWorkspaceHeaderProps> = ({ voyage }) => {
  return (
    <div className="workspace-header" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 className="panel-title" style={{ textAlign: "left", marginBottom: "0.5rem" }}>
            Voyage {voyage.voyage_no}
          </h1>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", color: "var(--text-secondary)" }}>
            <span>{voyage.vessel.name}</span>
            <span className="user-dot" style={{ width: "6px", height: "6px" }} />
            <span className="status-badge" style={{ marginBottom: 0 }}>{voyage.status}</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", maxWidth: "none", textAlign: "left", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Charterer</label>
          <div style={{ fontWeight: 600 }}>{voyage.charterer ?? "N/A"}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>CP Type / Date</label>
          <div style={{ fontWeight: 600 }}>
            {voyage.cp_type ?? "N/A"} {voyage.cp_date ? `(${format(parseISO(voyage.cp_date), "PP")})` : ""}
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Commencing</label>
          <div style={{ fontWeight: 600 }}>{format(parseISO(voyage.commencing_datetime), "PPp")}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Estimated Completion</label>
          <div style={{ fontWeight: 600 }}>
            {voyage.expected_completing_datetime ? format(parseISO(voyage.expected_completing_datetime), "PPp") : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
};
