import React from "react";
import { format, parseISO } from "date-fns";
import type { components } from "../api/schema";

type ItineraryItem = components["schemas"]["WorkspaceItineraryItemDTO"];

interface ItineraryTableProps {
  itinerary: ItineraryItem[];
}

export const ItineraryTable: React.FC<ItineraryTableProps> = ({ itinerary }) => {
  return (
    <div className="itinerary-section" style={{ marginTop: "2rem" }}>
      <h3 style={{ fontFamily: "var(--font-title)", marginBottom: "1rem", fontSize: "1.25rem" }}>Itinerary</h3>
      <div className="glass-panel" style={{ padding: "0", maxWidth: "none", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-glass)" }}>
              <th style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Seq</th>
              <th style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Port</th>
              <th style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>ETA</th>
              <th style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>ETD</th>
            </tr>
          </thead>
          <tbody>
            {itinerary.map((item) => (
              <tr key={item.sequence_no} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{item.sequence_no}</td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 600 }}>{item.port_code}</td>
                <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{format(parseISO(item.planned_eta), "PPp")}</td>
                <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{format(parseISO(item.planned_etd), "PPp")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
