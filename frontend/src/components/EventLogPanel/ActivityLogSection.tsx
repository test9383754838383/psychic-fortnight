import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

interface ActivityLogSectionProps {
  portCallId: string;
}

export function ActivityLogSection({ portCallId }: ActivityLogSectionProps) {
  const queryClient = useQueryClient();
  const [narrative, setNarrative] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["port-call", portCallId, "activity-log"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/port-calls/{port_call_id}/activity-log",
        { params: { path: { port_call_id: portCallId } } }
      );
      if (!response.ok) throw new Error("Failed to fetch activity log");
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (body: components["schemas"]["ActivityLogCreateDTO"]) => {
      const { data, response } = await apiClient.POST(
        "/api/v1/port-calls/{port_call_id}/activity-log",
        {
          params: { path: { port_call_id: portCallId } },
          body,
        }
      );
      if (!response.ok) throw new Error("Failed to add log entry");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["port-call", portCallId, "activity-log"],
      });
      setNarrative("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) return;
    setError(null);
    mutation.mutate({ narrative: narrative.trim() });
  };

  return (
    <div className="activity-log-section" data-testid="activity-log-section">
      <h4 className="subsection-title">Activity Log</h4>

      {isLoading ? (
        <div className="loading-text">Loading log…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state-small">No activity log entries</div>
      ) : (
        <ol className="activity-log-list">
          {entries.map((entry) => (
            <li key={entry.id} className="activity-log-row">
              {/* append-only: no edit or delete controls */}
              <p className="log-narrative">{entry.narrative}</p>
              <span className="log-meta">
                {new Date(entry.logged_at).toLocaleString()} · {entry.logged_by_user_id}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Inline add-entry form */}
      <form onSubmit={handleSubmit} className="add-log-form">
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Add narrative…"
          rows={2}
          className="log-narrative-input"
          aria-label="Narrative"
        />
        {error && <div className="form-error" role="alert">{error}</div>}
        <button
          type="submit"
          disabled={mutation.isPending || !narrative.trim()}
          className="btn-primary btn-sm"
        >
          {mutation.isPending ? "Saving…" : "Log Entry"}
        </button>
      </form>
    </div>
  );
}
