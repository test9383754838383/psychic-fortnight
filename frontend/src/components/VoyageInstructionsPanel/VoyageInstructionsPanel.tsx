import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type Instruction = components["schemas"]["VoyageInstructionReadDTO"];
type Template = components["schemas"]["InstructionTemplateReadDTO"];

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  approved: "#34d399",
  sent: "#38bdf8",
};

interface VoyageInstructionsPanelProps {
  voyageId: string;
}

const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  color: "var(--text-primary)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  padding: "0.35rem 0.5rem",
  fontSize: "0.82rem",
  width: "100%",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  color: "var(--text-secondary)",
  marginBottom: "0.25rem",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        borderRadius: "999px",
        fontSize: "0.65rem",
        fontWeight: 700,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

// ── Rich-text editor (contenteditable) ────────────────────────────────────────

interface RichEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
}

function RichEditor({ initialHtml, onChange }: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialHtml) {
      ref.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    background: active ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "3px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "0.15rem 0.45rem",
    minWidth: "26px",
  });

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          flexWrap: "wrap",
          padding: "0.35rem 0.5rem",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
        }}
      >
        {[
          { label: "B", cmd: "bold", style: { fontWeight: 700 } },
          { label: "I", cmd: "italic", style: { fontStyle: "italic" } },
          { label: "U", cmd: "underline", style: { textDecoration: "underline" } },
        ].map(({ label, cmd, style }) => (
          <button key={cmd} type="button" style={{ ...btnStyle(), ...style }} onMouseDown={(e) => { e.preventDefault(); execCmd(cmd); }}>
            {label}
          </button>
        ))}
        <span style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", margin: "0 0.15rem" }} />
        {[
          { label: "H1", cmd: "formatBlock", val: "h1" },
          { label: "H2", cmd: "formatBlock", val: "h2" },
          { label: "H3", cmd: "formatBlock", val: "h3" },
          { label: "¶", cmd: "formatBlock", val: "p" },
        ].map(({ label, cmd, val }) => (
          <button key={val} type="button" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, val); }}>
            {label}
          </button>
        ))}
        <span style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", margin: "0 0.15rem" }} />
        {[
          { label: "• List", cmd: "insertUnorderedList" },
          { label: "1. List", cmd: "insertOrderedList" },
        ].map(({ label, cmd }) => (
          <button key={cmd} type="button" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); execCmd(cmd); }}>
            {label}
          </button>
        ))}
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        data-testid="rich-text-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        style={{
          minHeight: "200px",
          padding: "0.75rem",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0 0 4px 4px",
          fontSize: "0.85rem",
          lineHeight: 1.6,
          outline: "none",
          background: "rgba(255,255,255,0.02)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({
  templates,
  voyageId,
  onSaved,
  onCancel,
}: {
  templates: Template[];
  voyageId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const body: Record<string, unknown> = { title };
    if (templateId) {
      body["template_id"] = templateId;
    }
    await apiClient.POST("/api/v1/voyages/{voyage_id}/instructions", {
      params: { path: { voyage_id: voyageId } },
      body: body as Parameters<typeof apiClient.POST>[1]["body"],
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        background: "rgba(56,189,248,0.04)",
        border: "1px solid rgba(56,189,248,0.15)",
        borderRadius: "8px",
        marginBottom: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={lbl}>Title</label>
          <input
            data-testid="instruction-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Voyage Orders — V001"
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Start from template (optional)</label>
          <select
            data-testid="template-select"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            style={inp}
          >
            <option value="">— Blank —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTemplate && (
        <div>
          <label style={lbl}>Template preview</label>
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "4px",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              maxHeight: "80px",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          data-testid="save-instruction-btn"
          type="button"
          onClick={() => void save()}
          disabled={saving || !title.trim()}
          style={{
            background: "#38bdf8",
            color: "#0d1017",
            border: "none",
            borderRadius: "4px",
            padding: "0.4rem 1rem",
            fontWeight: 700,
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          {saving ? "Creating…" : "Create Instruction"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "4px",
            padding: "0.4rem 0.75rem",
            color: "var(--text-secondary)",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Instruction card ──────────────────────────────────────────────────────────

function InstructionCard({
  instr,
  onRefresh,
}: {
  instr: Instruction;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(instr.title);
  const [editHtml, setEditHtml] = useState(
    typeof instr.body === "object" && "content" in instr.body
      ? (instr.body as { content: string }).content
      : ""
  );
  const [saving, setSaving] = useState(false);

  const isDraft = instr.status === "draft";
  const isApproved = instr.status === "approved";
  const isSent = instr.status === "sent";
  const canSend = isApproved;
  const canApprove = isDraft;
  const showPdf = isApproved || isSent;

  const doApprove = async () => {
    await apiClient.POST("/api/v1/instructions/{instr_id}/approve", {
      params: { path: { instr_id: instr.id } },
    });
    onRefresh();
  };

  const doSend = async () => {
    await apiClient.POST("/api/v1/instructions/{instr_id}/send", {
      params: { path: { instr_id: instr.id } },
    });
    onRefresh();
  };

  const saveEdit = async () => {
    setSaving(true);
    await apiClient.PATCH("/api/v1/instructions/{instr_id}", {
      params: { path: { instr_id: instr.id } },
      body: { title: editTitle, body_html: editHtml } as Parameters<typeof apiClient.PATCH>[1]["body"],
    });
    setSaving(false);
    setEditing(false);
    onRefresh();
  };

  return (
    <div
      data-testid={`instruction-card-${instr.id}`}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{instr.title}</span>
        <StatusBadge status={instr.status} />

        {instr.approved_at && (
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Approved {new Date(instr.approved_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        )}
        {instr.sent_at && (
          <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>
            Sent {new Date(instr.sent_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        )}

        {/* Action buttons — right side */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem", alignItems: "center" }}>
          {isDraft && (
            <button
              data-testid={`edit-btn-${instr.id}`}
              type="button"
              onClick={() => setEditing((e) => !e)}
              style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "3px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              {editing ? "Close" : "Edit"}
            </button>
          )}

          {canApprove && (
            <button
              data-testid={`approve-btn-${instr.id}`}
              type="button"
              onClick={() => void doApprove()}
              style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "3px", border: "1px solid #34d39944", background: "#34d39911", color: "#34d399", cursor: "pointer" }}
            >
              Approve
            </button>
          )}

          {/* Send button: shown on draft (disabled) and approved (enabled) */}
          {!isSent && (
            <button
              data-testid={`send-btn-${instr.id}`}
              type="button"
              disabled={!canSend}
              onClick={() => void doSend()}
              title={!canSend ? "Must be approved before sending" : "Send instruction"}
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "3px",
                border: `1px solid ${canSend ? "#38bdf844" : "rgba(255,255,255,0.08)"}`,
                background: canSend ? "#38bdf811" : "rgba(255,255,255,0.02)",
                color: canSend ? "#38bdf8" : "rgba(148,163,184,0.4)",
                cursor: canSend ? "pointer" : "default",
                opacity: canSend ? 1 : 0.5,
              }}
            >
              Send
            </button>
          )}

          {showPdf && (
            <a
              data-testid={`pdf-link-${instr.id}`}
              href={`/api/v1/instructions/${instr.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "3px",
                border: "1px solid rgba(248,113,113,0.3)",
                background: "rgba(248,113,113,0.06)",
                color: "#f87171",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              PDF ↓
            </a>
          )}
        </div>
      </div>

      {/* Editor (only on draft, only when editing) */}
      {editing && isDraft && (
        <div style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={lbl}>Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={inp}
            />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={lbl}>Body</label>
            <RichEditor initialHtml={editHtml} onChange={setEditHtml} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={saving}
              style={{ background: "#38bdf8", color: "#0d1017", border: "none", borderRadius: "4px", padding: "0.35rem 0.85rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "0.35rem 0.75rem", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Read-only body preview (non-editing) */}
      {!editing && (
        <div
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            maxHeight: "120px",
            overflow: "hidden",
            position: "relative",
          }}
          dangerouslySetInnerHTML={{
            __html: typeof instr.body === "object" && "content" in instr.body
              ? (instr.body as { content: string }).content
              : "",
          }}
        />
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function VoyageInstructionsPanel({ voyageId }: VoyageInstructionsPanelProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: instructions = [], isLoading: instrLoading } = useQuery({
    queryKey: ["voyage", voyageId, "instructions"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET(
        "/api/v1/voyages/{voyage_id}/instructions",
        { params: { path: { voyage_id: voyageId } } }
      );
      if (!response.ok) throw new Error("Failed to fetch instructions");
      return (data ?? []) as Instruction[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["instruction-templates"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/instruction-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return (data ?? []) as Template[];
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["voyage", voyageId, "instructions"] });
  };

  if (instrLoading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button
          data-testid="new-instruction-btn"
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            background: "#38bdf8",
            color: "#0d1017",
            border: "none",
            borderRadius: "6px",
            padding: "0.4rem 0.9rem",
            fontWeight: 700,
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          + New Instruction
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateForm
          templates={templates}
          voyageId={voyageId}
          onSaved={() => { setShowCreate(false); refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Instruction list */}
      {instructions.length === 0 && !showCreate ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "8px",
          }}
        >
          No voyage instructions yet. Click "+ New Instruction" to author voyage orders.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {instructions.map((instr) => (
            <InstructionCard key={instr.id} instr={instr} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
