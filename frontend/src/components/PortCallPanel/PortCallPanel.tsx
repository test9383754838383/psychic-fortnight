import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { format } from "date-fns";
import { PortCallForm } from "./PortCallForm";
import { StatusTransitionControl } from "./StatusTransitionControl";
import { AgentAppointmentSection } from "./AgentAppointmentSection";
import { components } from "../../api/schema";

interface PortCallPanelProps {
  voyageId: string;
}

export const PortCallPanel: React.FC<PortCallPanelProps> = ({ voyageId }) => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPortCall, setEditingPortCall] = useState<components["schemas"]["PortCallResponseDTO"] | null>(null);

  const { data: portCalls, isLoading, isError } = useQuery({
    queryKey: ["voyages", voyageId, "port-calls"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/port-calls", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch port calls");
      return data ?? [];
    },
  });

  const { data: itinerary } = useQuery({
    queryKey: ["voyages", voyageId, "itinerary"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/itinerary", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch itinerary");
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: components["schemas"]["PortCallCreateDTO"]) => {
      const { response } = await apiClient.POST("/api/v1/voyages/{voyage_id}/port-calls", {
        params: { path: { voyage_id: voyageId } },
        body: { ...body, port_id: body.port_id },
      });
      if (!response.ok) throw new Error("Failed to create port call");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyages", voyageId, "port-calls"] });
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: components["schemas"]["PortCallUpdateDTO"] }) => {
      const { response } = await apiClient.PATCH("/api/v1/port-calls/{port_call_id}", {
        params: { path: { port_call_id: id } },
        body,
      });
      if (!response.ok) throw new Error("Failed to update port call");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyages", voyageId, "port-calls"] });
      setIsFormOpen(false);
      setEditingPortCall(null);
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, toStatus }: { id: string; toStatus: string }) => {
      const { response } = await apiClient.POST("/api/v1/port-calls/{port_call_id}/transition", {
        params: { path: { port_call_id: id } },
        body: { to: toStatus },
      });
      if (!response.ok) throw new Error("Failed to transition port call");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyages", voyageId, "port-calls"] });
    },
  });

  if (isLoading) return <div>Loading port calls...</div>;
  if (isError) return <div>Error loading port calls</div>;

  if (isFormOpen) {
    const port = editingPortCall 
      ? { id: editingPortCall.port_id, name: "Selected Port", timezone_name: editingPortCall.timezone_name }
      : { id: itinerary?.[0]?.port_ref ?? "", name: "Unknown Port", timezone_name: "UTC" };

    return (
      <PortCallForm
        initialData={editingPortCall ?? undefined}
        port={port}
        onCancel={() => {
          setIsFormOpen(false);
          setEditingPortCall(null);
        }}
        onSubmit={(data) => {
          if (editingPortCall) {
            updateMutation.mutate({ id: editingPortCall.id, body: data });
          } else {
            createMutation.mutate({
                port_id: port.id,
                ...data,
            });
          }
        }}
      />
    );
  }

  return (
    <div className="itinerary-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontFamily: "var(--font-title)", fontSize: "1.25rem" }}>Port Calls</h3>
        <button 
          className="btn-primary" 
          onClick={() => setIsFormOpen(true)}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
        >
          + Add Port Call
        </button>
      </div>

      {!portCalls || portCalls.length === 0 ? (
        <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>No port calls found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {portCalls.map((pc) => (
            <div key={pc.id} className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h4 style={{ margin: 0 }}>Port: {pc.port_id}</h4>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{pc.timezone_name}</div>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span className={`status-chip status-${pc.status.toLowerCase().replace(/ /g, "-")}`}>
                    {pc.status}
                  </span>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setEditingPortCall(pc);
                      setIsFormOpen(true);
                    }}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Arrival</div>
                  <div style={{ fontSize: "0.875rem" }}>
                    {pc.ata ? format(new Date(pc.ata), "yyyy-MM-dd HH:mm") : (pc.eta ? format(new Date(pc.eta), "yyyy-MM-dd HH:mm") : "-")}
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                      ({pc.ata ? "Actual" : "Planned"})
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Departure</div>
                  <div style={{ fontSize: "0.875rem" }}>
                    {pc.atd ? format(new Date(pc.atd), "yyyy-MM-dd HH:mm") : (pc.etd ? format(new Date(pc.etd), "yyyy-MM-dd HH:mm") : "-")}
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                      ({pc.atd ? "Actual" : "Planned"})
                    </span>
                  </div>
                </div>
                <div>
                   <StatusTransitionControl 
                    portCall={pc} 
                    onTransition={(toStatus) => transitionMutation.mutate({ id: pc.id, toStatus })} 
                   />
                </div>
              </div>

              <AgentAppointmentSection portCallId={pc.id} />
              
              {pc.ops_notes && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "4px", fontSize: "0.875rem" }}>
                  <strong>Notes:</strong> {pc.ops_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
