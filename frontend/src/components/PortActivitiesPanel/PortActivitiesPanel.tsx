import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type ItineraryLine = components["schemas"]["ItineraryLineResponseDTO"];
type PortCall = components["schemas"]["PortCallResponseDTO"];
type PortActivity = components["schemas"]["PortActivityResponseDTO"];
type Port = components["schemas"]["PortResponseDTO"];

const EVENT_TYPES = [
  "Arrived",
  "Anchored",
  "Berthed",
  "All Fast",
  "Commenced Loading",
  "Completed Loading",
  "Commenced Discharging",
  "Completed Discharging",
  "Hoses Connected",
  "Hoses Disconnected",
  "Departed",
  "NOR Tendered",
  "NOR Re-tendered",
  "NOR Accepted",
  "Free Pratique Granted",
  "Tugs Engaged",
  "Tugs Released",
  "Bunkering Commenced",
  "Bunkering Completed",
  "Delay Commenced",
  "Delay Ended",
] as const;

const STATUS_COLORS: Record<string, string> = {
  Planned: "#94a3b8",
  "Arrived at Pilot Station": "#38bdf8",
  "At Anchor": "#f59e0b",
  Berthed: "#a78bfa",
  "Cargo Ops Completed": "#34d399",
  Departed: "#64748b",
};

interface PortActivitiesPanelProps {
  voyageId: string;
  itineraryLines: ItineraryLine[];
  onRefetch: () => void;
}

