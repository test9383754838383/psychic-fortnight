import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type Alert = components["schemas"]["AlertReadDTO"];
type AlertType = components["schemas"]["AlertCreateBody"]["alert_type"];
type Severity = components["schemas"]["AlertCreateBody"]["severity"];

const ALERT_TYPES: AlertType[] = [
  "ETA Overdue",
  "Departure Overdue",
  "NOR Not Tendered",
  "Agent Not Confirmed",
  "Form Not Received",
  "Bunker Request Blocked",
  "Voyage Not Commenced",
  "Performance Deviation",
  "Consumption Deviation",
  "Noon Report Missing",
];

const SEVERITIES: Severity[] = ["Info", "Warning", "Critical"];

const SEVERITY_CHIP_CLASS: Record<string, string> = {
  Info: "status-chip--in-progress",
  Warning: "status-chip--pending",
  Critical: "status-chip--blocked",
};

interface AlertsPanelProps {
  voyageId: string;
}

interface CreateFormValues {
  alert_type: AlertType;
  severity: Severity;
  message: string;
}

const DEFAULT_FORM: CreateFormValues = {
  alert_type: "ETA Overdue",
  severity: "Info",
  message: "",
};

interface ResolveFormProps {
  alert: Alert;
  onCancel: () => void;
  onResolved: () => void;
}

function ResolveForm({ alert, onCancel, onResolved }: ResolveFormProps) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const isNoteRequired =
    alert.severity === "Warning" || alert.severity === "Critical";

  const resolve = useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.POST(
        "/api/v1/alerts/{alert_id}/resolve",
        {
          params: { path: { alert_id: alert.id } },
          body: { resolution_note: note || null },
        }
      );
      if (!response.ok) throw new Error("Failed to resolve alert");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      onResolved();
    },
  });

  const labelId = `resolve-note-label-${alert.id}`;
  const inputId = `resolve-note-${alert.id}`;

  return (
    <div
      style={{
        marginTop: "0.5rem",
        padding: "0.75rem",
        background: "var(--surface-2, rgba(255,255,255,0.04))",
        borderRadius: "0.375rem",
        border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
      }}
    >
      <label id={labelId} htmlFor={inputId} className="form-label">
        Resolution Note{isNoteRequired ? " (required)" : ""}
      </label>
      <textarea
        id={inputId}
        aria-labelledby={labelId}
        className="form-textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        style={{ width: "100%", marginTop: "0.25rem" }}
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button
          className="btn-primary btn-sm"
          onClick={() => resolve.mutate()}
          disabled={
            (isNoteRequired && !note.trim()) || resolve.isPending
          }
          aria-label="Confirm Resolve"
        >
          {resolve.isPending ? "Resolving…" : "Confirm Resolve"}
        </button>
        <button
          className="btn-sm btn-secondary"
          onClick={onCancel}
          disabled={resolve.isPending}
        >
          Cancel
        </button>
      </div>
      {resolve.isError && (
        <div className="form-error" style={{ marginTop: "0.25rem" }}>
          {resolve.error?.message}
        </div>
      )}
    </div>
  );
}

interface CreateFormProps {
  voyageId: string;
  onClose: () => void;
}

