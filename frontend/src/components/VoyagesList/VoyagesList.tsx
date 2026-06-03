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
const LOB_OPTIONS = ["Tankers", "Dry Bulk", "Container", "LNG/LPG", "Chemical", "Other"];
const TRADE_AREA_OPTIONS = [
  "Mediterranean", "Baltic", "North Sea", "Black Sea", "Atlantic",
  "Pacific", "Indian Ocean", "Middle East Gulf", "Far East", "West Africa", "Americas",
];

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
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

  const [form, setForm] = useState({
    voyage_no: "",
    vessel_ref: "",
    commencing_datetime: new Date().toISOString().slice(0, 16),
    status: "Scheduled",
    ops_coordinator_user_id: "",
    trade_area: "",
    lob: "",
    is_pool: false,
    is_ice_class: false,
    is_clean: false,
    is_coated: false,
  });

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

  const f: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    padding: "0.4rem 0.6rem",
    fontSize: "0.85rem",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div data-testid="new-voyage-modal" style={{ background: "var(--bg-primary, #0d1017)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "1.75rem", width: "440px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>New Voyage</div>

        <div>
          <label style={lbl}>Voyage No. *</label>
          <input data-testid="voyage-no-input" style={f} value={form.voyage_no} onChange={(e) => setForm((v) => ({ ...v, voyage_no: e.target.value }))} placeholder="e.g. VOY-2026-001" />
        </div>
        <div>
          <label style={lbl}>Vessel *</label>
          <select data-testid="vessel-select" style={f} value={form.vessel_ref} onChange={(e) => setForm((v) => ({ ...v, vessel_ref: e.target.value }))}>
            <option value="">Select vessel…</option>
            {vessels?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Commencing Date *</label>
          <input style={f} type="datetime-local" value={form.commencing_datetime} onChange={(e) => setForm((v) => ({ ...v, commencing_datetime: e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Status</label>
          <select style={f} value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
            {["Forecast", "Scheduled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Ops Coordinator</label>
          <input style={f} value={form.ops_coordinator_user_id} onChange={(e) => setForm((v) => ({ ...v, ops_coordinator_user_id: e.target.value }))} placeholder="User ID" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={lbl}>LOB</label>
            <select style={f} value={form.lob} onChange={(e) => setForm((v) => ({ ...v, lob: e.target.value }))}>
              <option value="">—</option>
              {LOB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Trade Area</label>
            <select style={f} value={form.trade_area} onChange={(e) => setForm((v) => ({ ...v, trade_area: e.target.value }))}>
              <option value="">—</option>
              {TRADE_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {(["Pool", "Ice", "Clean", "Coated"] as const).map((flag) => {
            const key = `is_${flag.toLowerCase()}` as keyof typeof form;
            return (
              <label key={flag} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.checked }))} />
                {flag}
              </label>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            data-testid="create-voyage-btn"
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.voyage_no || !form.vessel_ref}
            style={{ flex: 1, background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.6rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
            type="button"
          >
            {create.isPending ? "Creating…" : "Create Voyage"}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}
            type="button"
          >
            Cancel
          </button>
        </div>
        {create.isError && <div style={{ color: "#f87171", fontSize: "0.78rem" }}>Failed. Check voyage number is unique.</div>}
      </div>
    </div>
  );
}

interface VoyagesListProps {
  filters?: Partial<VoyagesFilters>;
  onFilterChange?: (f: Partial<VoyagesFilters>) => void;
  onVoyageClick?: (voyageId: string) => void;
}

const COLS = [
  { label: "Voyage No.", align: "left" as const },
  { label: "Voyage Completing", align: "left" as const },
  { label: "Voyage Commencing", align: "left" as const },
  { label: "Commence GMT+/-", align: "right" as const },
  { label: "Complete GMT+/-", align: "right" as const },
  { label: "Vessel Name", align: "left" as const },
];

function fmtDT(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ActiveTab = "current" | "all" | "tco";

const TAB_LABELS: { key: ActiveTab; label: string }[] = [
  { key: "current", label: "CURRENT VOYAGE LIST" },
  { key: "all",     label: "ALL VOYAGES" },
  { key: "tco",     label: "TCO VOYAGES" },
];

export function VoyagesList({ filters = {}, onFilterChange, onVoyageClick }: VoyagesListProps) {
  const [showNew, setShowNew] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("current");

  const search = filters.search ?? "";

  const { data: vessels } = useQuery({
    queryKey: ["vessels"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/vessels");
      if (!response.ok) throw new Error("Failed");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const vesselMap: Record<string, string> = Object.fromEntries(
    (vessels ?? []).map((v) => [v.id, v.name])
  );

  const { data: voyages, isLoading, refetch } = useQuery({
    queryKey: ["voyages", filters, activeTab],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages", { params: { query: { limit: 200 } } });
      if (!response.ok) throw new Error("Failed");
      let list = (data ?? []) as Voyage[];
      if (activeTab === "current") list = list.filter((v) => ACTIVE_STATUSES.includes(v.status));
      if (search) list = list.filter((v) => v.voyage_no.toLowerCase().includes(search.toLowerCase()));
      return list;
    },
  });

  const tbBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "0.35rem",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "2rem" }}>
      <h1 className="panel-title" style={{ textAlign: "left", marginBottom: "0.75rem" }}>Voyages</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
        <button data-testid="search-toggle" title="Search" onClick={() => setShowSearch((s) => !s)} style={tbBtn} type="button">
          <IconSearch />
        </button>
        <button data-testid="new-voyage-btn" title="New Voyage" onClick={() => setShowNew(true)} style={tbBtn} type="button">
          <IconPlus />
        </button>
        <button title="Export" style={{ ...tbBtn, opacity: 0.4 }} disabled type="button">
          <IconDownload />
        </button>
        <button title="Refresh" onClick={() => void refetch()} style={tbBtn} type="button">
          <IconRefresh />
        </button>
      </div>

      {showSearch && (
        <div style={{ marginBottom: "0.5rem" }}>
          <input
            autoFocus
            type="text"
            placeholder="Search voyage no…"
            value={search}
            onChange={(e) => onFilterChange?.({ ...filters, search: e.target.value })}
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.35rem 0.75rem", fontSize: "0.82rem", width: "220px" }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "0.5rem" }}>
        {TAB_LABELS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #38bdf8" : "2px solid transparent",
                color: isActive ? "#38bdf8" : "var(--text-secondary)",
                cursor: "pointer",
                padding: "0.5rem 1rem",
                fontSize: "0.75rem",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.05em",
                marginBottom: "-1px",
              }}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <button style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "0.82rem", padding: "0.25rem 0" }} type="button">
          + ADD VIEW
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--text-secondary)", padding: "2rem" }}>Loading voyages…</div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {COLS.map(({ label, align }) => (
                  <th
                    key={label}
                    style={{ padding: "0.75rem 1rem", textAlign: align, color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {voyages?.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No voyages found.</td>
                </tr>
              )}
              {voyages?.map((v) => (
                <tr key={v.id} data-testid={`voyage-row-${v.id}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <button
                      data-testid={`voyage-no-btn-${v.id}`}
                      onClick={() => onVoyageClick?.(v.id)}
                      style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", padding: 0 }}
                      type="button"
                    >
                      {v.voyage_no}
                    </button>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDT(v.expected_completing_datetime)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDT(v.commencing_datetime)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", textAlign: "right" }}>—</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", textAlign: "right" }}>—</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    {vesselMap[v.vessel_ref] ?? `${v.vessel_ref.slice(0, 8)}…`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewVoyageModal onClose={() => setShowNew(false)} onCreated={() => setShowNew(false)} />}
    </div>
  );
}
