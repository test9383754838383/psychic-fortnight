import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

type Task = components["schemas"]["TaskReadDTO"];
type TaskStatus = NonNullable<components["schemas"]["TaskUpdateBody"]["status"]>;

const TASK_STATUSES: TaskStatus[] = ["Open", "In Progress", "Blocked", "Done"];

const STATUS_CHIP_CLASS: Record<string, string> = {
  Open: "status-chip--pending",
  "In Progress": "status-chip--in-progress",
  Blocked: "status-chip--blocked",
  Done: "status-chip--supplied",
};

interface TasksPanelProps {
  voyageId: string;
}

interface CreateFormValues {
  title: string;
  description: string;
  assigned_to: string;
  due_datetime: string;
  originating_alert_id: string;
}

const DEFAULT_FORM: CreateFormValues = {
  title: "",
  description: "",
  assigned_to: "",
  due_datetime: "",
  originating_alert_id: "",
};

function isOverdue(task: Task): boolean {
  if (task.status === "Done") return false;
  if (!task.due_datetime) return false;
  return new Date(task.due_datetime) < new Date();
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
      const { response } = await apiClient.POST("/api/v1/tasks", {
        body: {
          linked_entity_type: "Voyage",
          linked_entity_id: voyageId,
          title: values.title,
          description: values.description || null,
          assigned_to: values.assigned_to || null,
          due_datetime: values.due_datetime || null,
          originating_alert_id: values.originating_alert_id || null,
        },
      });
      if (!response.ok) throw new Error("Failed to create task");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  function field(
    name: keyof CreateFormValues
  ): (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void {
    return (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
  }

  const canSubmit = values.title.trim().length > 0;

  return (
    <div
      className="glass-panel"
      style={{ padding: "1.25rem", marginTop: "1rem" }}
    >
      <h4
        className="panel-heading"
        style={{ marginBottom: "1rem", fontSize: "1rem" }}
      >
        New Task
      </h4>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        <div className="form-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="task-title" className="form-label">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            className="form-input"
            value={values.title}
            onChange={field("title")}
            aria-label="Title"
          />
        </div>

        <div className="form-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="task-description" className="form-label">
            Description (optional)
          </label>
          <textarea
            id="task-description"
            className="form-textarea"
            value={values.description}
            onChange={field("description")}
            rows={2}
            style={{ width: "100%" }}
          />
        </div>

        <div className="form-field">
          <label htmlFor="task-assigned-to" className="form-label">
            Assigned To (optional)
          </label>
          <input
            id="task-assigned-to"
            type="text"
            className="form-input"
            value={values.assigned_to}
            onChange={field("assigned_to")}
            placeholder="User UUID"
          />
        </div>

        <div className="form-field">
          <label htmlFor="task-due-datetime" className="form-label">
            Due Date/Time (optional)
          </label>
          <input
            id="task-due-datetime"
            type="datetime-local"
            className="form-input"
            value={values.due_datetime}
            onChange={field("due_datetime")}
          />
        </div>

        <div className="form-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="task-alert-id" className="form-label">
            Originating Alert ID (optional)
          </label>
          <input
            id="task-alert-id"
            type="text"
            className="form-input"
            value={values.originating_alert_id}
            onChange={field("originating_alert_id")}
            placeholder="Alert UUID"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button
          className="btn-primary btn-sm"
          onClick={() => create.mutate()}
          disabled={!canSubmit || create.isPending}
          aria-label="Save Task"
        >
          {create.isPending ? "Saving…" : "Save Task"}
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

interface TaskCardProps {
  task: Task;
  voyageId: string;
}

function TaskCard({ task, voyageId }: TaskCardProps) {
  const queryClient = useQueryClient();
  const overdue = isOverdue(task);

  const updateStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      const { response } = await apiClient.PATCH("/api/v1/tasks/{task_id}", {
        params: { path: { task_id: task.id } },
        body: { status },
      });
      if (!response.ok) throw new Error("Failed to update task status");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", { entity_id: voyageId }] });
    },
  });

  return (
    <div
      style={{
        padding: "1rem",
        marginBottom: "0.75rem",
        borderRadius: "0.5rem",
        background: "var(--surface-2, rgba(255,255,255,0.04))",
        border: `1px solid ${overdue ? "var(--error-color, #e53e3e)" : "var(--border-color, rgba(255,255,255,0.08))"}`,
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
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {task.title}
          </span>
          {overdue && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--error-color, #e53e3e)",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Overdue
            </span>
          )}
        </div>

        <select
          className="form-select"
          style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
          value={task.status}
          onChange={(e) =>
            updateStatus.mutate(e.target.value as TaskStatus)
          }
          disabled={updateStatus.isPending}
          aria-label="Status"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginTop: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          className={`status-chip ${STATUS_CHIP_CLASS[task.status] ?? ""}`}
        >
          {task.status}
        </span>

        {task.due_datetime && (
          <span
            style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
          >
            Due: {format(new Date(task.due_datetime), "yyyy-MM-dd HH:mm")}
          </span>
        )}

        {task.assigned_to && (
          <span
            style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
          >
            Assigned: {task.assigned_to}
          </span>
        )}
      </div>

      {task.description && (
        <p
          style={{
            margin: "0.5rem 0 0",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {task.description}
        </p>
      )}

      {task.status === "Done" && task.completed_at && (
        <div
          style={{
            marginTop: "0.25rem",
            fontSize: "0.75rem",
            color: "var(--text-tertiary, var(--text-secondary))",
          }}
        >
          Completed: {format(new Date(task.completed_at), "yyyy-MM-dd HH:mm")}
        </div>
      )}
    </div>
  );
}

export function TasksPanel({ voyageId }: TasksPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks", { entity_id: voyageId }],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/tasks", {
        params: {
          query: {
            entity_type: "Voyage",
          },
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return (data ?? []).filter(
        (task) =>
          task.linked_entity_type === "Voyage" &&
          task.linked_entity_id === voyageId
      );
    },
  });

  if (isLoading) {
    return (
      <section
        data-testid="tasks-panel"
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="loading-text">Loading tasks…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        data-testid="tasks-panel"
        className="event-log-panel glass-panel"
        style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
      >
        <div className="form-error">Error: {error.message}</div>
      </section>
    );
  }

  return (
    <section
      data-testid="tasks-panel"
      className="event-log-panel glass-panel"
      style={{ maxWidth: "none", textAlign: "left", padding: "1.5rem" }}
    >
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3
          className="panel-heading"
          style={{
            fontFamily: "var(--font-title)",
            fontSize: "1.25rem",
            margin: 0,
          }}
        >
          Tasks
        </h3>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowCreateForm((v) => !v)}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
          aria-label="Add Task"
        >
          {showCreateForm ? "Close" : "+ Add Task"}
        </button>
      </div>

      {showCreateForm && (
        <CreateForm
          voyageId={voyageId}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {tasks.length === 0 && !showCreateForm ? (
        <div
          className="empty-state"
          style={{
            color: "var(--text-secondary)",
            textAlign: "center",
            padding: "1.5rem 0",
          }}
        >
          No tasks for this voyage.
        </div>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} voyageId={voyageId} />
          ))}
        </div>
      )}
    </section>
  );
}
