import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type Cargo = components["schemas"]["CargoResponseDTO"];
type Port = components["schemas"]["PortResponseDTO"];

const COMMODITIES = [
  "Crude Oil",
  "Fuel Oil",
  "Gasoil",
  "Naphtha",
  "Grain",
  "Coal",
  "Iron Ore",
  "Containers",
  "Other",
] as const;

const UNITS = ["MT", "BBL", "CBM"] as const;

const COMMODITY_COLORS: Record<string, string> = {
  "Crude Oil": "#f97316",
  "Fuel Oil": "#fb923c",
  "Gasoil": "#fbbf24",
  "Naphtha": "#a3e635",
  "Grain": "#86efac",
  "Coal": "#94a3b8",
  "Iron Ore": "#a78bfa",
  "Containers": "#38bdf8",
  "Other": "#64748b",
};

interface CargoFormState {
  commodity: string;
  quantity: string;
  unit: string;
  load_port_ref: string;
  discharge_port_ref: string;
  notes: string;
}

const EMPTY_FORM: CargoFormState = {
  commodity: "Crude Oil",
  quantity: "",
  unit: "MT",
  load_port_ref: "",
  discharge_port_ref: "",
  notes: "",
};

interface CargoesPanelProps {
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
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  marginBottom: "0.2rem",
  display: "block",
};

