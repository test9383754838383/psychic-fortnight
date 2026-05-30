import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { VoyageWorkspaceHeader } from "../components/VoyageWorkspaceHeader";
import { ItineraryTable } from "../components/ItineraryTable";
import { PortCallPanel } from "../components/PortCallPanel/PortCallPanel";

import type { ScheduleFilters } from "../components/ScheduleFilterBar";
import { voyageWorkspaceRoute } from "./voyages.$voyageId.workspace";

export function VoyageWorkspacePage() {
  const { voyageId } = voyageWorkspaceRoute.useParams();

  const { data: voyage, isLoading, isError, error } = useQuery({
    queryKey: ["voyage", voyageId, "workspace"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/workspace", {
        params: {
          path: { voyage_id: voyageId },
        },
      });
      if (!response.ok) throw new Error("Failed to fetch voyage workspace");
      return data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="glass-panel" style={{ maxWidth: "none" }}>
          Loading Voyage Workspace...
        </div>
      </div>
    );
  }

  if (isError || !voyage) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="error-card">
          <div className="error-icon">!</div>
          <div className="error-title">Error Loading Workspace</div>
          <div className="error-message">{error?.message ?? "Voyage not found"}</div>
          <Link 
            to="/schedule" 
            search={() => ({}) as ScheduleFilters} 
            className="btn-retry" 
            style={{ textDecoration: "none" }}
          >
            Back to Schedule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link 
          to="/schedule" 
          search={(old: unknown) => (old as ScheduleFilters)} // Preserve search params
          style={{ color: "var(--accent-primary)", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          ← Back to Schedule
        </Link>
      </div>

      <VoyageWorkspaceHeader voyage={voyage} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <ItineraryTable itinerary={voyage.itinerary} />
          <PortCallPanel voyageId={voyageId} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="itinerary-section" style={{ marginTop: "2rem" }}>
             <h3 style={{ fontFamily: "var(--font-title)", marginBottom: "1rem", fontSize: "1.25rem" }}>Instructions</h3>
             <div className="glass-panel" style={{ padding: "1.5rem", maxWidth: "none", textAlign: "left", minHeight: "150px" }}>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {voyage.voyage_instructions ?? "No instructions provided."}
                </pre>
             </div>
          </div>
          <div className="itinerary-section">
             <h3 style={{ fontFamily: "var(--font-title)", marginBottom: "1rem", fontSize: "1.25rem" }}>Ops Notes</h3>
             <div className="glass-panel" style={{ padding: "1.5rem", maxWidth: "none", textAlign: "left", minHeight: "150px" }}>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {voyage.ops_notes ?? "No operational notes."}
                </pre>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