function CreateForm({ voyageId, onClose }: CreateFormProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreateFormValues>(DEFAULT_FORM);

  const create = useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.POST("/api/v1/alerts", {
        body: {
          linked_entity_type: "Voyage",
          linked_entity_id: voyageId,
          alert_type: values.alert_type,
          severity: values.severity,
          message: values.message,
        },
      });
      if (!response.ok) throw new Error("Failed to create alert");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      onClose();
    },
  });

  function field(
    name: keyof CreateFormValues
  ): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
    return (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
  }

  const canSubmit = values.message.trim().length > 0;

  return (
    <div
      className="glass-panel"
      style={{ padding: "1.25rem", marginTop: "1rem" }}
    >
      <h4
        className="panel-heading"
        style={{ marginBottom: "1rem", fontSize: "1rem" }}
      >
        New Alert
      </h4>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        <div className="form-field">
          <label htmlFor="alert-type" className="form-label">
            Alert Type
          </label>
          <select
            id="alert-type"
            className="form-select"
            value={values.alert_type}
            onChange={field("alert_type")}
            aria-label="Alert Type"
          >
            {ALERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="alert-severity" className="form-label">
            Severity
          </label>
          <select
            id="alert-severity"
            className="form-select"
            value={values.severity}
            onChange={field("severity")}
            aria-label="Severity"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="alert-message" className="form-label">
            Message
          </label>
          <textarea
            id="alert-message"
            className="form-textarea"
            value={values.message}
            onChange={field("message")}
            rows={2}
            aria-label="Message"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button
          className="btn-primary btn-sm"
          onClick={() => create.mutate()}
          disabled={!canSubmit || create.isPending}
          aria-label="Submit"
        >
          {create.isPending ? "Submitting…" : "Submit"}
        </button>
        <button
          className="btn-sm btn-secondary"
          onClick={onClose}
          disabled={create.isPending}
        >
          Cancel
        </button>
      </div>

      {create.isError && (
        <div className="form-error" style={{ marginTop: "0.5rem" }}>
          {create.error?.message}
        </div>
      )}
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
}

function AlertCard({ alert }: AlertCardProps) {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const isResolved = Boolean(alert.resolved_at);

  return (
    <div
      style={{
        padding: "1rem",
        marginBottom: "0.75rem",
        borderRadius: "0.5rem",
        background: "var(--surface-2, rgba(255,255,255,0.04))",
        border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {alert.alert_type}
          </span>
          <span
            className={`status-chip ${SEVERITY_CHIP_CLASS[alert.severity] ?? ""}`}
          >
            {alert.severity}
          </span>
          <span
            className={`status-chip ${isResolved ? "status-chip--supplied" : "status-chip--pending"}`}
          >
            {isResolved ? "Resolved" : "Unresolved"}
          </span>
        </div>

        {!isResolved && !showResolveForm && (
          <button
            className="btn-sm btn-secondary"
            onClick={() => setShowResolveForm(true)}
            aria-label="Resolve"
          >
            Resolve
          </button>
        )}
      </div>

      <p
        style={{
          margin: "0.5rem 0 0",
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
        }}
      >
        {alert.message}
      </p>

      <div
        style={{
          marginTop: "0.25rem",
          fontSize: "0.75rem",
          color: "var(--text-tertiary, var(--text-secondary))",
        }}
      >
        {format(new Date(alert.triggered_at), "yyyy-MM-dd HH:mm")}
        {isResolved && alert.resolved_at && (
          <> · Resolved {format(new Date(alert.resolved_at), "yyyy-MM-dd HH:mm")}</>
        )}
      </div>

      {isResolved && alert.resolution_note && (
        <div
          style={{
            marginTop: "0.25rem",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          Note: {alert.resolution_note}
        </div>
      )}

      {showResolveForm && (
        <ResolveForm
          alert={alert}
          onCancel={() => setShowResolveForm(false)}
          onResolved={() => setShowResolveForm(false)}
        />
      )}
    </div>
  );
}

export function AlertsPanel({ voyageId }: AlertsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ["alerts", { entity_id: voyageId }],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/alerts", {
        params: {
          query: {
            entity_type: "Voyage",
          },
        },
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return (data ?? []).filter(
        (alert) =>
          alert.linked_entity_type === "Voyage" &&
          alert.linked_entity_id === voyageId
      );
    },
  });

  if (isLoading) {
    return (
      <section
        data-testid="alerts-panel"
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="loading-text">Loading alerts…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        data-testid="alerts-panel"
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="form-error">Error: {error.message}</div>
      </section>
    );
  }

  return (
    <section
      data-testid="alerts-panel"
      className="event-log-panel glass-panel"
      style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
    >
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3
          className="panel-heading"
          style={{ fontFamily: "var(--font-title)", fontSize: "1.25rem", margin: 0 }}
        >
          Alerts
        </h3>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowCreateForm((v) => !v)}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
          aria-label="New Alert"
        >
          {showCreateForm ? "Close" : "New Alert"}
        </button>
      </div>

      {showCreateForm && (
        <CreateForm
          voyageId={voyageId}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {alerts.length === 0 && !showCreateForm ? (
        <div
          className="empty-state"
          style={{
            color: "var(--text-secondary)",
            textAlign: "center",
            padding: "1.5rem 0",
          }}
        >
          No alerts for this voyage.
        </div>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </section>
  );
}