export function CargoesPanel({ voyageId }: CargoesPanelProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CargoFormState>(EMPTY_FORM);

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

  const { data: cargoes, refetch } = useQuery({
    queryKey: ["cargoes", voyageId],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/voyages/{voyage_id}/cargoes",
        { params: { path: { voyage_id: voyageId } } }
      );
      if (!response.ok) throw new Error("Failed");
      return (data ?? []) as Cargo[];
    },
  });

  const addCargo = useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.POST(
        "/api/v1/voyages/{voyage_id}/cargoes",
        {
          params: { path: { voyage_id: voyageId } },
          body: {
            commodity: form.commodity,
            quantity: parseFloat(form.quantity),
            unit: form.unit,
            load_port_ref: form.load_port_ref || undefined,
            discharge_port_ref: form.discharge_port_ref || undefined,
            notes: form.notes || undefined,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to add cargo");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cargoes", voyageId] });
      setShowAddForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateCargo = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { response } = await apiClient.PATCH(
        "/api/v1/cargoes/{cargo_id}",
        {
          params: { path: { cargo_id: editingId } },
          body: {
            commodity: form.commodity,
            quantity: parseFloat(form.quantity),
            unit: form.unit,
            load_port_ref: form.load_port_ref || undefined,
            discharge_port_ref: form.discharge_port_ref || undefined,
            notes: form.notes || undefined,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to update cargo");
    },
    onSuccess: async () => {
      await refetch();
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteCargo = useMutation({
    mutationFn: async (cargoId: string) => {
      const { response } = await apiClient.DELETE(
        "/api/v1/cargoes/{cargo_id}",
        { params: { path: { cargo_id: cargoId } } }
      );
      if (!response.ok) throw new Error("Failed");
    },
    onSuccess: async () => {
      await refetch();
    },
  });

  function startEdit(cargo: Cargo) {
    setEditingId(cargo.id);
    setShowAddForm(false);
    setForm({
      commodity: cargo.commodity,
      quantity: String(cargo.quantity),
      unit: cargo.unit,
      load_port_ref: cargo.load_port_ref ?? "",
      discharge_port_ref: cargo.discharge_port_ref ?? "",
      notes: cargo.notes ?? "",
    });
  }

  function cancelForm() {
    setEditingId(null);
    setShowAddForm(false);
    setForm(EMPTY_FORM);
  }

  const isFormValid = form.commodity && form.quantity && parseFloat(form.quantity) > 0;

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  };

  const formCard: React.CSSProperties = {
    background: "rgba(56,189,248,0.04)",
    border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: "8px",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  function CargoForm({ isEdit }: { isEdit: boolean }) {
    return (
      <div style={formCard}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {isEdit ? "Edit Cargo" : "Add Cargo"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={lbl}>Commodity</label>
            <select
              data-testid="commodity-select"
              value={form.commodity}
              onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))}
              style={inp}
            >
              {COMMODITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Quantity</label>
            <input
              data-testid="quantity-input"
              type="number"
              step="0.001"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. 25000"
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Unit</label>
            <select
              data-testid="unit-select"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              style={inp}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={lbl}>Load Port</label>
            <select
              data-testid="load-port-select"
              value={form.load_port_ref}
              onChange={(e) => setForm((f) => ({ ...f, load_port_ref: e.target.value }))}
              style={inp}
            >
              <option value="">— none —</option>
              {(ports ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unlocode})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Discharge Port</label>
            <select
              data-testid="discharge-port-select"
              value={form.discharge_port_ref}
              onChange={(e) => setForm((f) => ({ ...f, discharge_port_ref: e.target.value }))}
              style={inp}
            >
              <option value="">— none —</option>
              {(ports ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unlocode})</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <input
            data-testid="cargo-notes-input"
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
            style={inp}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            data-testid="save-cargo-btn"
            type="button"
            onClick={() => isEdit ? updateCargo.mutate() : addCargo.mutate()}
            disabled={!isFormValid || addCargo.isPending || updateCargo.isPending}
            style={{
              background: isFormValid ? "#38bdf8" : "rgba(255,255,255,0.1)",
              color: isFormValid ? "#0d1017" : "var(--text-secondary)",
              border: "none",
              borderRadius: "6px",
              padding: "0.4rem 1rem",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: isFormValid ? "pointer" : "not-allowed",
            }}
          >
            {addCargo.isPending || updateCargo.isPending ? "Saving…" : isEdit ? "Update" : "Add Cargo"}
          </button>
          <button
            data-testid="cancel-cargo-btn"
            type="button"
            onClick={cancelForm}
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
          {(addCargo.isError || updateCargo.isError) && (
            <span style={{ fontSize: "0.78rem", color: "#f87171" }}>Failed to save.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Cargo list */}
      {(cargoes ?? []).length === 0 && !showAddForm && (
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            padding: "2rem",
            textAlign: "center",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "8px",
          }}
        >
          No cargoes added yet.
        </div>
      )}

      {(cargoes ?? []).map((cargo) => (
        editingId === cargo.id ? (
          <CargoForm key={cargo.id} isEdit />
        ) : (
          <div key={cargo.id} data-testid={`cargo-card-${cargo.id}`} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: COMMODITY_COLORS[cargo.commodity] ?? "#64748b",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {cargo.commodity.toUpperCase()} — {Number(cargo.quantity).toLocaleString()} {cargo.unit}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "1.25rem" }}>
                  {cargo.load_port_ref
                    ? (portMap[cargo.load_port_ref]?.name ?? cargo.load_port_ref.slice(0, 8) + "…")
                    : "—"}
                  {" → "}
                  {cargo.discharge_port_ref
                    ? (portMap[cargo.discharge_port_ref]?.name ?? cargo.discharge_port_ref.slice(0, 8) + "…")
                    : "—"}
                </div>
                {cargo.notes && (
                  <div style={{ fontSize: "0.75rem", color: "#64748b", paddingLeft: "1.25rem", marginTop: "0.2rem" }}>
                    {cargo.notes}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                <button
                  data-testid={`edit-cargo-btn-${cargo.id}`}
                  type="button"
                  onClick={() => startEdit(cargo)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--text-secondary)",
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  data-testid={`delete-cargo-btn-${cargo.id}`}
                  type="button"
                  onClick={() => deleteCargo.mutate(cargo.id)}
                  disabled={deleteCargo.isPending}
                  style={{
                    background: "none",
                    border: "1px solid rgba(248,113,113,0.3)",
                    color: "#f87171",
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      ))}

      {/* Add form at bottom */}
      {showAddForm && !editingId && <CargoForm isEdit={false} />}

      {/* Add cargo button */}
      {!showAddForm && !editingId && (
        <button
          data-testid="add-cargo-btn"
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "1px dashed rgba(56,189,248,0.4)",
            color: "#38bdf8",
            borderRadius: "6px",
            padding: "0.4rem 1rem",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          + Add Cargo
        </button>
      )}
    </div>
  );
}
