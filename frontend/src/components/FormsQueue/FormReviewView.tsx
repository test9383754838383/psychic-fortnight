import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useCurrentUser } from "../../auth/AuthContext";
import { FormStatusChip } from "./FormStatusChip";
import {
  LEGAL_TRANSITIONS,
  TERMINAL_STATUSES,
  ROLE_CAN_ACCEPT_REJECT,
} from "../../lib/formConstants";
import type { components } from "../../api/schema";

type FormReadDTO = components["schemas"]["FormReadDTO"];

interface FormReviewViewProps {
  formId: string;
  onTransition: (updated: FormReadDTO) => void;
}

function FieldsPanel({ rawFields }: { rawFields: Record<string, unknown> | null | undefined }) {
  if (!rawFields || Object.keys(rawFields).length === 0) {
    return <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No parsed fields.</div>;
  }
  return (
    <dl style={{ margin: 0 }}>
      {Object.entries(rawFields).map(([key, val]) => (
        <div key={key} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
          <dt style={{ fontWeight: 600, minWidth: "120px", color: "#d1d5db" }}>{key}</dt>
          <dd style={{ margin: 0, color: "#f9fafb" }}>{String(val)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FormReviewView({ formId, onTransition }: FormReviewViewProps) {
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null);

  const { data: form, isLoading } = useQuery<FormReadDTO>({
    queryKey: ["form", formId],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/forms/{form_id}", {
        params: { path: { form_id: formId } },
      });
      if (!response.ok || !data) throw new Error("Failed to fetch form");
      return data;
    },
  });

  useEffect(() => {
    if (form && notes === null) {
      setNotes(form.notes ?? "");
    }
  }, [form, notes]);

  const transitionMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data, response } = await apiClient.POST(
        "/api/v1/forms/{form_id}/transition",
        {
          params: { path: { form_id: formId } },
          body: { status },
        },
      );
      if (!response.ok || !data) throw new Error("Transition failed");
      return data;
    },
    onSuccess: (updated: FormReadDTO) => {
      void queryClient.invalidateQueries({ queryKey: ["form", formId] });
      void queryClient.invalidateQueries({ queryKey: ["forms"] });
      onTransition(updated);
    },
  });

  const patchMutation = useMutation({
    mutationFn: async (patch: components["schemas"]["FormUpdateDTO"]) => {
      const { data, response } = await apiClient.PATCH(
        "/api/v1/forms/{form_id}",
        {
          params: { path: { form_id: formId } },
          body: patch,
        },
      );
      if (!response.ok || !data) throw new Error("Patch failed");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["form", formId] });
    },
  });

  if (isLoading || !form) {
    return <div>Loading form…</div>;
  }

  const canAcceptReject =
    currentUser?.roles.some((r) => ROLE_CAN_ACCEPT_REJECT.has(r)) ?? false;
  const isTerminal = TERMINAL_STATUSES.has(form.status);
  const legalNext = isTerminal ? [] : (LEGAL_TRANSITIONS[form.status] ?? []);

  const visibleTransitions = legalNext.filter((t) => {
    if (t === "Accepted" || t === "Rejected") return canAcceptReject;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{form.form_type}</span>
        <span data-testid="form-status-chip">
          <FormStatusChip status={form.status} />
        </span>
        <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
          Received: {new Date(form.received_at).toLocaleString()}
        </span>
      </div>

      {form.parse_failed && (
        <div
          data-testid="parse-failed-banner"
          style={{
            padding: "0.75rem",
            backgroundColor: "rgba(245,158,11,0.15)",
            border: "1px solid #f59e0b",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          Parse failed — manual review required. Edit the raw fields below.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div
          data-testid="parsed-fields-panel"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "0.75rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>
            Parsed Fields
          </h4>
          <FieldsPanel rawFields={form.raw_fields} />
        </div>

        <div
          data-testid="raw-source-panel"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "0.75rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>
            Raw Source
          </h4>
          {form.raw_source_ref ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.8rem", fontFamily: "monospace", color: "#f9fafb" }}>
              {form.raw_source_ref}
            </pre>
          ) : (
            <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No source text.</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <label style={{ fontSize: "0.8rem" }} htmlFor="notes-input">
          Notes
        </label>
        <textarea
          id="notes-input"
          data-testid="notes-input"
          value={notes ?? form.notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const notesVal = notes ?? form.notes ?? "";
            if (notesVal !== (form.notes ?? "")) {
              patchMutation.mutate({ notes: notesVal });
            }
          }}
          rows={3}
          disabled={isTerminal}
          style={{ padding: "0.5rem", fontFamily: "inherit", fontSize: "0.875rem" }}
        />
      </div>

      {visibleTransitions.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {visibleTransitions.map((target) => (
            <button
              key={target}
              onClick={() => transitionMutation.mutate(target)}
              disabled={transitionMutation.isPending}
              style={{ padding: "0.35rem 0.85rem", fontSize: "0.875rem" }}
            >
              {target}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
