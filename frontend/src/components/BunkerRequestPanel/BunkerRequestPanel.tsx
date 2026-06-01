import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type BunkerRequest = components["schemas"]["BunkerRequestReadDTO"];
type FuelType = components["schemas"]["BunkerRequestCreateBody"]["fuel_type"];

const FUEL_TYPES: FuelType[] = ["HFO", "VLSFO", "MGO", "LSMGO", "HSFO", "ULSD", "LNG", "Biofuel"];

const FSM_FORWARD: Record<string, string | undefined> = {
  Raised: "In Progress",
  "In Progress": "Stemmed",
  Stemmed: "Supplied",
};

const STATUS_CHIP_CLASS: Record<string, string> = {
  Raised: "status-chip--pending",
  "In Progress": "status-chip--in-progress",
  Stemmed: "status-chip--stemmed",
  Blocked: "status-chip--blocked",
  Supplied: "status-chip--supplied",
};

interface BunkerRequestPanelProps {
  voyageId: string;
}

interface CreateFormValues {
  fuel_type: FuelType;
  quantity_required_mt: string;
  specification_grade: string;
  max_sulphur_content: string;
  port_call_id: string;
  supplier_id: string;
  eta_supply: string;
}

const DEFAULT_FORM: CreateFormValues = {
  fuel_type: "HFO",
  quantity_required_mt: "",
  specification_grade: "",
  max_sulphur_content: "",
  port_call_id: "",
  supplier_id: "",
  eta_supply: "",
};

interface TransitionControlsProps {
  request: BunkerRequest;
  voyageId: string;
}

function TransitionControls({ request, voyageId }: TransitionControlsProps) {
  const queryClient = useQueryClient();
  const [showBlockedForm, setShowBlockedForm] = useState(false);
  const [blockerNote, setBlockerNote] = useState("");

  const transition = useMutation({
    mutationFn: async (body: components["schemas"]["BunkerRequestTransitionBody"]) => {
      const { response } = await apiClient.POST(
        "/api/v1/bunker-requests/{bunker_request_id}/transition",
        {
          params: { path: { bunker_request_id: request.id } },
          body,
        }
      );
      if (!response.ok) throw new Error("Transition failed");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["voyage", voyageId, "bunker-requests"],
      });
      setShowBlockedForm(false);
      setBlockerNote("");
    },
  });

  if (request.status === "Supplied") {
    return null;
  }

  const forwardTarget = FSM_FORWARD[request.status];

  return (
    <div className="bunker-transition-controls">
      {forwardTarget && (
        <button
          className="btn-primary btn-sm"
          onClick={() => transition.mutate({ status: forwardTarget })}
          disabled={transition.isPending}
          aria-label={forwardTarget}
        >
          {transition.isPending ? "Saving…" : forwardTarget}
        </button>
      )}

      {request.status !== "Blocked" && (
        <button
          className="btn-sm btn-blocked-toggle"
          onClick={() => setShowBlockedForm((v) => !v)}
          disabled={transition.isPending}
          aria-label="Blocked"
        >
          Blocked
        </button>
      )}

      {showBlockedForm && (
        <div className="bunker-blocked-form">
          <label htmlFor={`blocker-note-${request.id}`} className="form-label">
            Blocker Note
          </label>
          <textarea
            id={`blocker-note-${request.id}`}
            className="form-textarea"
            value={blockerNote}
            onChange={(e) => setBlockerNote(e.target.value)}
            rows={2}
            aria-label="Blocker Note"
          />
          <button
            className="btn-primary btn-sm"
            onClick={() =>
              transition.mutate({ status: "Blocked", blocker_note: blockerNote })
            }
            disabled={!blockerNote.trim() || transition.isPending}
            aria-label="Confirm Block"
          >
            Confirm Block
          </button>
        </div>
      )}

      {request.status === "Blocked" && request.blocker_note && (
        <div className="bunker-blocker-note">
          <span className="blocker-label">Blocker:</span> {request.blocker_note}
        </div>
      )}
    </div>
  );
}

interface CreateFormProps {
  voyageId: string;
  onClose: () => void;
}

