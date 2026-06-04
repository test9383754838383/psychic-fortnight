import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type BunkerRob = components["schemas"]["BunkerRobReadDTO"];
type PortCall = components["schemas"]["PortCallResponseDTO"];

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

function fmtMt(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

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
            <option key={g} value={g}>
              {g}
            </option>
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

  // Voyage summary: per grade totals
  const gradeSummary = FUEL_GRADES.map((grade) => {
    const gradeRobs = robs.filter((r) => r.fuel_grade === grade);
    const sumField = (field: keyof BunkerRob) =>
      gradeRobs.reduce((acc, r) => {
        const val = r[field];
        return acc + (val ? parseFloat(val as string) : 0);
      }, 0);

    const totalArrival = sumField("rob_arrival_mt");
    const totalReceived = sumField("received_mt");
    const totalPortCons = sumField("port_consumption_mt");
    const totalDeparture = sumField("rob_departure_mt");
    const totalCalcCons = sumField("calculated_port_consumption_mt");
    const totalVariance = sumField("variance_mt");

    return { grade, totalArrival, totalReceived, totalPortCons, totalDeparture, totalCalcCons, totalVariance, count: gradeRobs.length };
  }).filter((s) => s.count > 0);

  const firstPortCallId = portCalls[0]?.id ?? "";

  if (pcLoading || robsLoading) {
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
          portCalls={portCalls}
          onCancel={() => setShowForm(false)}
          onSave={(form) => createMutation.mutate(form)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* ROB records table */}
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
                <th style={th}>BDN</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {robs.map((rob) => {
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
                      <td style={{ ...td, fontSize: "0.78rem" }}>{rob.bdn_number ?? "—"}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            data-testid={`edit-rob-btn-${rob.id}`}
                            type="button"
                            onClick={() => {
                              setShowForm(false);
                              setEditingRob(rob);
                            }}
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
                        <td colSpan={10} style={{ padding: 0 }}>
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
                            portCalls={portCalls}
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
                <th style={th}>Closing ROB</th>
                <th style={th}>Total Variance</th>
              </tr>
            </thead>
            <tbody>
              {gradeSummary.map(({ grade, totalArrival, totalReceived, totalPortCons, totalDeparture, totalVariance }) => (
                <tr key={grade} data-testid={`summary-row-${grade}`}>
                  <td style={{ ...td, fontWeight: 600, color: "#38bdf8" }}>{grade}</td>
                  <td style={td}>{totalArrival > 0 ? totalArrival.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</td>
                  <td style={td}>{totalReceived > 0 ? totalReceived.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</td>
                  <td style={td}>{totalPortCons > 0 ? totalPortCons.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</td>
                  <td style={td}>{totalDeparture > 0 ? totalDeparture.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</td>
                  <td style={td}>
                    {totalVariance !== 0 ? (
                      <span style={{ color: "#f59e0b" }}>{totalVariance.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    ) : "0"}
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
