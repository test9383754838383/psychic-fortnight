import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type ActivityReport = components["schemas"]["ActivityReportReadDTO"];
type BunkerLine = components["schemas"]["BunkerLineReadDTO"];
type PortCall = components["schemas"]["PortCallResponseDTO"];

const REPORT_TYPES = ["COMMENCING", "NOON", "ARRIVAL", "DEPARTURE", "TERMINATING"] as const;
const FUEL_GRADES = ["VLSFO", "LSMGO", "HSFO", "MGO", "LNG"] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#f59e0b",
  APPROVED: "#34d399",
};

interface ActivityReportsPanelProps {
  voyageId: string;
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
  display: "block",
  fontSize: "0.7rem",
  color: "var(--text-secondary)",
  marginBottom: "0.2rem",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        borderRadius: "999px",
        fontSize: "0.65rem",
        fontWeight: 700,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        letterSpacing: "0.06em",
      }}
    >
      {status}
    </span>
  );
}

function fmtMt(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  return isNaN(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ── Bunker line inline form ───────────────────────────────────────────────────

function BunkerLineForm({
  reportId,
  onSaved,
  onCancel,
}: {
  reportId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [grade, setGrade] = useState<string>("VLSFO");
  const [rob, setRob] = useState("");
  const [cons, setCons] = useState("");
  const [recv, setRecv] = useState("");
  const [bdn, setBdn] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = { fuel_grade: grade };
    if (rob) body["reported_rob_mt"] = parseFloat(rob);
    if (cons) body["reported_consumption_mt"] = parseFloat(cons);
    if (recv) body["received_mt"] = parseFloat(recv);
    if (bdn) body["bdn_number"] = bdn;
    await apiClient.POST("/api/v1/activity-reports/{report_id}/bunker-lines", {
      params: { path: { report_id: reportId } },
      body: body as Parameters<typeof apiClient.POST>[1]["body"],
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: "0.5rem",
        padding: "0.75rem",
        background: "rgba(56,189,248,0.04)",
        borderRadius: "4px",
        marginTop: "0.5rem",
      }}
    >
      <div>
        <label style={lbl}>Grade</label>
        <select
          data-testid="bunker-line-grade-select"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          style={inp}
        >
          {FUEL_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      {[
        { label: "ROB (MT)", val: rob, set: setRob, tid: "bunker-line-rob-input" },
        { label: "Cons (MT)", val: cons, set: setCons, tid: "bunker-line-cons-input" },
        { label: "Received (MT)", val: recv, set: setRecv, tid: "bunker-line-recv-input" },
      ].map(({ label, val, set, tid }) => (
        <div key={tid}>
          <label style={lbl}>{label}</label>
          <input data-testid={tid} type="number" step="any" value={val}
            onChange={(e) => set(e.target.value)} style={inp} />
        </div>
      ))}
      <div>
        <label style={lbl}>BDN</label>
        <input data-testid="bunker-line-bdn-input" type="text" value={bdn}
          onChange={(e) => setBdn(e.target.value)} style={inp} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem" }}>
        <button
          data-testid="save-bunker-line-btn"
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "4px", padding: "0.3rem 0.7rem", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}
        >
          {saving ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "0.3rem 0.6rem", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Create report form ────────────────────────────────────────────────────────

interface ReportFormState {
  report_type: string;
  report_datetime: string;
  port_call_id: string;
  latitude: string;
  longitude: string;
  wind_force: string;
  sea_state: string;
  swell: string;
  rpm: string;
  slip_pct: string;
  speed_kn: string;
  distance_nm: string;
}

const EMPTY_REPORT_FORM: ReportFormState = {
  report_type: "NOON",
  report_datetime: "",
  port_call_id: "",
  latitude: "",
  longitude: "",
  wind_force: "",
  sea_state: "",
  swell: "",
  rpm: "",
  slip_pct: "",
  speed_kn: "",
  distance_nm: "",
};

function ReportForm({
  portCalls,
  onCancel,
  onSave,
  isSaving,
}: {
  portCalls: PortCall[];
  onCancel: () => void;
  onSave: (f: ReportFormState) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(EMPTY_REPORT_FORM);
  const set = (key: keyof ReportFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        background: "rgba(56,189,248,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1rem",
      }}
    >
      <div>
        <label style={lbl}>Report Type</label>
        <select data-testid="report-type-select" value={form.report_type} onChange={set("report_type")} style={inp}>
          {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>Report Date/Time (UTC)</label>
        <input data-testid="report-datetime-input" type="datetime-local" value={form.report_datetime}
          onChange={set("report_datetime")} style={inp} />
      </div>
      {portCalls.length > 0 && (
        <div>
          <label style={lbl}>Port Call (optional)</label>
          <select data-testid="report-port-call-select" value={form.port_call_id} onChange={set("port_call_id")} style={inp}>
            <option value="">— None (at sea) —</option>
            {portCalls.map((pc) => (
              <option key={pc.id} value={pc.id}>{pc.id.slice(0, 8)}…</option>
            ))}
          </select>
        </div>
      )}
      {[
        { key: "latitude" as const, label: "Latitude", tid: "latitude-input" },
        { key: "longitude" as const, label: "Longitude", tid: "longitude-input" },
        { key: "wind_force" as const, label: "Wind Force (Bft)", tid: "wind-force-input" },
        { key: "sea_state" as const, label: "Sea State", tid: "sea-state-input" },
        { key: "rpm" as const, label: "RPM", tid: "rpm-input" },
        { key: "slip_pct" as const, label: "Slip %", tid: "slip-pct-input" },
        { key: "speed_kn" as const, label: "Speed (kn)", tid: "speed-kn-input" },
        { key: "distance_nm" as const, label: "Distance (nm)", tid: "distance-nm-input" },
      ].map(({ key, label, tid }) => (
        <div key={key}>
          <label style={lbl}>{label}</label>
          <input data-testid={tid} type="number" step="any" value={form[key]}
            onChange={set(key)} style={inp} />
        </div>
      ))}
      <div>
        <label style={lbl}>Swell</label>
        <input data-testid="swell-input" type="text" value={form.swell}
          onChange={set("swell")} style={inp} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", gridColumn: "1/-1" }}>
        <button
          data-testid="save-report-btn"
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving || !form.report_datetime}
          style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "4px", padding: "0.35rem 0.85rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
        >
          {isSaving ? "Saving…" : "Save Report"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "0.35rem 0.75rem", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function ActivityReportsPanel({ voyageId }: ActivityReportsPanelProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [addingBunkerLineFor, setAddingBunkerLineFor] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["voyage", voyageId, "activity-reports"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/activity-reports", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch activity reports");
      return (data ?? []) as ActivityReport[];
    },
  });

  const { data: portCalls = [] } = useQuery({
    queryKey: ["voyage", voyageId, "port-calls"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/port-calls", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch port calls");
      return (data ?? []) as PortCall[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId, "activity-reports"] });
  };

  const createMutation = useMutation({
    mutationFn: async (form: ReportFormState) => {
      const body: Record<string, unknown> = {
        report_type: form.report_type,
        report_datetime: form.report_datetime
          ? new Date(form.report_datetime).toISOString()
          : new Date().toISOString(),
        port_call_id: form.port_call_id || null,
      };
      if (form.latitude) body["latitude"] = parseFloat(form.latitude);
      if (form.longitude) body["longitude"] = parseFloat(form.longitude);
      if (form.wind_force) body["wind_force"] = parseInt(form.wind_force, 10);
      if (form.sea_state) body["sea_state"] = parseInt(form.sea_state, 10);
      if (form.swell) body["swell"] = form.swell;
      if (form.rpm) body["rpm"] = parseFloat(form.rpm);
      if (form.slip_pct) body["slip_pct"] = parseFloat(form.slip_pct);
      if (form.speed_kn) body["speed_kn"] = parseFloat(form.speed_kn);
      if (form.distance_nm) body["distance_nm"] = parseFloat(form.distance_nm);

      const { response } = await apiClient.POST("/api/v1/voyages/{voyage_id}/activity-reports", {
        params: { path: { voyage_id: voyageId } },
        body: body as Parameters<typeof apiClient.POST>[1]["body"],
      });
      if (!response.ok) throw new Error("Failed to create report");
    },
    onSuccess: () => {
      setShowForm(false);
      invalidate();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { response } = await apiClient.POST("/api/v1/activity-reports/{report_id}/submit", {
        params: { path: { report_id: reportId } },
      });
      if (!response.ok) throw new Error("Failed to submit");
    },
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { response } = await apiClient.POST("/api/v1/activity-reports/{report_id}/approve", {
        params: { path: { report_id: reportId } },
      });
      if (!response.ok) throw new Error("Failed to approve");
    },
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>Loading…</div>
    );
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button
          data-testid="add-report-btn"
          type="button"
          onClick={() => setShowForm(true)}
          style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
        >
          + Add Report
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <ReportForm
          portCalls={portCalls}
          onCancel={() => setShowForm(false)}
          onSave={(form) => createMutation.mutate(form)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* Report list */}
      {reports.length === 0 && !showForm ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px" }}>
          No activity reports yet. Click "+ Add Report" to record a noon, arrival, or departure report.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {reports.map((report) => (
            <div
              key={report.id}
              data-testid={`report-card-${report.id}`}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {/* Report header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{report.report_type}</span>
                <StatusBadge status={report.status} />
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  {new Date(report.report_datetime).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                {report.speed_kn && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: "auto" }}>
                    {report.speed_kn} kn · {report.distance_nm ?? "—"} nm
                  </span>
                )}
                {report.wind_force !== null && report.wind_force !== undefined && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                    Bft {report.wind_force} · SS {report.sea_state ?? "—"}
                  </span>
                )}

                {/* Action buttons */}
                <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                  {report.status === "DRAFT" && (
                    <button
                      data-testid={`submit-report-btn-${report.id}`}
                      type="button"
                      onClick={() => submitMutation.mutate(report.id)}
                      disabled={submitMutation.isPending}
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "3px", border: "1px solid #f59e0b44", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer" }}
                    >
                      Submit
                    </button>
                  )}
                  {report.status === "SUBMITTED" && (
                    <button
                      data-testid={`approve-report-btn-${report.id}`}
                      type="button"
                      onClick={() => approveMutation.mutate(report.id)}
                      disabled={approveMutation.isPending}
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "3px", border: "1px solid #34d39944", background: "#34d39911", color: "#34d399", cursor: "pointer" }}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>

              {/* Bunker lines */}
              <div style={{ padding: "0.75rem 1rem" }}>
                {report.bunker_lines.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.5rem", fontSize: "0.78rem" }}>
                    <thead>
                      <tr>
                        {["Grade", "Reported ROB (MT)", "Cons (MT)", "Received (MT)", "BDN"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "0.2rem 0.5rem", fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.bunker_lines.map((line: BunkerLine) => (
                        <tr key={line.id} data-testid={`bunker-line-row-${line.id}`}>
                          <td style={{ padding: "0.25rem 0.5rem", fontWeight: 600, color: "#38bdf8" }}>{line.fuel_grade}</td>
                          <td style={{ padding: "0.25rem 0.5rem" }}>{fmtMt(line.reported_rob_mt)}</td>
                          <td style={{ padding: "0.25rem 0.5rem" }}>{fmtMt(line.reported_consumption_mt)}</td>
                          <td style={{ padding: "0.25rem 0.5rem" }}>{fmtMt(line.received_mt)}</td>
                          <td style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}>{line.bdn_number ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Add bunker line — only for non-approved */}
                {report.status !== "APPROVED" && (
                  <>
                    {addingBunkerLineFor === report.id ? (
                      <BunkerLineForm
                        reportId={report.id}
                        onSaved={() => { setAddingBunkerLineFor(null); invalidate(); }}
                        onCancel={() => setAddingBunkerLineFor(null)}
                      />
                    ) : (
                      <button
                        data-testid={`add-bunker-line-btn-${report.id}`}
                        type="button"
                        onClick={() => setAddingBunkerLineFor(report.id)}
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "3px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        + Add Fuel Grade
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
