import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { EVENT_TYPES } from "../../lib/operationalReportingConstants";

interface AddEventFormProps {
  portCallId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddEventForm({ portCallId, onSuccess, onCancel }: AddEventFormProps) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [eventTimestamp, setEventTimestamp] = useState("");
  const [notes, setNotes] = useState("");
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctsActivityId, setCorrectsActivityId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (body: components["schemas"]["PortActivityCreateDTO"]) => {
      const { data, response } = await apiClient.POST(
        "/api/v1/port-calls/{port_call_id}/events",
        {
          params: { path: { port_call_id: portCallId } },
          body,
        }
      );
      if (!response.ok) throw new Error("Failed to create event");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["port-call", portCallId, "events"],
      });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!eventTimestamp) {
      setError("Event timestamp is required");
      return;
    }

    // Both correction fields must be set together (mirrors backend CheckConstraint)
    if (correctionMode && (!correctsActivityId || !correctionReason)) {
      setError("Both corrects_activity_id and correction_reason are required for corrections");
      return;
    }

    const body: components["schemas"]["PortActivityCreateDTO"] = {
      event_type: eventType,
      event_timestamp: new Date(eventTimestamp).toISOString(),
      notes: notes.trim() || null,
      corrects_activity_id: correctionMode && correctsActivityId ? correctsActivityId : null,
      correction_reason: correctionMode && correctionReason ? correctionReason : null,
    };

    mutation.mutate(body);
  };

  return (
    <form onSubmit={handleSubmit} className="add-event-form" aria-label="Add Port Event">
      <div className="form-group">
        <label htmlFor="event-type" id="event-type-label">Event Type</label>
        <select
          id="event-type"
          aria-labelledby="event-type-label"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          {EVENT_TYPES.map((et) => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="event-timestamp" id="event-timestamp-label">Event Timestamp</label>
        <input
          id="event-timestamp"
          aria-labelledby="event-timestamp-label"
          type="datetime-local"
          value={eventTimestamp}
          onChange={(e) => setEventTimestamp(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="event-notes">Notes</label>
        <textarea
          id="event-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
        />
      </div>

      <button
        type="button"
        className="btn-correction-toggle"
        onClick={() => setCorrectionMode((m) => !m)}
      >
        {correctionMode ? "Cancel Correction" : "This is a correction"}
      </button>

      {correctionMode && (
        <div className="correction-fields">
          <div className="form-group">
            <label htmlFor="corrects-activity-id">Corrects Activity Id</label>
            <input
              id="corrects-activity-id"
              type="text"
              value={correctsActivityId}
              onChange={(e) => setCorrectsActivityId(e.target.value)}
              placeholder="UUID of event being corrected"
              aria-label="Corrects Activity Id"
            />
          </div>
          <div className="form-group">
            <label htmlFor="correction-reason">Correction Reason</label>
            <textarea
              id="correction-reason"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Reason for correction..."
              rows={2}
              aria-label="Correction Reason"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="form-error" role="alert">{error}</div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? "Saving…" : "Save Event"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
