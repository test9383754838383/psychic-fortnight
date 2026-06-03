import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type { components } from "../api/schema";
import { ItineraryPanel } from "../components/ItineraryPanel/ItineraryPanel";

type UserSummary = components["schemas"]["UserSummaryDTO"];

type Voyage = components["schemas"]["VoyageResponseDTO"];

const CONTENT_TABS = [
  { key: "itinerary", label: "ITINERARY", enabled: true },
  { key: "port-activities", label: "PORT ACTIVITIES", enabled: false },
  { key: "cargoes", label: "CARGOES", enabled: false },
  { key: "delays", label: "DELAYS", enabled: false },
  { key: "bunkers", label: "BUNKERS", enabled: false },
  { key: "reports", label: "REPORTS", enabled: false },
  { key: "instructions", label: "INSTRUCTIONS", enabled: false },
  { key: "notes", label: "NOTES", enabled: false },
] as const;

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

function IconProperties() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const NEXT_STATUSES: Record<string, string[]> = {
  Forecast: ["Scheduled", "Cancelled"],
  Scheduled: ["Commenced", "Cancelled"],
  Commenced: ["Completed", "Cancelled"],
  Completed: ["Closed"],
  Closed: [],
  Cancelled: [],
};

function PropertiesPanel({ voyage, onSaved }: { voyage: Voyage; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/users");
      if (!response.ok) throw new Error("Failed");
      return (data ?? []) as UserSummary[];
    },
  });
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
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyage.id] });
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
      void queryClient.invalidateQueries({ queryKey: ["voyage", voyage.id] });
      onSaved();
    },
  });

  const sel: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    padding: "0.35rem 0.5rem",
    fontSize: "0.82rem",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" };
  const sec: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" };

  return (
    <div style={{ width: "300px", minWidth: "300px", background: "var(--surface-1, #141920)", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Properties</span>
      </div>

      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <section>
          <div style={sec}>Voyage</div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={lbl}>Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <StatusChip status={voyage.status} />
              {(NEXT_STATUSES[voyage.status] ?? []).map((s) => (
                <button
                  key={s}
                  onClick={() => transition.mutate(s)}
                  disabled={transition.isPending}
                  style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", cursor: "pointer" }}
                  type="button"
                >
                  → {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={lbl}>Flags</div>
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
          <div style={sec}>Company</div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={lbl}>LOB</label>
            <select value={form.lob} onChange={(e) => setForm((f) => ({ ...f, lob: e.target.value }))} style={sel}>
              <option value="">—</option>
              {LOB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Trade Area</label>
            <select value={form.trade_area} onChange={(e) => setForm((f) => ({ ...f, trade_area: e.target.value }))} style={sel}>
              <option value="">—</option>
              {TRADE_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </section>

        <section>
          <div style={sec}>Users</div>
          <div>
            <label style={lbl}>Ops Coordinator</label>
            <select
              data-testid="ops-coordinator-select"
              value={form.ops_coordinator_user_id}
              onChange={(e) => setForm((f) => ({ ...f, ops_coordinator_user_id: e.target.value }))}
              style={{ ...sel, width: "100%", boxSizing: "border-box" }}
            >
              <option value="">—</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
        </section>

        <button
          data-testid="save-properties-btn"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.55rem 1rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
          type="button"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        {save.isError && <div style={{ color: "#f87171", fontSize: "0.78rem" }}>Failed to save.</div>}
      </div>
    </div>
  );
}

export interface VoyageManagerContentProps {
  voyageId: string;
  onBack: () => void;
}

export function VoyageManagerContent({ voyageId, onBack }: VoyageManagerContentProps) {
  const [activePanel, setActivePanel] = useState<"properties" | null>("properties");
  const [activeContentTab, setActiveContentTab] = useState<string>("itinerary");

  const { data: voyage, refetch } = useQuery({
    queryKey: ["voyage", voyageId],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed");
      return data as Voyage;
    },
  });

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

  const railBtn = (active: boolean): React.CSSProperties => ({
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? "rgba(56,189,248,0.12)" : "none",
    border: active ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
    borderRadius: "6px",
    color: active ? "#38bdf8" : "rgba(148,163,184,0.6)",
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
          <button
            data-testid="back-btn"
            onClick={onBack}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.82rem", padding: "0.25rem 0.5rem", borderRadius: "4px" }}
            type="button"
          >
            <IconBack /> Voyages
          </button>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span data-testid="voyage-header-no" style={{ fontWeight: 700, fontSize: "1rem" }}>
            {voyage?.voyage_no ?? "—"}
          </span>
          {voyage && <StatusChip status={voyage.status} />}
          {voyage && (
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              {vesselMap[voyage.vessel_ref] ?? `${voyage.vessel_ref.slice(0, 8)}…`}
            </span>
          )}
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          {CONTENT_TABS.map(({ key, label, enabled }) => {
            const active = activeContentTab === key;
            return (
              <button
                key={key}
                data-testid={`content-tab-${key}`}
                type="button"
                title={enabled ? label : "Coming soon"}
                onClick={enabled ? () => { setActiveContentTab(key); } : undefined}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2px solid #38bdf8" : "2px solid transparent",
                  color: active ? "#38bdf8" : "rgba(148,163,184,0.6)",
                  cursor: enabled ? "pointer" : "default",
                  opacity: enabled ? 1 : 0.35,
                  padding: "0.5rem 1rem",
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

        <div style={{ flex: 1, overflow: "auto" }}>
          {!voyage ? (
            <div style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>Loading…</div>
          ) : activeContentTab === "itinerary" ? (
            <ItineraryPanel
              voyageId={voyageId}
              itineraryLines={voyage.itinerary_lines ?? []}
              onRefetch={() => void refetch()}
            />
          ) : null}
        </div>
      </div>

      {activePanel === "properties" && voyage && (
        <PropertiesPanel voyage={voyage} onSaved={() => void refetch()} />
      )}

      <div style={{ width: "48px", minWidth: "48px", background: "#0a1220", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "0.75rem", gap: "0.35rem" }}>
        <button
          data-testid="panel-btn-properties"
          title="Properties"
          onClick={() => setActivePanel((p) => (p === "properties" ? null : "properties"))}
          style={railBtn(activePanel === "properties")}
          type="button"
        >
          <IconProperties />
        </button>
      </div>
    </div>
  );
}
