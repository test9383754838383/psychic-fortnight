import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type Voyage = components["schemas"]["VoyageResponseDTO"];

export interface VoyagesFilters {
  status: string;
  vessel_id: string;
  ops_coordinator: string;
  trade_area: string;
  search: string;
}

const ACTIVE_STATUSES = ["Forecast", "Scheduled", "Commenced"];
const ALL_STATUSES = ["Forecast", "Scheduled", "Commenced", "Completed", "Closed", "Cancelled"];
const LOB_OPTIONS = ["Tankers", "Dry Bulk", "Container", "LNG/LPG", "Chemical", "Other"];
const TRADE_AREA_OPTIONS = [
  "Mediterranean", "Baltic", "North Sea", "Black Sea", "Atlantic",
  "Pacific", "Indian Ocean", "Middle East Gulf", "Far East", "West Africa", "Americas",
];

const STATUS_COLORS: Record<string, string> = {
  Forecast: "#a78bfa",
  Scheduled: "#38bdf8",
  Commenced: "#34d399",
  Completed: "#94a3b8",
  Closed: "#64748b",
  Cancelled: "#f87171",
};

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span style={{ display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {status}
    </span>
  );
}

function FlagBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{ display: "inline-block", padding: "0.1rem 0.45rem", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600, background: active ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)", color: active ? "#38bdf8" : "rgba(148,163,184,0.5)", border: `1px solid ${active ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.06)"}`, opacity: active ? 1 : 0.5 }}>
      {label}
    </span>
  );
}

