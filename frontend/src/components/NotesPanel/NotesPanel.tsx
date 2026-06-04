import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type Note = components["schemas"]["VoyageNoteReadDTO"];
type Attachment = components["schemas"]["NoteAttachmentReadDTO"];

const CATEGORIES = ["Operational", "Commercial", "Safety", "Agent"] as const;
const PRIORITIES = ["Low", "Normal", "High"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  High: "#f87171",
  Normal: "#94a3b8",
  Low: "#64748b",
};

const CATEGORY_COLORS: Record<string, string> = {
  Operational: "#38bdf8",
  Commercial: "#34d399",
  Safety: "#fb923c",
  Agent: "#a78bfa",
};

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

const btn = (variant: "primary" | "danger" | "ghost" = "ghost"): React.CSSProperties => ({
  padding: "0.3rem 0.75rem",
  borderRadius: "4px",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  border: variant === "ghost" ? "1px solid rgba(255,255,255,0.12)" : "none",
  background:
    variant === "primary"
      ? "rgba(56,189,248,0.15)"
      : variant === "danger"
      ? "rgba(248,113,113,0.15)"
      : "rgba(255,255,255,0.04)",
  color:
    variant === "primary" ? "#38bdf8" : variant === "danger" ? "#f87171" : "var(--text-secondary)",
});

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: string }) {
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
      {label}
    </span>
  );
}

// ── CreateForm ────────────────────────────────────────────────────────────────

