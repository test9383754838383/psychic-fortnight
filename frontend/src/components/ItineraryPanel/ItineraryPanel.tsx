import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type ItineraryLine = components["schemas"]["ItineraryLineResponseDTO"];
type Port = components["schemas"]["PortResponseDTO"];

interface ItineraryPanelProps {
  voyageId: string;
  itineraryLines: ItineraryLine[];
  onRefetch: () => void;
}

const PORT_FUNCTIONS = [
  "Load",
  "Discharge",
  "Ballast",
  "Bunker",
  "Canal",
  "Transit",
  "Repairs",
  "Other",
] as const;

const BADGE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  Load:      { bg: "#f97316", color: "#fff", label: "L" },
  Discharge: { bg: "#f97316", color: "#fff", label: "D" },
  Ballast:   { bg: "#22c55e", color: "#fff", label: "⚓" },
  Bunker:    { bg: "#38bdf8", color: "#fff", label: "B" },
  Canal:     { bg: "#94a3b8", color: "#fff", label: "C" },
  Transit:   { bg: "#94a3b8", color: "#fff", label: "T" },
  Repairs:   { bg: "#ef4444", color: "#fff", label: "R" },
  Other:     { bg: "#64748b", color: "#fff", label: "O" },
};

function FunctionBadge({ fn, commencing }: { fn: string; commencing: boolean }) {
  const style = commencing
    ? { bg: "#22c55e", color: "#fff", label: "⚓" }
    : (BADGE_STYLE[fn] ?? { bg: "#64748b", color: "#fff", label: fn[0] ?? "?" });
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: style.bg,
        color: style.color,
        fontSize: "0.65rem",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {style.label}
    </span>
  );
}

