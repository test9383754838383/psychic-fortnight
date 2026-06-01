import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../api/client";
import type { components } from "../api/schema";

type Alert = components["schemas"]["AlertReadDTO"];
type Severity = "Info" | "Warning" | "Critical";
type EntityType = "Voyage" | "PortCall" | "Vessel";

const SEVERITY_CHIP_CLASS: Record<string, string> = {
  Info: "status-chip--in-progress",
  Warning: "status-chip--pending",
  Critical: "status-chip--blocked",
};

const LIMIT = 50;

interface FilterState {
  severity: Severity | "";
  resolved: "yes" | "no" | "all";
  entity_type: EntityType | "";
}

const DEFAULT_FILTERS: FilterState = {
  severity: "",
  resolved: "all",
  entity_type: "",
};

interface ResolveFormInlineProps {
  alert: Alert;
  onDone: () => void;
}

function ResolveFormInline({ alert, onDone }: ResolveFormInlineProps) {
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
      void queryClient.invalidateQueries({ queryKey: ["alerts-global"] });
      onDone();
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
      {resolve.isError && (
        <div className="form-error" style={{ marginTop: "0.25rem" }}>
          {resolve.error?.message}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button
          className="btn-primary btn-sm"
          onClick={() => resolve.mutate()}
          disabled={(isNoteRequired && !note.trim()) || resolve.isPending}
          aria-label="Confirm Resolve"
        >
          {resolve.isPending ? "Resolving…" : "Confirm Resolve"}
        </button>
        <button className="btn-sm btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const [showResolve, setShowResolve] = useState(false);
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
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600 }}>{alert.alert_type}</span>
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
          <span
            style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
          >
            {alert.linked_entity_type}
          </span>
        </div>
        {!isResolved && !showResolve && (
          <button
            className="btn-sm btn-secondary"
            onClick={() => setShowResolve(true)}
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
          <>
            {" "}
            · Resolved{" "}
            {format(new Date(alert.resolved_at), "yyyy-MM-dd HH:mm")}
          </>
        )}
      </div>
      {showResolve && (
        <ResolveFormInline
          alert={alert}
          onDone={() => setShowResolve(false)}
        />
      )}
    </div>
  );
}

export function AlertsPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [offset, setOffset] = useState(0);

  const resolvedParam =
    filters.resolved === "all"
      ? undefined
      : filters.resolved === "yes"
        ? true
        : false;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts-global", filters, offset],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/alerts", {
        params: {
          query: {
            severity: filters.severity || undefined,
            resolved: resolvedParam,
            entity_type: (filters.entity_type as EntityType) || undefined,
            limit: LIMIT,
            offset,
          },
        },
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return data ?? [];
    },
  });

  function handleFilterChange(
    key: keyof FilterState,
    value: string
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  }

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 className="panel-title" style={{ textAlign: "left" }}>
          Alerts
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Global alert feed across all voyages and vessels
        </p>
      </header>

      {/* Filter bar */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem",
          maxWidth: "none",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          alignItems: "center",
        }}
      >
        <div className="form-field">
          <label htmlFor="filter-severity" className="form-label">
            Severity
          </label>
          <select
            id="filter-severity"
            className="form-select"
            value={filters.severity}
            onChange={(e) => handleFilterChange("severity", e.target.value)}
          >
            <option value="">All</option>
            <option value="Info">Info</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="filter-resolved" className="form-label">
            Resolved
          </label>
          <select
            id="filter-resolved"
            className="form-select"
            value={filters.resolved}
            onChange={(e) => handleFilterChange("resolved", e.target.value)}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="filter-entity-type" className="form-label">
            Entity Type
          </label>
          <select
            id="filter-entity-type"
            className="form-select"
            value={filters.entity_type}
            onChange={(e) => handleFilterChange("entity_type", e.target.value)}
          >
            <option value="">All</option>
            <option value="Voyage">Voyage</option>
            <option value="PortCall">PortCall</option>
            <option value="Vessel">Vessel</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", maxWidth: "none" }}>
        {isLoading ? (
          <div className="loading-text">Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <div
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              padding: "2rem 0",
            }}
          >
            No alerts match the current filters.
          </div>
        ) : (
          <>
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                className="btn-sm btn-secondary"
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
              >
                ← Prev
              </button>
              <span
                style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "2" }}
              >
                {offset + 1}–{offset + alerts.length}
              </span>
              <button
                className="btn-sm btn-secondary"
                onClick={() => setOffset((o) => o + LIMIT)}
                disabled={alerts.length < LIMIT}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
