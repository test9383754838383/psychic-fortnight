import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useCombobox } from "downshift";
import { format } from "date-fns";
import { components } from "../../api/schema";

interface AgentAppointmentSectionProps {
  portCallId: string;
}

export const AgentAppointmentSection: React.FC<AgentAppointmentSectionProps> = ({ portCallId }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: appointments } = useQuery({
    queryKey: ["port-calls", portCallId, "agent-appointments"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/port-calls/{port_call_id}/agent-appointments", {
        params: { path: { port_call_id: portCallId } },
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["counterparties", "agents", searchTerm],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/counterparties", {
        params: { query: { role: "Agent" } },
      });
      if (!response.ok) throw new Error("Failed to fetch agents");
      const list = Array.isArray(data) ? data : [];
      return list.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    },
  });

  const nominateMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { response } = await apiClient.POST("/api/v1/port-calls/{port_call_id}/agent-appointments", {
        params: { path: { port_call_id: portCallId } },
        body: { 
          agent_ref: agentId,
          appointed_date: format(new Date(), "yyyy-MM-dd"),
        },
      });
      if (!response.ok) throw new Error("Failed to nominate agent");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["port-calls", portCallId, "agent-appointments"] });
    },
  });

  const appointMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { response } = await apiClient.PATCH("/api/v1/agent-appointments/{id}/appoint", {
        params: { path: { id: appointmentId } },
      });
      if (!response.ok) throw new Error("Failed to appoint agent");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["port-calls", portCallId, "agent-appointments"] });
    },
  });

  const activeAppointment = appointments?.find(a => a.status === "Appointed") ?? appointments?.find(a => a.status === "Nominated");

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    getLabelProps,
    getToggleButtonProps,
    highlightedIndex,
  } = useCombobox<components["schemas"]["CounterpartyResponseDTO"]>({
    items: agents,
    itemToString: (item) => (item ? item.name : ""),
    onInputValueChange: ({ inputValue }) => {
      setSearchTerm(inputValue ?? "");
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        nominateMutation.mutate(selectedItem.id);
      }
    },
  });

  return (
    <div className="agent-section" style={{ marginTop: "1rem" }}>
      <h4 style={{ fontFamily: "var(--font-title)", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        Agent Appointment
      </h4>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Active Agent & History */}
        <div>
          <h5 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Active Agent</h5>
          {activeAppointment ? (
            <div className="glass-panel" style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "bold" }}>Agent Ref: {activeAppointment.agent_ref}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Status: {activeAppointment.status}</div>
              {activeAppointment.status === "Nominated" && (
                <button 
                  onClick={() => appointMutation.mutate(activeAppointment.id)}
                  className="btn-primary" 
                  style={{ marginTop: "0.5rem", padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                >
                  Confirm Appointment
                </button>
              )}
            </div>
          ) : (
            <div style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>No active agent</div>
          )}

          <h5 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem", marginTop: "1rem" }}>History</h5>
          <div style={{ maxHeight: "150px", overflowY: "auto", fontSize: "0.75rem" }}>
            {appointments && appointments.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {appointments.map((app) => (
                  <li key={app.id} style={{ padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    {app.agent_ref} - {app.status} ({format(new Date(app.created_at), "MMM d, HH:mm")})
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "var(--text-secondary)" }}>No history</div>
            )}
          </div>
        </div>

        {/* Nominate New Agent */}
        <div>
          <h5 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Nominate / Replace Agent</h5>
          <div style={{ position: "relative" }}>
            <label {...getLabelProps()} className="sr-only">Search Agent</label>
            <div style={{ display: "flex" }}>
              <input
                {...getInputProps()}
                placeholder="Search agent..."
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "4px 0 0 4px",
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                {...getToggleButtonProps()}
                type="button"
                className="btn-secondary"
                style={{ borderRadius: "0 4px 4px 0", padding: "0 0.5rem" }}
              >
                ▼
              </button>
            </div>
            <ul
              {...getMenuProps()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 100,
                listStyle: "none",
                padding: 0,
                margin: 0,
                background: "var(--bg-secondary)",
                border: isOpen ? "1px solid var(--border-subtle)" : "none",
                maxHeight: "200px",
                overflowY: "auto",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {isOpen &&
                agents.map((item, index) => (
                  <li
                    key={item.id}
                    {...getItemProps({ item, index })}
                    style={{
                      padding: "0.5rem",
                      cursor: "pointer",
                      background: highlightedIndex === index ? "rgba(255, 255, 255, 0.1)" : "transparent",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    {item.name} ({item.code})
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