const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  color: "var(--text-primary)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  padding: "0.3rem 0.5rem",
  fontSize: "0.82rem",
  width: "100%",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  marginBottom: "0.2rem",
  display: "block",
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PortActivitiesPanel({
  voyageId,
  itineraryLines,
  onRefetch,
}: PortActivitiesPanelProps) {
  const queryClient = useQueryClient();
  const [selectedLineId, setSelectedLineId] = useState<string>(
    itineraryLines[0]?.id ?? ""
  );
  const [subTab, setSubTab] = useState<"activities" | "robs">("activities");
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({
    event_type: EVENT_TYPES[0] as string,
    event_timestamp: "",
    notes: "",
    correction_reason: "",
  });
  const [draftForm, setDraftForm] = useState({
    arrival_draft_fwd: "",
    arrival_draft_aft: "",
    departure_draft_fwd: "",
    departure_draft_aft: "",
    ata: "",
    atd: "",
  });
  const [draftSaved, setDraftSaved] = useState(false);

  const selectedLine = itineraryLines.find((l) => l.id === selectedLineId);

  const { data: ports } = useQuery({
    queryKey: ["ports"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/ports");
      if (!response.ok) throw new Error("Failed");
      return (data ?? []) as Port[];
    },
  });
  const portMap: Record<string, Port> = Object.fromEntries(
    (ports ?? []).map((p) => [p.id, p])
  );

  const { data: portCalls, refetch: refetchPortCalls } = useQuery({
    queryKey: ["port-calls", voyageId],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/voyages/{voyage_id}/port-calls",
        { params: { path: { voyage_id: voyageId } } }
      );
      if (!response.ok) throw new Error("Failed");
      return (data ?? []) as PortCall[];
    },
  });

  const portCall = (portCalls ?? []).find(
    (pc) => pc.itinerary_line_id === selectedLineId
  );

  const { data: activities, refetch: refetchActivities } = useQuery({
    queryKey: ["port-activities", portCall?.id],
    enabled: !!portCall,
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/port-calls/{port_call_id}/events",
        { params: { path: { port_call_id: portCall!.id } } }
      );
      if (!response.ok) throw new Error("Failed");
      return (data ?? []) as PortActivity[];
    },
  });

  const startPortCall = useMutation({
    mutationFn: async () => {
      if (!selectedLine) return;
      const { response } = await apiClient.POST(
        "/api/v1/voyages/{voyage_id}/port-calls",
        {
          params: { path: { voyage_id: voyageId } },
          body: {
            port_id: selectedLine.port_ref,
            itinerary_line_id: selectedLine.id,
          },
        }
      );
      if (!response.ok) throw new Error("Failed");
    },
    onSuccess: async () => {
      await refetchPortCalls();
      onRefetch();
    },
  });

  const savePortCallDetails = useMutation({
    mutationFn: async () => {
      if (!portCall) return;
      const body: Record<string, unknown> = {};
      if (draftForm.arrival_draft_fwd)
        body.arrival_draft_fwd = parseFloat(draftForm.arrival_draft_fwd);
      if (draftForm.arrival_draft_aft)
        body.arrival_draft_aft = parseFloat(draftForm.arrival_draft_aft);
      if (draftForm.departure_draft_fwd)
        body.departure_draft_fwd = parseFloat(draftForm.departure_draft_fwd);
      if (draftForm.departure_draft_aft)
        body.departure_draft_aft = parseFloat(draftForm.departure_draft_aft);
      if (draftForm.ata) body.ata = new Date(draftForm.ata).toISOString();
      if (draftForm.atd) body.atd = new Date(draftForm.atd).toISOString();

      const { response } = await apiClient.PATCH(
        "/api/v1/port-calls/{port_call_id}",
        {
          params: { path: { port_call_id: portCall.id } },
          body: body as never,
        }
      );
      if (!response.ok) throw new Error("Failed");
    },
    onSuccess: async () => {
      await refetchPortCalls();
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    },
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      if (!portCall) return;
      const body: Record<string, unknown> = {
        event_type: activityForm.event_type,
        event_timestamp: new Date(activityForm.event_timestamp).toISOString(),
        notes: activityForm.notes || null,
      };
      if (correctingId) {
        body.corrects_activity_id = correctingId;
        body.correction_reason = activityForm.correction_reason;
      }
      const { response } = await apiClient.POST(
        "/api/v1/port-calls/{port_call_id}/events",
        {
          params: { path: { port_call_id: portCall.id } },
          body: body as never,
        }
      );
      if (!response.ok) throw new Error("Failed");
    },
    onSuccess: async () => {
      await refetchActivities();
      await queryClient.invalidateQueries({ queryKey: ["port-calls", voyageId] });
      setShowAddActivity(false);
      setCorrectingId(null);
      setActivityForm({ event_type: EVENT_TYPES[0], event_timestamp: "", notes: "", correction_reason: "" });
    },
  });

  // Compute superseded IDs: an activity is superseded if another activity corrects it
  const supersededIds = new Set(
    (activities ?? [])
      .filter((a) => a.corrects_activity_id)
      .map((a) => a.corrects_activity_id!)
  );

  const sortedActivities = [...(activities ?? [])].sort(
    (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
  );

  function initDraftForm(pc: PortCall) {
    setDraftForm({
      arrival_draft_fwd: pc.arrival_draft_fwd != null ? String(pc.arrival_draft_fwd) : "",
      arrival_draft_aft: pc.arrival_draft_aft != null ? String(pc.arrival_draft_aft) : "",
      departure_draft_fwd: pc.departure_draft_fwd != null ? String(pc.departure_draft_fwd) : "",
      departure_draft_aft: pc.departure_draft_aft != null ? String(pc.departure_draft_aft) : "",
      ata: toLocalInput(pc.ata),
      atd: toLocalInput(pc.atd),
    });
  }

  const portName = selectedLine
    ? (portMap[selectedLine.port_ref]?.name ?? selectedLine.port_ref.slice(0, 8) + "…")
    : "—";

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "0.4rem 0.75rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "0.45rem 0.75rem",
    fontSize: "0.82rem",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    verticalAlign: "middle",
  };

  return (
    <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Port selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Port
        </label>
        <select
          data-testid="port-selector"
          value={selectedLineId}
          onChange={(e) => {
            setSelectedLineId(e.target.value);
            setShowAddActivity(false);
            setCorrectingId(null);
          }}
          style={{ ...inp, width: "260px" }}
        >
          {itineraryLines.length === 0 && (
            <option value="">— no ports in itinerary —</option>
          )}
          {itineraryLines.map((line) => (
            <option key={line.id} value={line.id}>
              {portMap[line.port_ref]?.name ?? line.port_ref.slice(0, 8) + "…"} ({line.port_function})
            </option>
          ))}
        </select>
      </div>

      {/* No itinerary lines */}
      {itineraryLines.length === 0 && (
        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Add ports in the Itinerary tab first.
        </div>
      )}

      {/* Port call not started yet */}
      {itineraryLines.length > 0 && selectedLine && !portCall && (
        <div
          style={{
            padding: "1.5rem",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            No port call started for <strong style={{ color: "var(--text-primary)" }}>{portName}</strong>.
          </div>
          <button
            data-testid="start-port-call-btn"
            onClick={() => startPortCall.mutate()}
            disabled={startPortCall.isPending}
            style={{
              background: "#38bdf8",
              color: "#0d1017",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1.25rem",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
            type="button"
          >
            {startPortCall.isPending ? "Starting…" : "Start Port Call"}
          </button>
        </div>
      )}

      {/* Port call exists */}
      {portCall && (
        <>
          {/* Header: port name + status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{portName}</span>
            <span
              data-testid="port-call-status"
              style={{
                display: "inline-block",
                padding: "0.12rem 0.5rem",
                borderRadius: "999px",
                fontSize: "0.7rem",
                fontWeight: 600,
                background: `${STATUS_COLORS[portCall.status] ?? "#94a3b8"}22`,
                color: STATUS_COLORS[portCall.status] ?? "#94a3b8",
                border: `1px solid ${STATUS_COLORS[portCall.status] ?? "#94a3b8"}55`,
              }}
            >
              {portCall.status}
            </span>
          </div>

          {/* ATA / ATD + Drafts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
              gap: "0.75rem",
              padding: "1rem",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <label style={lbl}>ATA</label>
              <input
                data-testid="ata-input"
                type="datetime-local"
                value={draftForm.ata || toLocalInput(portCall.ata)}
                onChange={(e) => setDraftForm((f) => ({ ...f, ata: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>ATD</label>
              <input
                data-testid="atd-input"
                type="datetime-local"
                value={draftForm.atd || toLocalInput(portCall.atd)}
                onChange={(e) => setDraftForm((f) => ({ ...f, atd: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Arrival Draft Fwd (m)</label>
              <input
                data-testid="arrival-draft-fwd-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={draftForm.arrival_draft_fwd || (portCall.arrival_draft_fwd != null ? String(portCall.arrival_draft_fwd) : "")}
                onChange={(e) => setDraftForm((f) => ({ ...f, arrival_draft_fwd: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Arrival Draft Aft (m)</label>
              <input
                data-testid="arrival-draft-aft-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={draftForm.arrival_draft_aft || (portCall.arrival_draft_aft != null ? String(portCall.arrival_draft_aft) : "")}
                onChange={(e) => setDraftForm((f) => ({ ...f, arrival_draft_aft: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Departure Draft Fwd (m)</label>
              <input
                data-testid="departure-draft-fwd-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={draftForm.departure_draft_fwd || (portCall.departure_draft_fwd != null ? String(portCall.departure_draft_fwd) : "")}
                onChange={(e) => setDraftForm((f) => ({ ...f, departure_draft_fwd: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Departure Draft Aft (m)</label>
              <input
                data-testid="departure-draft-aft-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={draftForm.departure_draft_aft || (portCall.departure_draft_aft != null ? String(portCall.departure_draft_aft) : "")}
                onChange={(e) => setDraftForm((f) => ({ ...f, departure_draft_aft: e.target.value }))}
                style={inp}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              data-testid="save-port-call-btn"
              onClick={() => {
                initDraftForm(portCall);
                savePortCallDetails.mutate();
              }}
              disabled={savePortCallDetails.isPending}
              style={{
                background: "#38bdf8",
                color: "#0d1017",
                border: "none",
                borderRadius: "6px",
                padding: "0.4rem 1rem",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
              type="button"
            >
              {savePortCallDetails.isPending ? "Saving…" : "Save Details"}
            </button>
            {draftSaved && (
              <span style={{ fontSize: "0.78rem", color: "#34d399" }}>Saved</span>
            )}
            {savePortCallDetails.isError && (
              <span style={{ fontSize: "0.78rem", color: "#f87171" }}>Failed to save.</span>
            )}
          </div>

          {/* Sub-tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {(["activities", "robs"] as const).map((tab) => {
              const label = tab === "activities" ? "PORT ACTIVITIES" : "ROBs";
              const active = subTab === tab;
              const enabled = tab === "activities";
              return (
                <button
                  key={tab}
                  data-testid={`sub-tab-${tab}`}
                  type="button"
                  onClick={enabled ? () => setSubTab(tab) : undefined}
                  title={enabled ? label : "Coming in M7"}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: active ? "2px solid #38bdf8" : "2px solid transparent",
                    color: active ? "#38bdf8" : "rgba(148,163,184,0.6)",
                    cursor: enabled ? "pointer" : "default",
                    opacity: enabled ? 1 : 0.35,
                    padding: "0.45rem 1rem",
                    fontSize: "0.72rem",
                    fontWeight: active ? 700 : 500,
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Activities sub-tab */}
          {subTab === "activities" && (
            <div>
              {/* Activity table */}
              {sortedActivities.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                  <thead>
                    <tr>
                      <th style={th}>Event</th>
                      <th style={th}>Timestamp</th>
                      <th style={th}>Notes</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedActivities.map((activity) => {
                      const superseded = supersededIds.has(activity.id);
                      return (
                        <tr
                          key={activity.id}
                          data-testid={`activity-row-${activity.id}`}
                          style={{ opacity: superseded ? 0.4 : 1 }}
                        >
                          <td style={td}>
                            <span style={{ textDecoration: superseded ? "line-through" : "none" }}>
                              {activity.event_type}
                            </span>
                            {superseded && (
                              <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "#64748b" }}>
                                Superseded
                              </span>
                            )}
                            {activity.corrects_activity_id && (
                              <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "#a78bfa" }}>
                                Correction
                              </span>
                            )}
                          </td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            {fmt(activity.event_timestamp)}
                          </td>
                          <td style={{ ...td, color: "var(--text-secondary)" }}>
                            {activity.notes ?? "—"}
                          </td>
                          <td style={td}>
                            {!superseded && (
                              <button
                                data-testid={`correct-activity-btn-${activity.id}`}
                                type="button"
                                onClick={() => {
                                  setCorrectingId(activity.id);
                                  setActivityForm((f) => ({
                                    ...f,
                                    event_type: activity.event_type,
                                    event_timestamp: toLocalInput(activity.event_timestamp),
                                    notes: activity.notes ?? "",
                                    correction_reason: "",
                                  }));
                                  setShowAddActivity(true);
                                }}
                                style={{
                                  background: "none",
                                  border: "1px solid rgba(167,139,250,0.4)",
                                  color: "#a78bfa",
                                  borderRadius: "4px",
                                  padding: "0.2rem 0.5rem",
                                  fontSize: "0.7rem",
                                  cursor: "pointer",
                                }}
                              >
                                Correct
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {sortedActivities.length === 0 && !showAddActivity && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                  No activities recorded yet.
                </div>
              )}

              {/* Add activity form */}
              {showAddActivity && (
                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    marginBottom: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {correctingId ? "Correct Activity" : "Add Activity"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={lbl}>Event Type</label>
                      <select
                        data-testid="activity-type-select"
                        value={activityForm.event_type}
                        onChange={(e) => setActivityForm((f) => ({ ...f, event_type: e.target.value }))}
                        style={inp}
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Timestamp</label>
                      <input
                        data-testid="activity-timestamp-input"
                        type="datetime-local"
                        value={activityForm.event_timestamp}
                        onChange={(e) => setActivityForm((f) => ({ ...f, event_timestamp: e.target.value }))}
                        style={inp}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Notes</label>
                    <input
                      data-testid="activity-notes-input"
                      type="text"
                      value={activityForm.notes}
                      onChange={(e) => setActivityForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Optional notes"
                      style={inp}
                    />
                  </div>
                  {correctingId && (
                    <div>
                      <label style={lbl}>Correction Reason (required)</label>
                      <input
                        data-testid="correction-reason-input"
                        type="text"
                        value={activityForm.correction_reason}
                        onChange={(e) => setActivityForm((f) => ({ ...f, correction_reason: e.target.value }))}
                        style={inp}
                      />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      data-testid="save-activity-btn"
                      type="button"
                      onClick={() => addActivity.mutate()}
                      disabled={
                        addActivity.isPending ||
                        !activityForm.event_timestamp ||
                        (!!correctingId && !activityForm.correction_reason)
                      }
                      style={{
                        background: "#38bdf8",
                        color: "#0d1017",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.4rem 1rem",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      {addActivity.isPending ? "Saving…" : "Save Activity"}
                    </button>
                    <button
                      data-testid="cancel-activity-btn"
                      type="button"
                      onClick={() => {
                        setShowAddActivity(false);
                        setCorrectingId(null);
                        setActivityForm({ event_type: EVENT_TYPES[0], event_timestamp: "", notes: "", correction_reason: "" });
                      }}
                      style={{
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "var(--text-secondary)",
                        borderRadius: "6px",
                        padding: "0.4rem 1rem",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    {addActivity.isError && (
                      <span style={{ fontSize: "0.78rem", color: "#f87171", alignSelf: "center" }}>
                        Failed to save.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!showAddActivity && (
                <button
                  data-testid="add-activity-btn"
                  type="button"
                  onClick={() => {
                    setCorrectingId(null);
                    setShowAddActivity(true);
                  }}
                  style={{
                    background: "none",
                    border: "1px dashed rgba(56,189,248,0.4)",
                    color: "#38bdf8",
                    borderRadius: "6px",
                    padding: "0.4rem 1rem",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  + Add Activity
                </button>
              )}
            </div>
          )}

          {/* ROBs sub-tab */}
          {subTab === "robs" && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                border: "1px dashed rgba(255,255,255,0.08)",
                borderRadius: "8px",
              }}
            >
              ROB tracking by bunker grade is coming in M7 (Bunkers).
            </div>
          )}
        </>
      )}
    </div>
  );
}
