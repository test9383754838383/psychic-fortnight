import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../../api/client";

interface ChecklistPanelProps {
  portCallId: string;
}

export function ChecklistPanel({ portCallId }: ChecklistPanelProps) {
  const queryClient = useQueryClient();

  const { data: checklists = [], isLoading, error } = useQuery({
    queryKey: ["port-call", portCallId, "checklists"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/port-calls/{port_call_id}/checklists",
        { params: { path: { port_call_id: portCallId } } }
      );
      if (!response.ok) throw new Error("Failed to fetch checklists");
      return data ?? [];
    },
  });

  const createChecklist = useMutation({
    mutationFn: async (type: "Pre-Arrival" | "Pre-Departure") => {
      const { response } = await apiClient.POST(
        "/api/v1/port-calls/{port_call_id}/checklists",
        {
          params: { path: { port_call_id: portCallId } },
          body: { checklist_type: type },
        }
      );
      if (!response.ok) throw new Error("Failed to create checklist");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["port-call", portCallId, "checklists"],
      });
    },
  });

  const signOffItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { response } = await apiClient.POST(
        "/api/v1/checklist-items/{item_id}/sign-off",
        { params: { path: { item_id: itemId } } }
      );
      if (!response.ok) throw new Error("Failed to sign off item");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["port-call", portCallId, "checklists"],
      });
    },
  });

  if (isLoading) {
    return (
      <section className="event-log-panel glass-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}>
        <div className="loading-text">Loading checklists…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="event-log-panel glass-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}>
        <div className="form-error">Error loading checklists: {error.message}</div>
      </section>
    );
  }

  return (
    <section className="event-log-panel glass-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem", marginTop: "2rem" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 className="panel-heading" style={{ fontFamily: "var(--font-title)", fontSize: "1.25rem", margin: 0 }}>Checklists</h3>
        <div className="checklist-create-controls">
          <button
            className="btn-primary btn-sm"
            onClick={() => createChecklist.mutate("Pre-Arrival")}
            disabled={createChecklist.isPending}
            style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
          >
            {createChecklist.isPending ? "Creating..." : "Create Pre-Arrival Checklist"}
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={() => createChecklist.mutate("Pre-Departure")}
            disabled={createChecklist.isPending}
            style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
          >
            {createChecklist.isPending ? "Creating..." : "Create Pre-Departure Checklist"}
          </button>
        </div>
      </div>

      {checklists.length === 0 ? (
        <div className="empty-state" style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem 0" }}>
          No checklists created for this port call.
        </div>
      ) : (
        <div className="checklist-panel">
          {checklists.map((checklist) => {
            const isCompleted = checklist.status === "Completed";
            const sortedItems = [...(checklist.items ?? [])].sort((a, b) => a.sequence_no - b.sequence_no);

            return (
              <div
                key={checklist.id}
                className={`checklist-card ${
                  isCompleted ? "checklist-card--completed" : "checklist-card--open"
                }`}
                data-testid={`checklist-card-${checklist.id}`}
                style={{ marginTop: "1rem" }}
              >
                <div className="checklist-card-header">
                  <div>
                    <h4 className="checklist-card-title">{checklist.checklist_type} Checklist</h4>
                    <span className="checklist-card-meta">
                      Created: {format(new Date(checklist.created_at), "yyyy-MM-dd HH:mm")}
                    </span>
                  </div>
                  <span
                    className={`status-chip ${
                      isCompleted ? "status-chip--accepted" : "status-chip--pending"
                    }`}
                  >
                    {checklist.status}
                  </span>
                </div>

                <div className="checklist-items-list">
                  {sortedItems.map((item) => {
                    const isSigned = item.status === "Signed Off";

                    return (
                      <div
                        key={item.id}
                        className={`checklist-item-row ${
                          isSigned ? "checklist-item-row--signed-off" : "checklist-item-row--pending"
                        }`}
                      >
                        <div className="item-number-name">
                          <span className="item-sequence-no">{item.sequence_no}</span>
                          <span className="item-name">{item.item_name}</span>
                        </div>

                        <div className="item-signoff-info">
                          {isSigned ? (
                            <div className="audit-badge">
                              <div className="audit-user">Signed by: {item.signed_off_by ?? "System"}</div>
                              <div className="audit-date">
                                at {item.signed_off_at ? format(new Date(item.signed_off_at), "yyyy-MM-dd HH:mm") : "-"}
                              </div>
                            </div>
                          ) : (
                            <button
                              className="btn-signoff"
                              onClick={() => signOffItem.mutate(item.id)}
                              disabled={signOffItem.isPending}
                            >
                              {signOffItem.isPending && signOffItem.variables === item.id ? "Signing..." : "Sign Off"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
