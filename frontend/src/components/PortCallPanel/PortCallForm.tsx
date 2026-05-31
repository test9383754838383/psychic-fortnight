import React, { useState } from "react";
import { format } from "date-fns";

import { components } from "../../api/schema";

interface PortCallFormProps {
  initialData?: components["schemas"]["PortCallResponseDTO"];
  port: { id: string; name: string; timezone_name: string };
  onSubmit: (data: components["schemas"]["PortCallUpdateDTO"]) => void;
  onCancel: () => void;
}

export const PortCallForm: React.FC<PortCallFormProps> = ({ initialData, port, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<components["schemas"]["PortCallUpdateDTO"]>({
    status: initialData?.status ?? "Planned",
    eta: initialData?.eta ? format(new Date(initialData.eta), "yyyy-MM-dd'T'HH:mm") : undefined,
    etd: initialData?.etd ? format(new Date(initialData.etd), "yyyy-MM-dd'T'HH:mm") : undefined,
    ata: initialData?.ata ? format(new Date(initialData.ata), "yyyy-MM-dd'T'HH:mm") : undefined,
    anchored_datetime: initialData?.anchored_datetime ? format(new Date(initialData.anchored_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    atb: initialData?.atb ? format(new Date(initialData.atb), "yyyy-MM-dd'T'HH:mm") : undefined,
    cargo_ops_started_datetime: initialData?.cargo_ops_started_datetime ? format(new Date(initialData.cargo_ops_started_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    cargo_ops_completed_datetime: initialData?.cargo_ops_completed_datetime ? format(new Date(initialData.cargo_ops_completed_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    atd: initialData?.atd ? format(new Date(initialData.atd), "yyyy-MM-dd'T'HH:mm") : undefined,
    nor_tendered_datetime: initialData?.nor_tendered_datetime ? format(new Date(initialData.nor_tendered_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    nor_accepted_datetime: initialData?.nor_accepted_datetime ? format(new Date(initialData.nor_accepted_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    free_pratique_granted: initialData?.free_pratique_granted ?? false,
    free_pratique_granted_datetime: initialData?.free_pratique_granted_datetime ? format(new Date(initialData.free_pratique_granted_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    customs_cleared: initialData?.customs_cleared ?? false,
    customs_cleared_datetime: initialData?.customs_cleared_datetime ? format(new Date(initialData.customs_cleared_datetime), "yyyy-MM-dd'T'HH:mm") : undefined,
    ops_notes: initialData?.ops_notes ?? undefined,
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checkbox = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checkbox.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = (): boolean => {
    const dateFields = [
      formData.ata,
      formData.anchored_datetime,
      formData.atb,
      formData.cargo_ops_started_datetime,
      formData.cargo_ops_completed_datetime,
      formData.atd,
    ].filter((d): d is string => !!d);

    const actuals = dateFields.map(d => new Date(d).getTime());

    for (let i = 0; i < actuals.length - 1; i++) {
      const current = actuals[i]!;
      const next = actuals[i + 1]!;
      if (current > next) {
        setError("Actual times must be monotonic (sequential).");
        return false;
      }
    }

    if (formData.nor_accepted_datetime && !formData.nor_tendered_datetime) {
      setError("NOR accepted requires tendered datetime.");
      return false;
    }
    if (formData.nor_accepted_datetime && formData.nor_tendered_datetime) {
      if (new Date(formData.nor_accepted_datetime).getTime() < new Date(formData.nor_tendered_datetime).getTime()) {
        setError("NOR accepted must be after or equal to tendered.");
        return false;
      }
    }

    if (formData.free_pratique_granted_datetime && !formData.free_pratique_granted) {
      setError("Free Pratique datetime requires 'Granted' flag.");
      return false;
    }
    if (formData.customs_cleared_datetime && !formData.customs_cleared) {
      setError("Customs Clearance datetime requires 'Cleared' flag.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const submissionData: components["schemas"]["PortCallUpdateDTO"] = { ...formData };
      
      (Object.keys(submissionData) as (keyof typeof submissionData)[]).forEach(key => {
        const val = submissionData[key];
        if (typeof val === "string" && val.includes("T")) {
          (submissionData[key] as string) = new Date(val).toISOString();
        }
      });
      onSubmit(submissionData);
    }
  };

  const TimezoneLabel: React.FC = () => (
    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
      ({port.timezone_name})
    </span>
  );

  const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: "2rem" }}>
      <h4 style={{ fontFamily: "var(--font-title)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
        {title}
      </h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {children}
      </div>
    </div>
  );

  const InputGroup: React.FC<{ label: string; name: keyof components["schemas"]["PortCallUpdateDTO"]; type?: string }> = ({ label, name, type = "datetime-local" }) => {
    const value = formData[name];
    
    return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label htmlFor={name} style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
        {label} {type === "datetime-local" && <TimezoneLabel />}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={type === "checkbox" ? undefined : (value as string | number | undefined) ?? ""}
        checked={type === "checkbox" ? !!value : undefined}
        onChange={handleChange}
        style={{
          padding: "0.5rem",
          borderRadius: "4px",
          border: "1px solid var(--border-subtle)",
          background: "rgba(255, 255, 255, 0.05)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h3 style={{ marginBottom: "1.5rem" }}>{initialData ? "Edit Port Call" : "Add Port Call"} - {port.name}</h3>

      {error && <div className="error-card" style={{ marginBottom: "1.5rem", padding: "1rem" }}>{error}</div>}

      <FormSection title="Planning">
        <InputGroup label="ETA" name="eta" />
        <InputGroup label="ETD" name="etd" />
      </FormSection>

      <FormSection title="Actuals">
        <InputGroup label="ATA (Pilot Station)" name="ata" />
        <InputGroup label="At Anchor" name="anchored_datetime" />
        <InputGroup label="ATB (Berthed)" name="atb" />
        <InputGroup label="Cargo Ops Started" name="cargo_ops_started_datetime" />
        <InputGroup label="Cargo Ops Completed" name="cargo_ops_completed_datetime" />
        <InputGroup label="ATD (Departed)" name="atd" />
      </FormSection>

      <FormSection title="NOR & Clearance">
        <InputGroup label="NOR Tendered" name="nor_tendered_datetime" />
        <InputGroup label="NOR Accepted" name="nor_accepted_datetime" />
        <div style={{ display: "flex", gap: "2rem", gridColumn: "span 2" }}>
          <InputGroup label="Free Pratique Granted" name="free_pratique_granted" type="checkbox" />
          <InputGroup label="Free Pratique Date" name="free_pratique_granted_datetime" />
        </div>
        <div style={{ display: "flex", gap: "2rem", gridColumn: "span 2" }}>
          <InputGroup label="Customs Cleared" name="customs_cleared" type="checkbox" />
          <InputGroup label="Customs Cleared Date" name="customs_cleared_datetime" />
        </div>
      </FormSection>

      <FormSection title="Agent">
         <div style={{ gridColumn: "span 2" }}>
           <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Agent selection via Downshift will be integrated here.</p>
         </div>
      </FormSection>

      <FormSection title="Notes">
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>Ops Notes</label>
          <textarea
            name="ops_notes"
            value={(formData.ops_notes!) ?? ""}
            onChange={handleChange}
            rows={4}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
            }}
          />
        </div>
      </FormSection>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Port Call</button>
      </div>
    </form>
  );
};
