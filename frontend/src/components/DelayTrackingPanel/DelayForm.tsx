import React, { useState } from "react";
import { format } from "date-fns";
import type { components } from "../../api/schema";

const DELAY_TYPES = [
  "Weather",
  "Mechanical",
  "Port Congestion",
  "Awaiting Berth",
  "Awaiting Orders",
  "Cargo Operations",
  "Bunkering Delay",
  "Strike",
  "Deviation",
  "Piracy/Security",
  "Quarantine/Disease",
  "Other",
] satisfies readonly DelayType[];

const FAULT_ATTRIBUTIONS = [
  "Vessel",
  "Charterer",
  "Port",
  "Weather",
  "Force Majeure",
] satisfies readonly FaultAttributionType[];

type DelayType = components["schemas"]["DelayCreateBody"]["delay_type"];
type FaultAttributionType = components["schemas"]["DelayCreateBody"]["fault_attribution"];
type AnchorType = "voyage" | "port_call" | "leg_ref";

function toDelayType(value: string | undefined): DelayType {
  switch (value) {
    case "Weather":
    case "Mechanical":
    case "Port Congestion":
    case "Awaiting Berth":
    case "Awaiting Orders":
    case "Cargo Operations":
    case "Bunkering Delay":
    case "Strike":
    case "Deviation":
    case "Piracy/Security":
    case "Quarantine/Disease":
    case "Other":
      return value;
    default:
      return "Weather";
  }
}

function toFaultAttribution(value: string | undefined): FaultAttributionType {
  switch (value) {
    case "Vessel":
    case "Charterer":
    case "Port":
    case "Weather":
    case "Force Majeure":
      return value;
    default:
      return "Weather";
  }
}

function toAnchorType(value: string): AnchorType {
  switch (value) {
    case "port_call":
    case "leg_ref":
      return value;
    default:
      return "voyage";
  }
}

interface DelayFormProps {
  initialData?: components["schemas"]["DelayReadDTO"];
  portCalls: components["schemas"]["PortCallResponseDTO"][];
  onSubmit: (data: {
    delay_type: DelayType;
    fault_attribution: FaultAttributionType;
    start_datetime: string;
    description: string;
    end_datetime: string | null;
    claimed_duration: number | null;
    port_call_id: string | null;
    leg_ref: string | null;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function DelayForm({
  initialData,
  portCalls,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DelayFormProps) {
  const [delayType, setDelayType] = useState<DelayType>(toDelayType(initialData?.delay_type));
  const [faultAttribution, setFaultAttribution] = useState<FaultAttributionType>(
    toFaultAttribution(initialData?.fault_attribution)
  );
  const [startDatetime, setStartDatetime] = useState<string>(
    initialData?.start_datetime
      ? format(new Date(initialData.start_datetime), "yyyy-MM-dd'T'HH:mm")
      : ""
  );
  const [endDatetime, setEndDatetime] = useState<string>(
    initialData?.end_datetime
      ? format(new Date(initialData.end_datetime), "yyyy-MM-dd'T'HH:mm")
      : ""
  );
  const [claimedDuration, setClaimedDuration] = useState<string>(
    initialData?.claimed_duration !== undefined && initialData?.claimed_duration !== null
      ? String(initialData.claimed_duration)
      : ""
  );
  const [description, setDescription] = useState<string>(initialData?.description ?? "");

  // Derive initial anchor type
  const getInitialAnchorType = (): AnchorType => {
    if (initialData?.port_call_id) return "port_call";
    if (initialData?.leg_ref) return "leg_ref";
    return "voyage";
  };

  const [anchorType, setAnchorType] = useState<AnchorType>(getInitialAnchorType());
  const [portCallId, setPortCallId] = useState<string>(
    initialData?.port_call_id ?? portCalls[0]?.id ?? ""
  );
  const [legRef, setLegRef] = useState<string>(initialData?.leg_ref ?? "");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDatetime) {
      setError("Start Datetime is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (endDatetime && new Date(endDatetime) < new Date(startDatetime)) {
      setError("End Datetime cannot be before Start Datetime.");
      return;
    }

    const payload = {
      delay_type: delayType,
      fault_attribution: faultAttribution,
      start_datetime: new Date(startDatetime).toISOString(),
      description: description.trim(),
      end_datetime: endDatetime ? new Date(endDatetime).toISOString() : null,
      claimed_duration: claimedDuration ? parseFloat(claimedDuration) : null,
      port_call_id: anchorType === "port_call" && portCallId ? portCallId : null,
      leg_ref: anchorType === "leg_ref" && legRef.trim() ? legRef.trim() : null,
    };

    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="delay-form"
      aria-label={initialData ? "Edit Delay" : "Record New Delay"}
    >
      <h3 style={{ fontFamily: "var(--font-title)", marginBottom: "1.5rem" }}>
        {initialData ? "Edit Delay" : "Record New Delay"}
      </h3>

      {error && (
        <div className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label htmlFor="delay-type">Delay Type</label>
          <select
            id="delay-type"
            value={delayType}
            onChange={(e) => setDelayType(toDelayType(e.target.value))}
          >
            {DELAY_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {dt}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="fault-attribution">Fault Attribution</label>
          <select
            id="fault-attribution"
            value={faultAttribution}
            onChange={(e) => setFaultAttribution(toFaultAttribution(e.target.value))}
          >
            {FAULT_ATTRIBUTIONS.map((fa) => (
              <option key={fa} value={fa}>
                {fa}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="start-datetime">Start Datetime</label>
          <input
            id="start-datetime"
            type="datetime-local"
            value={startDatetime}
            onChange={(e) => setStartDatetime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-datetime">End Datetime (Optional)</label>
          <input
            id="end-datetime"
            type="datetime-local"
            value={endDatetime}
            onChange={(e) => setEndDatetime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="claimed-duration">Claimed Duration (Hours, Optional)</label>
          <input
            id="claimed-duration"
            type="number"
            step="0.01"
            min="0"
            value={claimedDuration}
            onChange={(e) => setClaimedDuration(e.target.value)}
            placeholder="e.g. 2.50"
          />
        </div>

        <div className="form-group">
          <label htmlFor="anchor-type">Anchor Location</label>
          <select
            id="anchor-type"
            value={anchorType}
            onChange={(e) => setAnchorType(toAnchorType(e.target.value))}
          >
            <option value="voyage">Voyage Level</option>
            <option value="port_call">Port Call</option>
            <option value="leg_ref">Sea Passage Leg</option>
          </select>
        </div>
      </div>

      {anchorType === "port_call" && (
        <div className="form-group animate-fade-in" style={{ marginTop: "1rem" }}>
          <label htmlFor="port-call-select">Port Call</label>
          <select
            id="port-call-select"
            value={portCallId}
            onChange={(e) => setPortCallId(e.target.value)}
          >
            {portCalls.length === 0 ? (
              <option value="">No port calls available</option>
            ) : (
              portCalls.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  {pc.port_id} ({pc.status})
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {anchorType === "leg_ref" && (
        <div className="form-group animate-fade-in" style={{ marginTop: "1rem" }}>
          <label htmlFor="leg-ref-input">Leg Reference</label>
          <input
            id="leg-ref-input"
            type="text"
            value={legRef}
            onChange={(e) => setLegRef(e.target.value)}
            placeholder="e.g. NLRTM-USNYC-01"
          />
        </div>
      )}

      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Details of the delay event..."
          rows={3}
          required
        />
      </div>

      <div className="form-actions" style={{ marginTop: "1.5rem" }}>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Delay"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
