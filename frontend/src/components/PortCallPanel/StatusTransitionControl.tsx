import React from "react";
import { components } from "../../api/schema";

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  "Planned": ["Arrived at Pilot Station", "At Anchor", "Berthed"],
  "Arrived at Pilot Station": ["At Anchor", "Berthed"],
  "At Anchor": ["Berthed"],
  "Berthed": ["Cargo Ops Completed", "Departed"],
  "Cargo Ops Completed": ["Departed"],
  "Departed": [],
};

interface StatusTransitionControlProps {
  portCall: components["schemas"]["PortCallResponseDTO"];
  onTransition: (toStatus: string) => void;
}

export const StatusTransitionControl: React.FC<StatusTransitionControlProps> = ({ portCall, onTransition }) => {
  const nextStates = LEGAL_TRANSITIONS[portCall.status] ?? [];

  if (nextStates.length === 0) {
    return (
      <div style={{ padding: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        Final status reached.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginRight: "0.5rem" }}>
        Transition to:
      </span>
      {nextStates.map((state) => (
        <button
          key={state}
          onClick={() => onTransition(state)}
          className="btn-secondary"
          style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", borderRadius: "12px" }}
        >
          {state}
        </button>
      ))}
    </div>
  );
};