function CreateForm({ voyageId, onClose }: CreateFormProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CreateFormValues>(DEFAULT_FORM);

  const create = useMutation({
    mutationFn: async () => {
      const body: components["schemas"]["BunkerRequestCreateBody"] = {
        fuel_type: values.fuel_type,
        quantity_required_mt: parseFloat(values.quantity_required_mt),
        specification_grade: values.specification_grade || null,
        max_sulphur_content: values.max_sulphur_content
          ? parseFloat(values.max_sulphur_content)
          : null,
        port_call_id: values.port_call_id || null,
        supplier_id: values.supplier_id || null,
        eta_supply: values.eta_supply || null,
      };
      const { response } = await apiClient.POST(
        "/api/v1/voyages/{voyage_id}/bunker-requests",
        {
          params: { path: { voyage_id: voyageId } },
          body,
        }
      );
      if (!response.ok) throw new Error("Failed to create bunker request");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["voyage", voyageId, "bunker-requests"],
      });
      onClose();
    },
  });

  function field(name: keyof CreateFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value }));
  }

  const canSubmit =
    values.fuel_type.length > 0 &&
    values.quantity_required_mt !== "" &&
    !isNaN(parseFloat(values.quantity_required_mt)) &&
    parseFloat(values.quantity_required_mt) > 0;

  return (
    <div className="bunker-create-form glass-panel" style={{ padding: "1.25rem", marginTop: "1rem" }}>
      <h4 className="panel-heading" style={{ marginBottom: "1rem", fontSize: "1rem" }}>
        New Bunker Request
      </h4>

      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="form-field">
          <label htmlFor="br-fuel-type" className="form-label">
            Fuel Type
          </label>
          <select
            id="br-fuel-type"
            className="form-select"
            value={values.fuel_type}
            onChange={field("fuel_type")}
            aria-label="Fuel Type"
          >
            {FUEL_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="br-quantity" className="form-label">
            Quantity (mt)
          </label>
          <input
            id="br-quantity"
            type="number"
            className="form-input"
            value={values.quantity_required_mt}
            onChange={field("quantity_required_mt")}
            min={0}
            step="any"
            aria-label="Quantity (mt)"
          />
        </div>

        <div className="form-field">
          <label htmlFor="br-grade" className="form-label">
            Specification Grade (optional)
          </label>
          <input
            id="br-grade"
            type="text"
            className="form-input"
            value={values.specification_grade}
            onChange={field("specification_grade")}
            placeholder="e.g. ISO 8217 RMG 380"
          />
        </div>

        <div className="form-field">
          <label htmlFor="br-sulphur" className="form-label">
            Max Sulphur % (optional)
          </label>
          <input
            id="br-sulphur"
            type="number"
            className="form-input"
            value={values.max_sulphur_content}
            onChange={field("max_sulphur_content")}
            min={0}
            step="any"
          />
        </div>

        <div className="form-field">
          <label htmlFor="br-port-call" className="form-label">
            Port Call ID (optional)
          </label>
          <input
            id="br-port-call"
            type="text"
            className="form-input"
            value={values.port_call_id}
            onChange={field("port_call_id")}
            placeholder="UUID"
          />
        </div>

        <div className="form-field">
          <label htmlFor="br-supplier" className="form-label">
            Supplier ID (optional)
          </label>
          <input
            id="br-supplier"
            type="text"
            className="form-input"
            value={values.supplier_id}
            onChange={field("supplier_id")}
            placeholder="UUID"
          />
        </div>

        <div className="form-field">
          <label htmlFor="br-eta" className="form-label">
            ETA Supply (optional)
          </label>
          <input
            id="br-eta"
            type="datetime-local"
            className="form-input"
            value={values.eta_supply}
            onChange={field("eta_supply")}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button
          className="btn-primary btn-sm"
          onClick={() => create.mutate()}
          disabled={!canSubmit || create.isPending}
          aria-label="Submit"
        >
          {create.isPending ? "Submitting…" : "Submit"}
        </button>
        <button
          className="btn-sm btn-secondary"
          onClick={onClose}
          disabled={create.isPending}
        >
          Cancel
        </button>
      </div>

      {create.isError && (
        <div className="form-error" style={{ marginTop: "0.5rem" }}>
          {create.error?.message}
        </div>
      )}
    </div>
  );
}

export function BunkerRequestPanel({ voyageId }: BunkerRequestPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["voyage", voyageId, "bunker-requests"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/voyages/{voyage_id}/bunker-requests",
        { params: { path: { voyage_id: voyageId } } }
      );
      if (!response.ok) throw new Error("Failed to fetch bunker requests");
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <section
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="loading-text">Loading bunker requests…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="form-error">Error: {error.message}</div>
      </section>
    );
  }

  return (
    <section
      className="event-log-panel glass-panel"
      style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem", marginTop: "2rem" }}
    >
      <div
        className="panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}
      >
        <h3
          className="panel-heading"
          style={{ fontFamily: "var(--font-title)", fontSize: "1.25rem", margin: 0 }}
        >
          Bunker Requests
        </h3>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowCreateForm((v) => !v)}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
          aria-label="New Request"
        >
          {showCreateForm ? "Close" : "New Request"}
        </button>
      </div>

      {showCreateForm && (
        <CreateForm
          voyageId={voyageId}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {requests.length === 0 && !showCreateForm ? (
        <div
          className="empty-state"
          style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem 0" }}
        >
          No bunker requests for this voyage.
        </div>
      ) : (
        <div className="bunker-requests-list" style={{ marginTop: "1rem" }}>
          {requests.map((req) => (
            <div
              key={req.id}
              className="bunker-request-card"
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
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span className="bunker-fuel-type" style={{ fontWeight: 600, fontSize: "1rem" }}>
                    {req.fuel_type}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {req.quantity_required_mt} mt
                  </span>
                  {req.supplier_id && (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Supplier: {req.supplier_id}
                    </span>
                  )}
                  {req.eta_supply && (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      ETA: {format(new Date(req.eta_supply), "yyyy-MM-dd HH:mm")}
                    </span>
                  )}
                </div>
                <span className={`status-chip ${STATUS_CHIP_CLASS[req.status] ?? ""}`}>
                  {req.status}
                </span>
              </div>

              {req.specification_grade && (
                <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Grade: {req.specification_grade}
                  {req.max_sulphur_content !== null && req.max_sulphur_content !== undefined
                    ? ` · S ≤ ${req.max_sulphur_content}%`
                    : ""}
                </div>
              )}

              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-tertiary, var(--text-secondary))" }}>
                Raised: {format(new Date(req.raised_at), "yyyy-MM-dd HH:mm")}
              </div>

              <TransitionControls request={req} voyageId={voyageId} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