function PropertiesPanel({ voyage, onClose, onSaved }: { voyage: Voyage; onClose: () => void; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    ops_coordinator_user_id: voyage.ops_coordinator_user_id ?? "",
    trade_area: voyage.trade_area ?? "",
    lob: voyage.lob ?? "",
    is_pool: voyage.is_pool,
    is_ice_class: voyage.is_ice_class,
    is_clean: voyage.is_clean,
    is_coated: voyage.is_coated,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.PATCH("/api/v1/voyages/{voyage_id}", {
        params: { path: { voyage_id: voyage.id } },
        body: {
          ops_coordinator_user_id: form.ops_coordinator_user_id || null,
          trade_area: form.trade_area || null,
          lob: form.lob || null,
          is_pool: form.is_pool,
          is_ice_class: form.is_ice_class,
          is_clean: form.is_clean,
          is_coated: form.is_coated,
        },
      });
      if (!response.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyages"] });
      onSaved();
    },
  });

  const transition = useMutation({
    mutationFn: async (toStatus: string) => {
      const { response } = await apiClient.POST("/api/v1/voyages/{voyage_id}/transition", {
        params: { path: { voyage_id: voyage.id } },
        body: { to: toStatus },
      });
      if (!response.ok) throw new Error("Failed to transition");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyages"] });
      onSaved();
    },
  });

  const nextStatuses: Record<string, string[]> = {
    Forecast: ["Scheduled", "Cancelled"],
    Scheduled: ["Commenced", "Cancelled"],
    Commenced: ["Completed", "Cancelled"],
    Completed: ["Closed"],
    Closed: [],
    Cancelled: [],
  };

  const panelStyle: React.CSSProperties = { width: "320px", minWidth: "320px", background: "var(--surface-1, #141920)", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflowY: "auto" };
  const sectionLabel: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" };
  const fieldLabel: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" };
  const selectStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", padding: "0.35rem 0.5rem", fontSize: "0.82rem" };

  return (
    <div data-testid="properties-panel" style={panelStyle}>
      <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Properties</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.1rem" }} aria-label="Close" type="button">×</button>
      </div>

      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <section>
          <div style={sectionLabel}>Voyage</div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={fieldLabel}>Voyage No.</div>
            <div style={{ fontWeight: 600 }}>{voyage.voyage_no}</div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={fieldLabel}>Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <StatusChip status={voyage.status} />
              {(nextStatuses[voyage.status] ?? []).map((s) => (
                <button key={s} onClick={() => transition.mutate(s)} disabled={transition.isPending} style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", cursor: "pointer" }} type="button">→ {s}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={fieldLabel}>Flags</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {(["Pool", "Ice", "Clean", "Coated"] as const).map((flag) => {
                const key = `is_${flag.toLowerCase()}` as keyof typeof form;
                return (
                  <label key={flag} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
                    {flag}
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div style={sectionLabel}>Company</div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={fieldLabel}>LOB</label>
            <select value={form.lob} onChange={(e) => setForm((f) => ({ ...f, lob: e.target.value }))} style={selectStyle}>
              <option value="">—</option>
              {LOB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={fieldLabel}>Trade Area</label>
            <select value={form.trade_area} onChange={(e) => setForm((f) => ({ ...f, trade_area: e.target.value }))} style={selectStyle}>
              <option value="">—</option>
              {TRADE_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </section>

        <section>
          <div style={sectionLabel}>Users</div>
          <div>
            <label style={fieldLabel}>Ops Coordinator</label>
            <input
              data-testid="ops-coordinator-input"
              type="text"
              value={form.ops_coordinator_user_id}
              onChange={(e) => setForm((f) => ({ ...f, ops_coordinator_user_id: e.target.value }))}
              placeholder="User ID or name"
              style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </section>

        <button data-testid="save-properties-btn" onClick={() => save.mutate()} disabled={save.isPending} style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.55rem 1rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }} type="button">
          {save.isPending ? "Saving…" : "Save"}
        </button>
        {save.isError && <div style={{ color: "#f87171", fontSize: "0.78rem" }}>Failed to save.</div>}
      </div>
    </div>
  );
}

function NewVoyageModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const queryClient = useQueryClient();
  const { data: vessels } = useQuery({
    queryKey: ["vessels"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/vessels");
      if (!response.ok) throw new Error("Failed");
      return data as { id: string; name: string }[];
    },
  });

  const [form, setForm] = useState({ voyage_no: "", vessel_ref: "", commencing_datetime: new Date().toISOString().slice(0, 16), status: "Scheduled", ops_coordinator_user_id: "", trade_area: "", lob: "", is_pool: false, is_ice_class: false, is_clean: false, is_coated: false });

  const create = useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.POST("/api/v1/voyages", {
        body: {
          voyage_no: form.voyage_no,
          vessel_ref: form.vessel_ref as `${string}-${string}-${string}-${string}-${string}`,
          commencing_datetime: new Date(form.commencing_datetime).toISOString(),
          status: form.status,
          ops_coordinator_user_id: form.ops_coordinator_user_id || null,
          trade_area: form.trade_area || null,
          lob: form.lob || null,
          is_pool: form.is_pool,
          is_ice_class: form.is_ice_class,
          is_clean: form.is_clean,
          is_coated: form.is_coated,
        },
      });
      if (!response.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voyages"] });
      onCreated();
    },
  });

  const f: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", padding: "0.4rem 0.6rem", fontSize: "0.85rem" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div data-testid="new-voyage-modal" style={{ background: "var(--bg-primary, #0d1017)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "1.75rem", width: "440px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>New Voyage</div>

        <div><label style={lbl}>Voyage No. *</label><input data-testid="voyage-no-input" style={f} value={form.voyage_no} onChange={(e) => setForm((v) => ({ ...v, voyage_no: e.target.value }))} placeholder="e.g. VOY-2026-001" /></div>
        <div><label style={lbl}>Vessel *</label>
          <select data-testid="vessel-select" style={f} value={form.vessel_ref} onChange={(e) => setForm((v) => ({ ...v, vessel_ref: e.target.value }))}>
            <option value="">Select vessel…</option>
            {vessels?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Commencing Date *</label><input style={f} type="datetime-local" value={form.commencing_datetime} onChange={(e) => setForm((v) => ({ ...v, commencing_datetime: e.target.value }))} /></div>
        <div><label style={lbl}>Status</label>
          <select style={f} value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
            {["Forecast", "Scheduled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Ops Coordinator</label><input style={f} value={form.ops_coordinator_user_id} onChange={(e) => setForm((v) => ({ ...v, ops_coordinator_user_id: e.target.value }))} placeholder="User ID" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div><label style={lbl}>LOB</label><select style={f} value={form.lob} onChange={(e) => setForm((v) => ({ ...v, lob: e.target.value }))}><option value="">—</option>{LOB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div><label style={lbl}>Trade Area</label><select style={f} value={form.trade_area} onChange={(e) => setForm((v) => ({ ...v, trade_area: e.target.value }))}><option value="">—</option>{TRADE_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {(["Pool", "Ice", "Clean", "Coated"] as const).map((flag) => {
            const key = `is_${flag.toLowerCase()}` as keyof typeof form;
            return <label key={flag} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}><input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.checked }))} />{flag}</label>;
          })}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button data-testid="create-voyage-btn" onClick={() => create.mutate()} disabled={create.isPending || !form.voyage_no || !form.vessel_ref} style={{ flex: 1, background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.6rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }} type="button">{create.isPending ? "Creating…" : "Create Voyage"}</button>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }} type="button">Cancel</button>
        </div>
        {create.isError && <div style={{ color: "#f87171", fontSize: "0.78rem" }}>Failed. Check voyage number is unique.</div>}
      </div>
    </div>
  );
}

