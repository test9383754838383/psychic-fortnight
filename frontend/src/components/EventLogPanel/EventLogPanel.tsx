import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { AddEventForm } from "./AddEventForm";
import { ActivityLogSection } from "./ActivityLogSection";

interface EventLogPanelProps {
  portCallId: string;
}

export function EventLogPanel({ portCallId }: EventLogPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["port-call", portCallId, "events"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/port-calls/{port_call_id}/events",
        { params: { path: { port_call_id: portCallId } } }
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      return data ?? [];
    },
  });

  return (
    <section className="event-log-panel glass-panel" data-testid="event-log-panel" style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}>
      <div className="panel-header">
        <h3 className="panel-heading">Port Events</h3>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowAddForm((s) => !s)}
          aria-expanded={showAddForm}
        >
          {showAddForm ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      {showAddForm && (
        <AddEventForm
          portCallId={portCallId}
          onSuccess={() => setShowAddForm(false)}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {isLoading ? (
        <div className="loading-text">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="empty-state">No port events recorded</div>
      ) : (
        <ol className="event-list">
          {events.map((evt) => (
            <li key={evt.id} className="event-row">
              {/* append-only — zero edit/delete controls */}
              <div className="event-row-header">
                <span className={`status-chip event-chip event-chip--${evt.event_type.replace(/\s+/g, "-").toLowerCase()}`}>
                  {evt.event_type}
                </span>
                <span className="event-timestamp">
                  {new Date(evt.event_timestamp).toLocaleString()}
                </span>
                <span className="event-recorded-by" title={evt.recorded_by_user_id}>
                  {evt.recorded_by_user_id}
                </span>
              </div>
              {evt.notes && (
                <p className="event-notes">{evt.notes}</p>
              )}
              {evt.corrects_activity_id && (
                <div className="correction-badge">
                  <span className="correction-label">Correction of {evt.corrects_activity_id}</span>
                  {evt.correction_reason && (
                    <span className="correction-reason">{evt.correction_reason}</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <ActivityLogSection portCallId={portCallId} />
    </section>
  );
}
