import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "../api/client";
import type { components } from "../api/schema";

type Task = components["schemas"]["TaskReadDTO"];
type TaskStatus = "Open" | "In Progress" | "Blocked" | "Done";
type EntityType = "Voyage" | "PortCall" | "Vessel";

const TASK_STATUSES: TaskStatus[] = ["Open", "In Progress", "Blocked", "Done"];

const STATUS_CHIP_CLASS: Record<string, string> = {
  Open: "status-chip--pending",
  "In Progress": "status-chip--in-progress",
  Blocked: "status-chip--blocked",
  Done: "status-chip--supplied",
};

const LIMIT = 50;

interface FilterState {
  status: TaskStatus | "";
  entity_type: EntityType | "";
}

const DEFAULT_FILTERS: FilterState = {
  status: "",
  entity_type: "",
};

function isOverdue(task: Task): boolean {
  if (task.status === "Done") return false;
  if (!task.due_datetime) return false;
  return new Date(task.due_datetime) < new Date();
}

function TaskRow({ task }: { task: Task }) {
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
      void queryClient.invalidateQueries({ queryKey: ["tasks-global"] });
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
          <span style={{ fontWeight: 600 }}>{task.title}</span>
          <span
            className={`status-chip ${STATUS_CHIP_CLASS[task.status] ?? ""}`}
          >
            {task.status}
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
          <span
            style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
          >
            {task.linked_entity_type}
          </span>
        </div>

        <select
          className="form-select"
          style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
          value={task.status}
          onChange={(e) => updateStatus.mutate(e.target.value as TaskStatus)}
          disabled={updateStatus.isPending}
          aria-label="Task Status"
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
          flexWrap: "wrap",
        }}
      >
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

export function TasksPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [offset, setOffset] = useState(0);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks-global", filters, offset],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/tasks", {
        params: {
          query: {
            status: (filters.status as TaskStatus) || undefined,
            entity_type: (filters.entity_type as EntityType) || undefined,
            limit: LIMIT,
            offset,
          },
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return data ?? [];
    },
  });

  function handleFilterChange(key: keyof FilterState, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  }

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 className="panel-title" style={{ textAlign: "left" }}>
          Tasks
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Global task feed across all voyages and vessels
        </p>
      </header>

      {/* Filter bar */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem",
          maxWidth: "none",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          alignItems: "center",
        }}
      >
        <div className="form-field">
          <label htmlFor="filter-task-status" className="form-label">
            Status
          </label>
          <select
            id="filter-task-status"
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="filter-task-entity-type" className="form-label">
            Entity Type
          </label>
          <select
            id="filter-task-entity-type"
            className="form-select"
            value={filters.entity_type}
            onChange={(e) =>
              handleFilterChange("entity_type", e.target.value)
            }
          >
            <option value="">All</option>
            <option value="Voyage">Voyage</option>
            <option value="PortCall">PortCall</option>
            <option value="Vessel">Vessel</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", maxWidth: "none" }}>
        {isLoading ? (
          <div className="loading-text">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              padding: "2rem 0",
            }}
          >
            No tasks match the current filters.
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                className="btn-sm btn-secondary"
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
              >
                ← Prev
              </button>
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  lineHeight: "2",
                }}
              >
                {offset + 1}–{offset + tasks.length}
              </span>
              <button
                className="btn-sm btn-secondary"
                onClick={() => setOffset((o) => o + LIMIT)}
                disabled={tasks.length < LIMIT}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