function fmt_date(dt: string): string {
  const d = new Date(dt);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt_time(dt: string): string {
  const d = new Date(dt);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function to_local_dt(iso: string): string {
  // Convert ISO UTC string to datetime-local input value (local time)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface RowForm {
  port_ref: string;
  port_function: string;
  planned_eta: string;
  planned_etd: string;
  speed_kts: string;
  distance_nm: string;
  eca_nm: string;
}

function empty_form(): RowForm {
  return {
    port_ref: "",
    port_function: "Load",
    planned_eta: "",
    planned_etd: "",
    speed_kts: "",
    distance_nm: "",
    eca_nm: "",
  };
}

function line_to_form(line: ItineraryLine): RowForm {
  return {
    port_ref: line.port_ref,
    port_function: line.port_function,
    planned_eta: to_local_dt(line.planned_eta),
    planned_etd: to_local_dt(line.planned_etd),
    speed_kts: line.speed_kts != null ? String(line.speed_kts) : "",
    distance_nm: line.distance_nm != null ? String(line.distance_nm) : "",
    eca_nm: line.eca_nm != null ? String(line.eca_nm) : "",
  };
}

export function ItineraryPanel({ voyageId, itineraryLines, onRefetch }: ItineraryPanelProps) {
  const queryClient = useQueryClient();
  const [addingRow, setAddingRow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RowForm>(empty_form());

  const { data: ports = [] } = useQuery<Port[]>({
    queryKey: ["ports"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/ports");
      if (!response.ok) throw new Error("Failed to fetch ports");
      return (data ?? []) as Port[];
    },
  });

  const portMap: Record<string, Port> = Object.fromEntries(ports.map((p) => [p.id, p]));

  const addMutation = useMutation({
    mutationFn: async (f: RowForm) => {
      const { response } = await apiClient.POST("/api/v1/voyages/{voyage_id}/itinerary", {
        params: { path: { voyage_id: voyageId } },
        body: {
          port_ref: f.port_ref,
          port_function: f.port_function,
          planned_eta: new Date(f.planned_eta).toISOString(),
          planned_etd: new Date(f.planned_etd).toISOString(),
          speed_kts: f.speed_kts ? Number(f.speed_kts) : undefined,
          distance_nm: f.distance_nm ? Number(f.distance_nm) : undefined,
          eca_nm: f.eca_nm ? Number(f.eca_nm) : undefined,
        },
      });
      if (!response.ok) throw new Error("Failed to add port");
    },
    onSuccess: () => {
      setAddingRow(false);
      setForm(empty_form());
      onRefetch();
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ lineId, f }: { lineId: string; f: RowForm }) => {
      const { response } = await apiClient.PATCH(
        "/api/v1/voyages/{voyage_id}/itinerary/{line_id}",
        {
          params: { path: { voyage_id: voyageId, line_id: lineId } },
          body: {
            port_ref: f.port_ref,
            port_function: f.port_function,
            planned_eta: new Date(f.planned_eta).toISOString(),
            planned_etd: new Date(f.planned_etd).toISOString(),
            speed_kts: f.speed_kts ? Number(f.speed_kts) : undefined,
            distance_nm: f.distance_nm ? Number(f.distance_nm) : undefined,
            eca_nm: f.eca_nm ? Number(f.eca_nm) : undefined,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to save port");
    },
    onSuccess: () => {
      setEditingId(null);
      onRefetch();
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const { response } = await apiClient.DELETE(
        "/api/v1/voyages/{voyage_id}/itinerary/{line_id}",
        {
          params: { path: { voyage_id: voyageId, line_id: lineId } },
        }
      );
      if (!response.ok) throw new Error("Failed to delete port");
    },
    onSuccess: () => {
      onRefetch();
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId] });
    },
  });

  const minSeq = itineraryLines.length > 0
    ? Math.min(...itineraryLines.map((l) => l.sequence_no))
    : -1;

  // Summary computations
  const portDaysTotal = itineraryLines.reduce((s, l) => s + l.port_days, 0);
  const seaDaysTotal = itineraryLines.reduce((s, l) => s + (l.sea_days ?? 0), 0);
  const totalNm = itineraryLines.reduce((s, l) => s + Number(l.distance_nm ?? 0), 0);
  const ecaNm = itineraryLines.reduce((s, l) => s + Number(l.eca_nm ?? 0), 0);

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    color: "#e2e8f0",
    padding: "0.25rem 0.4rem",
    fontSize: "0.78rem",
    width: "100%",
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };

  function FormRow({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
    return (
      <tr style={{ background: "rgba(56,189,248,0.06)" }}>
        <td style={{ padding: "0.4rem 0.75rem" }}>
          <select
            data-testid="port-select"
            value={form.port_ref}
            onChange={(e) => { setForm((f) => ({ ...f, port_ref: e.target.value })); }}
            style={selectStyle}
          >
            <option value="">— select port —</option>
            {ports.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unlocode})
              </option>
            ))}
          </select>
        </td>
        <td style={{ padding: "0.4rem 0.5rem" }}>
          <select
            data-testid="port-fn-select"
            value={form.port_function}
            onChange={(e) => { setForm((f) => ({ ...f, port_function: e.target.value })); }}
            style={{ ...selectStyle, width: "90px" }}
          >
            {PORT_FUNCTIONS.map((fn) => (
              <option key={fn} value={fn}>{fn}</option>
            ))}
          </select>
        </td>
        <td style={{ padding: "0.4rem 0.5rem" }}>
          <input
            type="datetime-local"
            data-testid="eta-input"
            value={form.planned_eta}
            onChange={(e) => { setForm((f) => ({ ...f, planned_eta: e.target.value })); }}
            style={{ ...inputStyle, width: "160px" }}
          />
        </td>
        <td style={{ padding: "0.4rem 0.5rem" }}>
          <input
            type="datetime-local"
            data-testid="etd-input"
            value={form.planned_etd}
            onChange={(e) => { setForm((f) => ({ ...f, planned_etd: e.target.value })); }}
            style={{ ...inputStyle, width: "160px" }}
          />
        </td>
        <td style={{ padding: "0.4rem 0.5rem" }}>
          <input
            type="number"
            data-testid="speed-input"
            value={form.speed_kts}
            placeholder="kts"
            step="0.1"
            onChange={(e) => { setForm((f) => ({ ...f, speed_kts: e.target.value })); }}
            style={{ ...inputStyle, width: "64px" }}
          />
        </td>
        <td style={{ padding: "0.4rem 0.5rem" }}>
          <input
            type="number"
            data-testid="distance-input"
            value={form.distance_nm}
            placeholder="nm"
            step="0.1"
            onChange={(e) => { setForm((f) => ({ ...f, distance_nm: e.target.value })); }}
            style={{ ...inputStyle, width: "72px" }}
          />
        </td>
        <td style={{ padding: "0.4rem 0.5rem" }}>
          <input
            type="number"
            data-testid="eca-input"
            value={form.eca_nm}
            placeholder="ECA nm"
            step="0.1"
            onChange={(e) => { setForm((f) => ({ ...f, eca_nm: e.target.value })); }}
            style={{ ...inputStyle, width: "72px" }}
          />
        </td>
        <td style={{ padding: "0.4rem 0.5rem", whiteSpace: "nowrap" }}>
          <button
            data-testid="save-row-btn"
            type="button"
            disabled={saving}
            onClick={onSave}
            style={{ background: "#38bdf8", border: "none", borderRadius: "4px", color: "#0a1220", padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", marginRight: "0.35rem" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            data-testid="cancel-row-btn"
            type="button"
            onClick={onCancel}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "var(--text-secondary)", padding: "0.25rem 0.6rem", fontSize: "0.75rem", cursor: "pointer" }}
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    textAlign: "left",
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "rgba(148,163,184,0.6)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.55rem 0.75rem",
    fontSize: "0.8rem",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1rem 1.5rem" }}>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table data-testid="itinerary-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Port</th>
              <th style={thStyle}>Function</th>
              <th style={thStyle}>ETA</th>
              <th style={thStyle}>ETD</th>
              <th style={thStyle}>Speed</th>
              <th style={thStyle}>nm</th>
              <th style={thStyle}>ECA nm</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {itineraryLines.map((line, idx) => {
              const port = portMap[line.port_ref];
              const isCommencing = line.sequence_no === minSeq;
              const isEditing = editingId === line.id;

              if (isEditing) {
                return (
                  <FormRow
                    key={line.id}
                    onSave={() => { editMutation.mutate({ lineId: line.id, f: form }); }}
                    onCancel={() => { setEditingId(null); }}
                    saving={editMutation.isPending}
                  />
                );
              }

              return (
                <tr key={line.id} data-testid={`itinerary-row-${idx}`} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FunctionBadge fn={line.port_function} commencing={isCommencing} />
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>
                        {port?.name ?? `${line.port_ref.slice(0, 8)}…`}
                      </span>
                      {port?.unlocode && (
                        <span style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.6)" }}>
                          {port.unlocode}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.5)", marginTop: "0.1rem", paddingLeft: "30px" }}>
                      {line.port_days.toFixed(2)} port days
                      {line.sea_days != null && ` · ${line.sea_days.toFixed(2)} sea days`}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {line.port_function}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div>{fmt_date(line.planned_eta)}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(148,163,184,0.6)" }}>{fmt_time(line.planned_eta)}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{fmt_date(line.planned_etd)}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(148,163,184,0.6)" }}>{fmt_time(line.planned_etd)}</div>
                  </td>
                  <td style={{ ...tdStyle, color: "rgba(148,163,184,0.8)" }}>
                    {line.speed_kts != null ? `${line.speed_kts} kts` : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "rgba(148,163,184,0.8)" }}>
                    {line.distance_nm != null ? String(line.distance_nm) : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "rgba(148,163,184,0.8)" }}>
                    {line.eca_nm != null ? String(line.eca_nm) : "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      data-testid="edit-row-btn"
                      type="button"
                      title="Edit"
                      onClick={() => {
                        setEditingId(line.id);
                        setAddingRow(false);
                        setForm(line_to_form(line));
                      }}
                      style={{ background: "none", border: "none", color: "rgba(148,163,184,0.6)", cursor: "pointer", padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                    >
                      ✎
                    </button>
                    <button
                      data-testid="delete-row-btn"
                      type="button"
                      title="Delete"
                      onClick={() => { deleteMutation.mutate(line.id); }}
                      style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}

            {addingRow && (
              <FormRow
                onSave={() => { addMutation.mutate(form); }}
                onCancel={() => { setAddingRow(false); setForm(empty_form()); }}
                saving={addMutation.isPending}
              />
            )}
          </tbody>
        </table>

        {itineraryLines.length === 0 && !addingRow && (
          <div style={{ padding: "2rem", textAlign: "center", color: "rgba(148,163,184,0.4)", fontSize: "0.82rem" }}>
            No ports yet — click + Add Port to build the itinerary.
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem", marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button
          data-testid="add-port-btn"
          type="button"
          onClick={() => { setAddingRow(true); setEditingId(null); setForm(empty_form()); }}
          disabled={addingRow}
          style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "5px", color: "#38bdf8", padding: "0.35rem 0.85rem", fontSize: "0.78rem", fontWeight: 600, cursor: addingRow ? "default" : "pointer" }}
        >
          + Add Port
        </button>

        <div style={{ display: "flex", gap: "2rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          <div>
            <div style={{ marginBottom: "0.2rem" }}>
              <span style={{ color: "rgba(148,163,184,0.5)", marginRight: "0.5rem" }}>Port</span>
              <span data-testid="summary-port-days" style={{ fontWeight: 600, color: "#e2e8f0" }}>{portDaysTotal.toFixed(2)} days</span>
            </div>
            <div style={{ marginBottom: "0.2rem" }}>
              <span style={{ color: "rgba(148,163,184,0.5)", marginRight: "0.5rem" }}>Sea</span>
              <span data-testid="summary-sea-days" style={{ fontWeight: 600, color: "#e2e8f0" }}>{seaDaysTotal.toFixed(2)} days</span>
            </div>
            <div>
              <span style={{ color: "rgba(148,163,184,0.5)", marginRight: "0.5rem" }}>Total</span>
              <span data-testid="summary-total-days" style={{ fontWeight: 700, color: "#38bdf8" }}>{(portDaysTotal + seaDaysTotal).toFixed(2)} days</span>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: "0.2rem" }}>
              <span style={{ color: "rgba(148,163,184,0.5)", marginRight: "0.5rem" }}>ECA</span>
              <span data-testid="summary-eca-nm" style={{ fontWeight: 600, color: "#e2e8f0" }}>{ecaNm.toFixed(0)} nm</span>
            </div>
            <div>
              <span style={{ color: "rgba(148,163,184,0.5)", marginRight: "0.5rem" }}>Total</span>
              <span data-testid="summary-total-nm" style={{ fontWeight: 600, color: "#e2e8f0" }}>{totalNm.toFixed(0)} nm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
