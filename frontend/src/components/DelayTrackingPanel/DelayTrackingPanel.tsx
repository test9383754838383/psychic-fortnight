import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../../api/client";
import { DelayForm } from "./DelayForm";
import type { components } from "../../api/schema";

interface DelayTrackingPanelProps {
  voyageId: string;
}

export function DelayTrackingPanel({ voyageId }: DelayTrackingPanelProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDelay, setEditingDelay] = useState<components["schemas"]["DelayReadDTO"] | null>(
    null
  );

  // Queries
  const {
    data: delays = [],
    isLoading: delaysLoading,
    error: delaysError,
  } = useQuery({
    queryKey: ["voyage", voyageId, "delays"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/delays", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch delays");
      return data ?? [];
    },
  });

  const { data: portCalls = [] } = useQuery({
    queryKey: ["voyage", voyageId, "port-calls"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/port-calls", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch port calls");
      return data ?? [];
    },
  });

  // Mutations
  const createDelayMutation = useMutation({
    mutationFn: async (body: components["schemas"]["DelayCreateBody"]) => {
      const { response } = await apiClient.POST("/api/v1/voyages/{voyage_id}/delays", {
        params: { path: { voyage_id: voyageId } },
        body,
      });
      if (!response.ok) throw new Error("Failed to create delay record");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId, "delays"] });
      setShowAddForm(false);
    },
  });

  const updateDelayMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: components["schemas"]["DelayUpdateBody"];
    }) => {
      const { response } = await apiClient.PATCH("/api/v1/delays/{delay_id}", {
        params: { path: { delay_id: id } },
        body,
      });
      if (!response.ok) throw new Error("Failed to update delay record");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId, "delays"] });
      setEditingDelay(null);
    },
  });

  const approveDelayMutation = useMutation({
    mutationFn: async (id: string) => {
      const { response } = await apiClient.POST("/api/v1/delays/{delay_id}/approve", {
        params: { path: { delay_id: id } },
      });
      if (!response.ok) throw new Error("Failed to approve delay");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId, "delays"] });
    },
  });

  if (delaysLoading) {
    return (
      <section
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="loading-text">Loading delays...</div>
      </section>
    );
  }

  if (delaysError) {
    return (
      <section
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="form-error">Error loading delays: {delaysError.message}</div>
      </section>
    );
  }

  if (showAddForm) {
    return (
      <div
        className="glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem", marginTop: "2rem" }}
      >
        <DelayForm
          portCalls={portCalls}
          onSubmit={(data) => createDelayMutation.mutate(data)}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={createDelayMutation.isPending}
        />
      </div>
    );
  }

  if (editingDelay) {
    return (
      <div
        className="glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem", marginTop: "2rem" }}
      >
        <DelayForm
          initialData={editingDelay}
          portCalls={portCalls}
          onSubmit={(data) => updateDelayMutation.mutate({ id: editingDelay.id, body: data })}
          onCancel={() => setEditingDelay(null)}
          isSubmitting={updateDelayMutation.isPending}
        />
      </div>
    );
  }

  return (
    <section
      className="event-log-panel glass-panel"
      data-testid="delay-tracking-panel"
      style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem", marginTop: "2rem" }}
    >
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          className="panel-heading"
          style={{ fontFamily: "var(--font-title)", fontSize: "1.25rem", margin: 0 }}
        >
          Delays
        </h3>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowAddForm(true)}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
        >
          + Add Delay
        </button>
      </div>

      {delays.length === 0 ? (
        <div
          className="empty-state"
          style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem 0" }}
        >
          No delays recorded for this voyage.
        </div>
      ) : (
        <div className="checklist-panel">
          {delays.map((delay) => {
            const isApproved = !!delay.approved_by;
            let anchorText = "Voyage Level";
            if (delay.port_call_id) {
              const matchedPort = portCalls.find((pc) => pc.id === delay.port_call_id);
              anchorText = matchedPort ? `Port: ${matchedPort.port_id}` : `Port Call`;
            } else if (delay.leg_ref) {
              anchorText = `Leg: ${delay.leg_ref}`;
            }

            // Duration logic: use actual_duration if set, else claimed_duration, else indicate open/ongoing
            let durationText = "Ongoing (In Progress)";
            if (delay.actual_duration !== null && delay.actual_duration !== undefined) {
              durationText = `${delay.actual_duration.toFixed(2)} hrs (Actual)`;
            } else if (delay.claimed_duration !== null && delay.claimed_duration !== undefined) {
              durationText = `${delay.claimed_duration.toFixed(2)} hrs (Claimed)`;
            }

            return (
              <div
                key={delay.id}
                className={`checklist-card ${
                  isApproved ? "checklist-card--completed" : "checklist-card--open"
                }`}
                style={{ marginTop: "1rem" }}
                data-testid={`delay-card-${delay.id}`}
              >
                <div
                  className="checklist-card-header"
                  style={{
                    borderBottom: "1px solid var(--border-glass)",
                    paddingBottom: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <h4
                      className="checklist-card-title"
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      <span>{delay.delay_type}</span>
                      <span
                        className={`status-chip ${isApproved ? "status-chip--accepted" : "status-chip--pending"}`}
                      >
                        {isApproved ? "Approved" : "Open"}
                      </span>
                    </h4>
                    <span className="checklist-card-meta">
                      Fault: <strong>{delay.fault_attribution}</strong> | Anchor:{" "}
                      <strong>{anchorText}</strong>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {!isApproved && (
                      <>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setEditingDelay(delay)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-transition btn-transition--accepted"
                          onClick={() => approveDelayMutation.mutate(delay.id)}
                          disabled={approveDelayMutation.isPending}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          {approveDelayMutation.isPending &&
                          approveDelayMutation.variables === delay.id
                            ? "Approving..."
                            : "Approve"}
                        </button>
                      </>
                    )}
                    {isApproved && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        Locked
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      Start: {format(new Date(delay.start_datetime), "yyyy-MM-dd HH:mm")}
                      {delay.end_datetime &&
                        ` to ${format(new Date(delay.end_datetime), "yyyy-MM-dd HH:mm")}`}
                    </span>
                    <strong
                      style={{
                        color: isApproved ? "var(--text-success)" : "var(--accent-primary)",
                      }}
                    >
                      {durationText}
                    </strong>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-glass)",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {delay.description}
                  </div>
                  {isApproved && delay.approved_by && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        alignSelf: "flex-end",
                      }}
                    >
                      Approved by {delay.approved_by}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