interface VoyagesListProps {
  filters?: Partial<VoyagesFilters>;
  onFilterChange?: (f: Partial<VoyagesFilters>) => void;
}

export function VoyagesList({ filters = {}, onFilterChange }: VoyagesListProps) {
  const status = filters.status ?? "";
  const search = filters.search ?? "";
  const ops_coordinator = filters.ops_coordinator ?? "";
  const trade_area = filters.trade_area ?? "";

  const activeDefault = !status;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: voyages, isLoading } = useQuery({
    queryKey: ["voyages", filters],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages", { params: { query: { limit: 200 } } });
      if (!response.ok) throw new Error("Failed");
      let list = (data ?? []) as Voyage[];
      if (activeDefault) list = list.filter((v) => ACTIVE_STATUSES.includes(v.status));
      else if (status && status !== "All") list = list.filter((v) => v.status === status);
      if (ops_coordinator) list = list.filter((v) => v.ops_coordinator_user_id === ops_coordinator);
      if (trade_area) list = list.filter((v) => v.trade_area === trade_area);
      if (search) list = list.filter((v) => v.voyage_no.toLowerCase().includes(search.toLowerCase()));
      return list;
    },
  });

  const selected = voyages?.find((v) => v.id === selectedId) ?? null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 className="panel-title" style={{ textAlign: "left", marginBottom: "0.25rem" }}>Voyages</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
              {activeDefault ? "Active — Forecast, Scheduled, Commenced" : "All voyages"}
            </p>
          </div>
          <button data-testid="new-voyage-btn" onClick={() => setShowNew(true)} style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }} type="button">+ New Voyage</button>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <select value={status} onChange={(e) => onFilterChange?.({ ...filters, status: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}>
            <option value="">Active (Forecast/Scheduled/Commenced)</option>
            <option value="All">All statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={trade_area} onChange={(e) => onFilterChange?.({ ...filters, trade_area: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}>
            <option value="">All trade areas</option>
            {TRADE_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input type="text" placeholder="Search voyage no…" value={search} onChange={(e) => onFilterChange?.({ ...filters, search: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.35rem 0.75rem", fontSize: "0.82rem", width: "180px" }} />
        </div>

        {isLoading ? (
          <div style={{ color: "var(--text-secondary)", padding: "2rem" }}>Loading voyages…</div>
        ) : (
          <div className="glass-panel" style={{ padding: 0, overflow: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Voyage No.", "Status", "Vessel", "Commencing", "Completing", "Ops Coordinator", "Trade Area", "LOB", "Flags"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {voyages?.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No voyages found.</td></tr>
                )}
                {voyages?.map((v) => (
                  <tr key={v.id} data-testid={`voyage-row-${v.id}`} onClick={() => setSelectedId(v.id === selectedId ? null : v.id)} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: v.id === selectedId ? "rgba(56,189,248,0.06)" : "transparent" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#38bdf8" }}>{v.voyage_no}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><StatusChip status={v.status} /></td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{v.vessel_ref.slice(0, 8)}…</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{new Date(v.commencing_datetime).toLocaleDateString()}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{v.expected_completing_datetime ? new Date(v.expected_completing_datetime).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{v.ops_coordinator_user_id ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{v.trade_area ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{v.lob ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        {v.is_pool && <FlagBadge label="Pool" active />}
                        {v.is_ice_class && <FlagBadge label="Ice" active />}
                        {v.is_clean && <FlagBadge label="Clean" active />}
                        {v.is_coated && <FlagBadge label="Coated" active />}
                        {!v.is_pool && !v.is_ice_class && !v.is_clean && !v.is_coated && <span style={{ color: "#64748b", fontSize: "0.78rem" }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <PropertiesPanel voyage={selected} onClose={() => setSelectedId(null)} onSaved={() => setSelectedId(null)} />}
      {showNew && <NewVoyageModal onClose={() => setShowNew(false)} onCreated={() => setShowNew(false)} />}
    </div>
  );
}