function CreateForm({ voyageId, onCreated }: { voyageId: string; onCreated: () => void }) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("Operational");
  const [priority, setPriority] = useState<string>("Normal");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const resp = await apiClient.POST("/api/v1/voyages/{voyage_id}/notes", {
        params: { path: { voyage_id: voyageId } },
        body: { body: body.trim(), category, priority },
      });
      if (!resp.data) { setSaving(false); return; }
      const noteId = resp.data.id;

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/v1/notes/${noteId}/attachments`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
      }

      setBody("");
      setCategory("Operational");
      setPriority("Normal");
      setFile(null);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="note-create-form"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "6px",
        padding: "1rem",
        marginBottom: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      <div>
        <label style={lbl}>Note</label>
        <textarea
          data-testid="note-body-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter note…"
          rows={3}
          required
          style={{ ...inp, resize: "vertical" }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Category</label>
          <select
            data-testid="note-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inp}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Priority</label>
          <select
            data-testid="note-priority-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={inp}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>Attachment (optional)</label>
        <input
          data-testid="note-file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ ...inp, padding: "0.2rem 0.5rem" }}
        />
      </div>
      <button
        data-testid="note-save-btn"
        type="submit"
        disabled={saving || !body.trim()}
        style={{
          ...btn("primary"),
          opacity: saving || !body.trim() ? 0.45 : 1,
          cursor: saving || !body.trim() ? "default" : "pointer",
          alignSelf: "flex-end",
        }}
      >
        {saving ? "Saving…" : "Add Note"}
      </button>
    </form>
  );
}

// ── EditForm ──────────────────────────────────────────────────────────────────

function EditForm({ note, onSaved, onCancel }: { note: Note; onSaved: () => void; onCancel: () => void }) {
  const [body, setBody] = useState(note.body);
  const [category, setCategory] = useState(note.category);
  const [priority, setPriority] = useState(note.priority);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.PATCH("/api/v1/notes/{note_id}", {
        params: { path: { note_id: note.id } },
        body: { body: body.trim(), category, priority },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid={`note-edit-form-${note.id}`}
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      <textarea
        data-testid={`note-edit-body-${note.id}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        style={{ ...inp, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <select
          data-testid={`note-edit-category-${note.id}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ ...inp, width: "auto", flex: 1 }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          data-testid={`note-edit-priority-${note.id}`}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ ...inp, width: "auto", flex: 1 }}
        >
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={btn("ghost")}>Cancel</button>
        <button
          type="submit"
          data-testid={`note-edit-save-${note.id}`}
          disabled={saving}
          style={{ ...btn("primary"), opacity: saving ? 0.45 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ── AttachmentRow ─────────────────────────────────────────────────────────────

function AttachmentRow({
  att,
  onDelete,
}: {
  att: Attachment;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div
      data-testid={`attachment-row-${att.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: "0.75rem", flex: 1, color: "var(--text-secondary)" }}>
        📎 {att.filename}
        <span style={{ marginLeft: "0.5rem", opacity: 0.5 }}>
          ({(att.size_bytes / 1024).toFixed(1)} KB)
        </span>
      </span>
      <a
        data-testid={`attachment-download-${att.id}`}
        href={`/api/v1/attachments/${att.id}`}
        download={att.filename}
        style={{ ...btn("ghost"), textDecoration: "none", padding: "0.2rem 0.5rem" }}
      >
        Download
      </a>
      <button
        data-testid={`attachment-delete-${att.id}`}
        onClick={async () => {
          setDeleting(true);
          await onDelete(att.id);
          setDeleting(false);
        }}
        disabled={deleting}
        style={{ ...btn("danger"), opacity: deleting ? 0.45 : 1 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── NoteCard ──────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onMutated,
}: {
  note: Note;
  onMutated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this note and all its attachments?")) return;
    setDeleting(true);
    await apiClient.DELETE("/api/v1/notes/{note_id}", {
      params: { path: { note_id: note.id } },
    });
    onMutated();
  };

  const handleAttachmentDelete = async (attId: string) => {
    await apiClient.DELETE("/api/v1/attachments/{att_id}", {
      params: { path: { att_id: attId } },
    });
    onMutated();
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", uploadFile);
    await fetch(`/api/v1/notes/${note.id}/attachments`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    setUploadFile(null);
    setUploading(false);
    onMutated();
  };

  const ts = new Date(note.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      data-testid={`note-card-${note.id}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "6px",
        padding: "0.85rem 1rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Chip label={note.category} color={CATEGORY_COLORS[note.category] ?? "#94a3b8"} />
        <Chip label={note.priority} color={PRIORITY_COLORS[note.priority] ?? "#94a3b8"} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", opacity: 0.7 }}>{ts}</span>
        {!editing && (
          <>
            <button
              data-testid={`note-edit-btn-${note.id}`}
              onClick={() => setEditing(true)}
              style={btn("ghost")}
            >
              Edit
            </button>
            <button
              data-testid={`note-delete-btn-${note.id}`}
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...btn("danger"), opacity: deleting ? 0.45 : 1 }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {editing ? (
        <EditForm
          note={note}
          onSaved={() => { setEditing(false); onMutated(); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {note.body}
        </p>
      )}

      {/* Attachments */}
      {note.attachments.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          {note.attachments.map((att) => (
            <AttachmentRow key={att.id} att={att} onDelete={handleAttachmentDelete} />
          ))}
        </div>
      )}

      {/* Add attachment to existing note */}
      {!editing && (
        <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            data-testid={`note-attach-input-${note.id}`}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            style={{ ...inp, flex: 1, padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
          />
          <button
            data-testid={`note-attach-btn-${note.id}`}
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            style={{
              ...btn("ghost"),
              opacity: !uploadFile || uploading ? 0.35 : 1,
              cursor: !uploadFile || uploading ? "default" : "pointer",
            }}
          >
            {uploading ? "Uploading…" : "Attach"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── NotesPanel ─────────────────────────────────────────────────────────────────

interface NotesPanelProps {
  voyageId: string;
}

export function NotesPanel({ voyageId }: NotesPanelProps) {
  const qc = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", voyageId],
    queryFn: async () => {
      const resp = await apiClient.GET("/api/v1/voyages/{voyage_id}/notes", {
        params: { path: { voyage_id: voyageId } },
      });
      return resp.data ?? [];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["notes", voyageId] });

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        Loading notes…
      </div>
    );
  }

  return (
    <div
      data-testid="notes-panel"
      style={{ padding: "1.5rem", maxWidth: "800px" }}
    >
      <h3
        style={{
          margin: "0 0 1rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Voyage Notes
      </h3>

      <CreateForm voyageId={voyageId} onCreated={refresh} />

      {notes.length === 0 ? (
        <div
          data-testid="notes-empty"
          style={{ color: "var(--text-secondary)", fontSize: "0.85rem", opacity: 0.6 }}
        >
          No notes yet. Add one above.
        </div>
      ) : (
        <div data-testid="notes-list">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onMutated={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
