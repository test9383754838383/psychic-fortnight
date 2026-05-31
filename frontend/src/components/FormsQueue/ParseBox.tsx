import { useState } from "react";
import { apiClient } from "../../api/client";
import { FORM_TYPES } from "../../lib/formConstants";
import type { components } from "../../api/schema";

type FormReadDTO = components["schemas"]["FormReadDTO"];

interface ParseBoxProps {
  onParsed: (form: FormReadDTO) => void;
  defaultFormType?: string;
  defaultVoyageId?: string;
  defaultPortCallId?: string;
}

export function ParseBox({
  onParsed,
  defaultFormType = "",
  defaultVoyageId = "",
  defaultPortCallId = "",
}: ParseBoxProps) {
  const [rawText, setRawText] = useState("");
  const [formType, setFormType] = useState(defaultFormType);
  const [voyageId, setVoyageId] = useState(defaultVoyageId);
  const [portCallId, setPortCallId] = useState(defaultPortCallId);
  const [isParsing, setIsParsing] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = async () => {
    setParseFailed(false);
    setParseError(null);
    setIsParsing(true);

    try {
      const body: components["schemas"]["ParseRequestDTO"] = {
        raw_text: rawText,
        form_type: formType as components["schemas"]["ParseRequestDTO"]["form_type"],
        voyage_id: voyageId || null,
        port_call_id: portCallId || null,
      };

      const { data, response } = await apiClient.POST("/api/v1/forms/parse", {
        body,
      });

      if (!response.ok || !data) {
        setParseError("Parse request failed.");
        return;
      }

      if (data.parse_failed) {
        setParseFailed(true);
      }

      onParsed(data);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <label
          htmlFor="parse-raw-text"
          style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem" }}
        >
          Raw Text
        </label>
        <textarea
          id="parse-raw-text"
          aria-label="Raw text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={6}
          style={{ width: "100%", padding: "0.5rem", fontFamily: "monospace", fontSize: "0.8rem", boxSizing: "border-box" }}
          placeholder="Paste email body here…"
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", flex: 1, minWidth: "120px" }}>
          <span>Form Type</span>
          <select
            aria-label="Form type"
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            style={{ marginTop: "0.2rem", padding: "0.35rem" }}
          >
            <option value="">Select…</option>
            {FORM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", flex: 1, minWidth: "140px" }}>
          <span>Voyage ID</span>
          <input
            aria-label="Voyage ID"
            type="text"
            value={voyageId}
            onChange={(e) => setVoyageId(e.target.value)}
            style={{ marginTop: "0.2rem", padding: "0.35rem" }}
            placeholder="UUID or blank"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", flex: 1, minWidth: "140px" }}>
          <span>Port Call ID</span>
          <input
            aria-label="Port Call ID"
            type="text"
            value={portCallId}
            onChange={(e) => setPortCallId(e.target.value)}
            style={{ marginTop: "0.2rem", padding: "0.35rem" }}
            placeholder="UUID or blank"
          />
        </label>
      </div>

      <button
        onClick={() => void handleParse()}
        disabled={isParsing || !rawText || !formType}
        style={{ alignSelf: "flex-start", padding: "0.4rem 1rem" }}
      >
        {isParsing ? "Parsing…" : "Parse"}
      </button>

      {parseFailed && (
        <div
          data-testid="parse-failed-warning"
          style={{
            padding: "0.75rem",
            backgroundColor: "rgba(245,158,11,0.15)",
            border: "1px solid #f59e0b",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          Parse failed — form created for manual review.
        </div>
      )}

      {parseError && (
        <div
          data-testid="parse-error"
          style={{
            padding: "0.75rem",
            backgroundColor: "rgba(239,68,68,0.15)",
            border: "1px solid #ef4444",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          Error: {parseError}
        </div>
      )}
    </div>
  );
}
