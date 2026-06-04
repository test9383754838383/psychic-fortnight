import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type BunkerRob = components["schemas"]["BunkerRobReadDTO"];
type PortCall = components["schemas"]["PortCallResponseDTO"];
type ItineraryLine = components["schemas"]["ItineraryLineResponseDTO"];

const FUEL_GRADES = ["VLSFO", "LSMGO", "HSFO", "MGO", "LNG"] as const;
type FuelGrade = (typeof FUEL_GRADES)[number];

interface RobFormState {
  port_call_id: string;
  fuel_grade: FuelGrade;
  rob_arrival_mt: string;
  received_mt: string;
  port_consumption_mt: string;
  rob_departure_mt: string;
  sulphur_pct: string;
  bdn_number: string;
}

const EMPTY_FORM = (port_call_id: string): RobFormState => ({
  port_call_id,
  fuel_grade: "VLSFO",
  rob_arrival_mt: "",
  received_mt: "",
  port_consumption_mt: "",
  rob_departure_mt: "",
  sulphur_pct: "",
  bdn_number: "",
});

interface BunkersPanelProps {
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

const th: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textAlign: "left",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  fontSize: "0.82rem",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

function fmtMt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function parseF(val: string | null | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ── sea-leg derivation ────────────────────────────────────────────────────────

interface SeaLeg {
  legIndex: number;              // 0-based: 0 = between PC[0] and PC[1]
  grade: FuelGrade;
  seaConsMt: number;             // prev departure − next arrival
  distanceNm: number | null;
  seaDays: number | null;
  mtPerDay: number | null;
}

function deriveSeaLegs(
  sortedPcs: PortCall[],
  robs: BunkerRob[],
  ilineMap: Map<string, ItineraryLine>,
): SeaLeg[] {
  // Index robs by port_call_id → grade → rob
  const robIndex = new Map<string, Map<string, BunkerRob>>();
  for (const r of robs) {
    if (!robIndex.has(r.port_call_id)) robIndex.set(r.port_call_id, new Map());
    robIndex.get(r.port_call_id)!.set(r.fuel_grade, r);
  }

  const legs: SeaLeg[] = [];
  for (let i = 0; i < sortedPcs.length - 1; i++) {
    const prev = sortedPcs[i]!;
    const next = sortedPcs[i + 1]!;
    const prevRobs = robIndex.get(prev.id);
    const nextRobs = robIndex.get(next.id);

    // Itinerary line for the next port call gives distance/sea_days for the leg into it
    const iline = next.itinerary_line_id ? ilineMap.get(next.itinerary_line_id) ?? null : null;
    const distanceNm = iline?.distance_nm ? parseF(iline.distance_nm) : null;
    const seaDays = iline?.sea_days ?? null;

    for (const grade of FUEL_GRADES) {
      const prevRob = prevRobs?.get(grade);
      const nextRob = nextRobs?.get(grade);
      if (!prevRob || !nextRob) continue;

      const dep = parseF(prevRob.rob_departure_mt);
      const arr = parseF(nextRob.rob_arrival_mt);
      if (dep === null || arr === null) continue;

      const seaConsMt = dep - arr;
      const mtPerDay = seaDays && seaDays > 0 ? seaConsMt / seaDays : null;

      legs.push({ legIndex: i, grade, seaConsMt, distanceNm, seaDays, mtPerDay });
    }
  }
  return legs;
}

// ── form component ─────────────────────────────────────────────────────────────

function RobForm({
  form,
  portCalls,
  onCancel,
  onSave,
  isSaving,
}: {
  form: RobFormState;
  portCalls: PortCall[];
  onCancel: () => void;
  onSave: (f: RobFormState) => void;
  isSaving: boolean;
}) {
  const [state, setState] = useState(form);

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        background: "rgba(56,189,248,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "0.75rem",
      }}
    >
      <div>
        <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
          Port Call
        </label>
        <select
          data-testid="port-call-select"
          value={state.port_call_id}
          onChange={(e) => setState((s) => ({ ...s, port_call_id: e.target.value }))}
          style={inp}
        >
          {portCalls.map((pc) => (
            <option key={pc.id} value={pc.id}>
              {pc.id.slice(0, 8)}…
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
          Fuel Grade
        </label>
        <select
          data-testid="fuel-grade-select"
          value={state.fuel_grade}
          onChange={(e) => setState((s) => ({ ...s, fuel_grade: e.target.value as FuelGrade }))}
          style={inp}
        >
          {FUEL_GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {(
        [
          { key: "rob_arrival_mt", label: "ROB Arrival (MT)", testid: "rob-arrival-input" },
          { key: "received_mt", label: "Received (MT)", testid: "received-input" },
          { key: "port_consumption_mt", label: "Port Cons (MT)", testid: "port-consumption-input" },
          { key: "rob_departure_mt", label: "ROB Departure (MT)", testid: "rob-departure-input" },
          { key: "sulphur_pct", label: "Sulphur %", testid: "sulphur-pct-input" },
          { key: "bdn_number", label: "BDN Number", testid: "bdn-number-input" },
        ] as const
      ).map(({ key, label, testid }) => (
        <div key={key}>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            {label}
          </label>
          <input
            data-testid={testid}
            type={key === "bdn_number" ? "text" : "number"}
            step="any"
            value={state[key]}
            onChange={(e) => setState((s) => ({ ...s, [key]: e.target.value }))}
            style={inp}
          />
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", gridColumn: "1/-1" }}>
        <button
          data-testid="save-rob-btn"
          type="button"
          onClick={() => onSave(state)}
          disabled={isSaving}
          style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "4px", padding: "0.35rem 0.85rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          data-testid="cancel-rob-btn"
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

export function BunkersPanel({ voyageId }: BunkersPanelProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRob, setEditingRob] = useState<BunkerRob | null>(null);

  const { data: portCalls = [], isLoading: pcLoading } = useQuery({
    queryKey: ["voyage", voyageId, "port-calls"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/port-calls", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch port calls");
      return (data ?? []) as PortCall[];
    },
  });

  const { data: voyage, isLoading: voyageLoading } = useQuery({
    queryKey: ["voyage", voyageId],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch voyage");
      return data;
    },
  });

  const { data: robs = [], isLoading: robsLoading } = useQuery({
    queryKey: ["voyage", voyageId, "bunker-robs"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/voyages/{voyage_id}/bunker-robs", {
        params: { path: { voyage_id: voyageId } },
      });
      if (!response.ok) throw new Error("Failed to fetch bunker ROBs");
      return (data ?? []) as BunkerRob[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId, "bunker-robs"] });
  };

  const createMutation = useMutation({
    mutationFn: async (form: RobFormState) => {
      const body: Record<string, unknown> = {
        port_call_id: form.port_call_id,
        fuel_grade: form.fuel_grade,
      };
      if (form.rob_arrival_mt) body["rob_arrival_mt"] = parseFloat(form.rob_arrival_mt);
      if (form.received_mt) body["received_mt"] = parseFloat(form.received_mt);
      if (form.port_consumption_mt) body["port_consumption_mt"] = parseFloat(form.port_consumption_mt);
      if (form.rob_departure_mt) body["rob_departure_mt"] = parseFloat(form.rob_departure_mt);
      if (form.sulphur_pct) body["sulphur_pct"] = parseFloat(form.sulphur_pct);
      if (form.bdn_number) body["bdn_number"] = form.bdn_number;

      const { response } = await apiClient.POST("/api/v1/voyages/{voyage_id}/bunker-robs", {
        params: { path: { voyage_id: voyageId } },
        body: body as Parameters<typeof apiClient.POST>[1]["body"],
      });
      if (!response.ok) throw new Error("Failed to create ROB");
    },
    onSuccess: () => {
      setShowForm(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: RobFormState }) => {
      const body: Record<string, unknown> = {};
      if (form.rob_arrival_mt) body["rob_arrival_mt"] = parseFloat(form.rob_arrival_mt);
      if (form.received_mt) body["received_mt"] = parseFloat(form.received_mt);
      if (form.port_consumption_mt) body["port_consumption_mt"] = parseFloat(form.port_consumption_mt);
      if (form.rob_departure_mt) body["rob_departure_mt"] = parseFloat(form.rob_departure_mt);
      if (form.sulphur_pct) body["sulphur_pct"] = parseFloat(form.sulphur_pct);
      if (form.bdn_number) body["bdn_number"] = form.bdn_number;

      const { response } = await apiClient.PATCH("/api/v1/bunker-robs/{rob_id}", {
        params: { path: { rob_id: id } },
        body: body as Parameters<typeof apiClient.PATCH>[1]["body"],
      });
      if (!response.ok) throw new Error("Failed to update ROB");
    },
    onSuccess: () => {
      setEditingRob(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (robId: string) => {
      const { response } = await apiClient.DELETE("/api/v1/bunker-robs/{rob_id}", {
        params: { path: { rob_id: robId } },
      });
      if (!response.ok) throw new Error("Failed to delete ROB");
    },
    onSuccess: invalidate,
  });

  // ── itinerary line map: id → line ─────────────────────────────────────────
  const ilineMap = new Map<string, ItineraryLine>();
  for (const il of (voyage?.itinerary_lines ?? [])) {
    ilineMap.set(il.id, il as ItineraryLine);
  }

  // ── sort port calls by itinerary sequence, then created_at ───────────────
  const sortedPcs = [...portCalls].sort((a, b) => {
    const seqA = a.itinerary_line_id ? (ilineMap.get(a.itinerary_line_id)?.sequence_no ?? Infinity) : Infinity;
    const seqB = b.itinerary_line_id ? (ilineMap.get(b.itinerary_line_id)?.sequence_no ?? Infinity) : Infinity;
    if (seqA !== seqB) return seqA - seqB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // ── derive sea legs ───────────────────────────────────────────────────────
  const seaLegs = deriveSeaLegs(sortedPcs, robs, ilineMap);

  // Index sea legs for lookup: `${legIndex}-${grade}` → SeaLeg
  const seaLegMap = new Map<string, SeaLeg>();
  for (const leg of seaLegs) {
    seaLegMap.set(`${leg.legIndex}-${leg.grade}`, leg);
  }

  // ── voyage summary ────────────────────────────────────────────────────────
  const gradeSummary = FUEL_GRADES.map((grade) => {
    const gradeRobs = robs.filter((r) => r.fuel_grade === grade);
    const gradeLegs = seaLegs.filter((l) => l.grade === grade);

    const sumField = (field: keyof BunkerRob) =>
      gradeRobs.reduce((acc, r) => {
        const val = r[field];
        return acc + (val ? parseFloat(val as string) : 0);
      }, 0);

    const totalArrival = sumField("rob_arrival_mt");
    const totalReceived = sumField("received_mt");
    const totalPortCons = sumField("port_consumption_mt");
    const totalDeparture = sumField("rob_departure_mt");
    const totalVariance = sumField("variance_mt");
    const totalSeaCons = gradeLegs.reduce((acc, l) => acc + l.seaConsMt, 0);

    return {
      grade, totalArrival, totalReceived, totalPortCons, totalDeparture, totalVariance,
      totalSeaCons, count: gradeRobs.length,
    };
  }).filter((s) => s.count > 0 || seaLegs.some((l) => l.grade === s.grade));

  const firstPortCallId = sortedPcs[0]?.id ?? "";

  if (pcLoading || robsLoading || voyageLoading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Loading…
      </div>
    );
  }

  if (portCalls.length === 0) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center" }}>
        No port calls on this voyage yet. Add port calls in the Itinerary tab first.
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Add ROB button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button
          data-testid="add-rob-btn"
          type="button"
          onClick={() => { setEditingRob(null); setShowForm(true); }}
          style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "6px", padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
        >
          + Add ROB Entry
        </button>
      </div>

      {/* Add form */}
      {showForm && !editingRob && (
        <RobForm
          form={EMPTY_FORM(firstPortCallId)}
          portCalls={sortedPcs}
          onCancel={() => setShowForm(false)}
          onSave={(form) => createMutation.mutate(form)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* ROB records table with sea-leg rows interspersed */}
      {robs.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Port Call ROB Records
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Grade</th>
                <th style={th}>Port Call</th>
                <th style={th}>ROB Arr (MT)</th>
                <th style={th}>Received (MT)</th>
                <th style={th}>Port Cons (MT)</th>
                <th style={th}>ROB Dep (MT)</th>
                <th style={th}>Calc Cons (MT)</th>
                <th style={th}>Variance (MT)</th>
                <th style={th}>Sea Cons (MT)</th>
                <th style={th}>Dist (nm)</th>
                <th style={th}>Days</th>
                <th style={th}>MT/Day</th>
                <th style={th}>BDN</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sortedPcs.map((pc, pcIdx) => {
                // Robs for this port call
                const pcRobs = robs.filter((r) => r.port_call_id === pc.id);
                // Sea legs after this port call (between pcIdx and pcIdx+1)
                const legsAfter = seaLegs.filter((l) => l.legIndex === pcIdx);

                return (
                  <React.Fragment key={pc.id}>
                    {/* Port call header row */}
                    <tr>
                      <td
                        colSpan={14}
                        style={{
                          ...td,
                          background: "rgba(255,255,255,0.02)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Port Call {pcIdx + 1} — {pc.id.slice(0, 8)}…
                      </td>
                    </tr>

                    {/* ROB rows for this port call */}
                    {pcRobs.map((rob) => {
                      const hasVariance = rob.variance_mt && parseFloat(rob.variance_mt) !== 0;
                      return (
                        <React.Fragment key={rob.id}>
                          <tr data-testid={`rob-row-${rob.id}`}>
                            <td style={{ ...td, fontWeight: 600, color: "#38bdf8" }}>{rob.fuel_grade}</td>
                            <td style={{ ...td, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                              {rob.port_call_id.slice(0, 8)}…
                            </td>
                            <td style={td}>{fmtMt(rob.rob_arrival_mt)}</td>
                            <td style={td}>{fmtMt(rob.received_mt)}</td>
                            <td style={td}>{fmtMt(rob.port_consumption_mt)}</td>
                            <td style={td}>{fmtMt(rob.rob_departure_mt)}</td>
                            <td style={td}>{fmtMt(rob.calculated_port_consumption_mt)}</td>
                            <td style={td}>
                              {rob.variance_mt ? (
                                <span>
                                  {fmtMt(rob.variance_mt)}
                                  {hasVariance && (
                                    <span
                                      data-testid={`variance-flag-${rob.id}`}
                                      style={{ marginLeft: "0.4rem", color: "#f59e0b", fontSize: "0.7rem", fontWeight: 700 }}
                                      title="Variance detected"
                                    >
                                      ▲
                                    </span>
                                  )}
                                </span>
                              ) : "—"}
                            </td>
                            {/* Sea cons N/A for port-call rows */}
                            <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                            <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                            <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                            <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                            <td style={{ ...td, fontSize: "0.78rem" }}>{rob.bdn_number ?? "—"}</td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: "0.35rem" }}>
                                <button
                                  data-testid={`edit-rob-btn-${rob.id}`}
                                  type="button"
                                  onClick={() => { setShowForm(false); setEditingRob(rob); }}
                                  style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "3px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", cursor: "pointer" }}
                                >
                                  Edit
                                </button>
                                <button
                                  data-testid={`delete-rob-btn-${rob.id}`}
                                  type="button"
                                  onClick={() => deleteMutation.mutate(rob.id)}
                                  disabled={deleteMutation.isPending}
                                  style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "3px", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.06)", color: "#f87171", cursor: "pointer" }}
                                >
                                  Del
                                </button>
                              </div>
                            </td>
                          </tr>
                          {editingRob?.id === rob.id && (
                            <tr>
                              <td colSpan={14} style={{ padding: 0 }}>
                                <RobForm
                                  form={{
                                    port_call_id: rob.port_call_id,
                                    fuel_grade: rob.fuel_grade as FuelGrade,
                                    rob_arrival_mt: rob.rob_arrival_mt ?? "",
                                    received_mt: rob.received_mt ?? "",
                                    port_consumption_mt: rob.port_consumption_mt ?? "",
                                    rob_departure_mt: rob.rob_departure_mt ?? "",
                                    sulphur_pct: rob.sulphur_pct ?? "",
                                    bdn_number: rob.bdn_number ?? "",
                                  }}
                                  portCalls={sortedPcs}
                                  onCancel={() => setEditingRob(null)}
                                  onSave={(form) => updateMutation.mutate({ id: rob.id, form })}
                                  isSaving={updateMutation.isPending}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Sea-leg rows after this port call (before next) */}
                    {legsAfter.map((leg) => (
                      <tr
                        key={`sea-${leg.legIndex}-${leg.grade}`}
                        data-testid={`sea-leg-row-${leg.legIndex}-${leg.grade}`}
                        style={{ background: "rgba(56,189,248,0.03)", fontStyle: "italic" }}
                      >
                        <td style={{ ...td, fontWeight: 600, color: "#38bdf8" }}>{leg.grade}</td>
                        <td style={{ ...td, fontSize: "0.7rem", color: "#64748b" }}>Sea Leg →</td>
                        {/* ROB Arr, Received, Port Cons, ROB Dep, Calc Cons, Variance: N/A for sea leg */}
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        {/* Sea Cons */}
                        <td style={{ ...td, fontWeight: 600, color: "#34d399" }}>
                          {fmtMt(leg.seaConsMt)}
                        </td>
                        {/* Distance */}
                        <td style={td}>
                          {leg.distanceNm !== null
                            ? leg.distanceNm.toLocaleString("en-US", { maximumFractionDigits: 0 })
                            : "—"}
                        </td>
                        {/* Days */}
                        <td style={td}>
                          {leg.seaDays !== null ? leg.seaDays.toFixed(1) : "—"}
                        </td>
                        {/* MT/Day */}
                        <td style={td}>
                          {leg.mtPerDay !== null ? leg.mtPerDay.toFixed(1) : "—"}
                        </td>
                        <td style={{ ...td, color: "var(--text-secondary)" }}>—</td>
                        <td style={td} />
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {robs.length === 0 && !showForm && (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px", marginBottom: "1.5rem" }}>
          No ROB entries yet. Click "+ Add ROB Entry" to record bunker quantities.
        </div>
      )}

      {/* Voyage bunker summary */}
      <div data-testid="voyage-bunker-summary">
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          Voyage Summary by Grade
        </div>
        {gradeSummary.length === 0 ? (
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>No data yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Grade</th>
                <th style={th}>Opening ROB</th>
                <th style={th}>Total Received</th>
                <th style={th}>Total Port Cons</th>
                <th style={th}>Total Sea Cons</th>
                <th style={th}>Closing ROB</th>
                <th style={th}>Total Variance</th>
              </tr>
            </thead>
            <tbody>
              {gradeSummary.map(({ grade, totalArrival, totalReceived, totalPortCons, totalDeparture, totalVariance, totalSeaCons }) => (
                <tr key={grade} data-testid={`summary-row-${grade}`}>
                  <td style={{ ...td, fontWeight: 600, color: "#38bdf8" }}>{grade}</td>
                  <td style={td}>{totalArrival > 0 ? fmtMt(totalArrival) : "—"}</td>
                  <td style={td}>{totalReceived > 0 ? fmtMt(totalReceived) : "—"}</td>
                  <td style={td}>{totalPortCons > 0 ? fmtMt(totalPortCons) : "—"}</td>
                  <td style={td} data-testid={`summary-sea-cons-${grade}`}>
                    {totalSeaCons !== 0
                      ? <span style={{ color: "#34d399", fontWeight: 600 }}>{fmtMt(totalSeaCons)}</span>
                      : "—"}
                  </td>
                  <td style={td}>{totalDeparture > 0 ? fmtMt(totalDeparture) : "—"}</td>
                  <td style={td}>
                    {totalVariance !== 0
                      ? <span style={{ color: "#f59e0b" }}>{fmtMt(totalVariance)}</span>
                      : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
