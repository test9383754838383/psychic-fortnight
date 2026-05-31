import { useState } from "react";
import { FormsQueue } from "../components/FormsQueue/FormsQueue";
import { FormReviewView } from "../components/FormsQueue/FormReviewView";
import { ParseBox } from "../components/FormsQueue/ParseBox";
import type { components } from "../api/schema";

type FormReadDTO = components["schemas"]["FormReadDTO"];

export function FormsPage() {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const handleParsed = (form: FormReadDTO) => {
    setSelectedFormId(form.id);
  };

  const handleTransition = () => {
    void 0;
  };

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <h2
        style={{
          fontFamily: "var(--font-title)",
          marginBottom: "1.5rem",
          fontSize: "1.5rem",
        }}
      >
        Forms Review Queue
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedFormId ? "1fr 1.5fr" : "1fr",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        <div className="glass-panel" style={{ padding: "1.25rem", maxWidth: "none" }}>
          <FormsQueue onSelect={setSelectedFormId} selectedId={selectedFormId} />
        </div>

        {selectedFormId ? (
          <div className="glass-panel" style={{ padding: "1.25rem", maxWidth: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Form Review</h3>
              <button
                onClick={() => setSelectedFormId(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.1rem" }}
                aria-label="Close review"
              >
                ✕
              </button>
            </div>
            <FormReviewView
              formId={selectedFormId}
              onTransition={handleTransition}
            />
            <hr style={{ margin: "1.25rem 0", borderColor: "#374151" }} />
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
              Parse New Form
            </h4>
            <ParseBox onParsed={handleParsed} />
          </div>
        ) : (
          <div />
        )}
      </div>

      {!selectedFormId && (
        <div
          className="glass-panel"
          style={{ padding: "1.25rem", maxWidth: "600px", marginTop: "2rem" }}
        >
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>
            Parse New Form
          </h3>
          <ParseBox onParsed={handleParsed} />
        </div>
      )}
    </div>
  );
}
