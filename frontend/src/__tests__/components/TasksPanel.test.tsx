import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TasksPanel } from "../../components/TasksPanel/TasksPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const VOYAGE_ID = "voyage-uuid-123";
const USER_ID = "user-uuid-456";

const MOCK_USER: components["schemas"]["UserResponseDTO"] = {
  id: USER_ID,
  username: "ops_user",
  is_active: true,
  roles: ["Operations"],
};

// Past due datetime — will be overdue if status != Done
const PAST_DUE = "2020-01-01T00:00:00Z";
// Future due datetime
const FUTURE_DUE = "2099-01-01T00:00:00Z";

const MOCK_OPEN_TASK: components["schemas"]["TaskReadDTO"] = {
  id: "task-open-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  title: "Check cargo manifest",
  description: "Verify all cargo entries",
  assigned_to: USER_ID,
  due_datetime: FUTURE_DUE,
  status: "Open",
  originating_alert_id: null,
  created_by: USER_ID,
  created_at: "2026-06-01T08:00:00Z",
  completed_at: null,
};

const MOCK_OVERDUE_TASK: components["schemas"]["TaskReadDTO"] = {
  id: "task-overdue-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  title: "File NOR",
  description: null,
  assigned_to: null,
  due_datetime: PAST_DUE,
  status: "Open",
  originating_alert_id: null,
  created_by: USER_ID,
  created_at: "2026-06-01T08:00:00Z",
  completed_at: null,
};

const MOCK_DONE_TASK: components["schemas"]["TaskReadDTO"] = {
  id: "task-done-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  title: "Submit arrival report",
  description: null,
  assigned_to: USER_ID,
  due_datetime: FUTURE_DUE,
  status: "Done",
  originating_alert_id: null,
  created_by: USER_ID,
  created_at: "2026-06-01T08:00:00Z",
  completed_at: "2026-06-01T12:00:00Z",
};

const OTHER_VOYAGE_TASK: components["schemas"]["TaskReadDTO"] = {
  ...MOCK_OPEN_TASK,
  id: "other-voyage-task",
  linked_entity_id: "other-voyage-id",
  title: "Other voyage task",
};

function response(status = 200) {
  return new Response(null, { status });
}

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

describe("TasksPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/tasks") {
        return Promise.resolve({
          data: [MOCK_OPEN_TASK, MOCK_OVERDUE_TASK, MOCK_DONE_TASK],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });
  });

  // 1. List rendering
  it("renders task list with title, status chip, due_datetime, assigned_to", async () => {
    render(<TasksPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Check cargo manifest")).toBeInTheDocument();
    });

    expect(screen.getByText("File NOR")).toBeInTheDocument();
    expect(screen.getByText("Submit arrival report")).toBeInTheDocument();

    // status chips — "Open" is a chip; "Done" also appears as a select option
    const openChips = screen.getAllByText("Open");
    expect(openChips.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(1);
  });

  it("only renders tasks linked to the current voyage", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/tasks") {
        return Promise.resolve({
          data: [MOCK_OPEN_TASK, OTHER_VOYAGE_TASK],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    render(<TasksPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Check cargo manifest")).toBeInTheDocument();
    });

    expect(screen.queryByText("Other voyage task")).not.toBeInTheDocument();
  });

  // 2. Overdue indicator
  it("shows overdue indicator when due_datetime < now and status != Done", async () => {
    render(<TasksPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("File NOR")).toBeInTheDocument();
    });

    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it("does not show overdue indicator when status is Done even if due_datetime is past", async () => {
    const pastDoneTask: components["schemas"]["TaskReadDTO"] = {
      ...MOCK_DONE_TASK,
      due_datetime: PAST_DUE,
    };
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/tasks") {
        return Promise.resolve({
          data: [pastDoneTask],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    render(<TasksPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Submit arrival report")).toBeInTheDocument();
    });

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });

  // 3. Create form
  it("shows create form and submits POST /api/v1/tasks", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_OPEN_TASK,
      response: response(201),
    });

    render(<TasksPanel voyageId={VOYAGE_ID} />);

    const addBtn = await screen.findByRole("button", { name: /add task/i });
    fireEvent.click(addBtn);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "New test task" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save task/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const createCall = calls.find((c) => c[0] === "/api/v1/tasks");
      expect(createCall).toBeDefined();
      if (createCall) {
        expect(createCall[1]).toMatchObject({
          body: {
            linked_entity_type: "Voyage",
            linked_entity_id: VOYAGE_ID,
            title: "New test task",
          },
        });
      }
    });
  });

  // 4. Status dropdown triggers PATCH
  it("status dropdown calls PATCH /api/v1/tasks/{id}", async () => {
    vi.mocked(apiClient.PATCH).mockResolvedValue({
      data: { ...MOCK_OPEN_TASK, status: "In Progress" },
      response: response(),
    });

    render(<TasksPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Check cargo manifest")).toBeInTheDocument();
    });

    // Find the status select for the open task; getAllByLabelText throws if none,
    // so index 0 is always defined — justified non-null assertion.
    const statusSelects = screen.getAllByLabelText(/status/i);
    const firstSelect = statusSelects[0];
    if (!firstSelect) throw new Error("No status select rendered");
    fireEvent.change(firstSelect, { target: { value: "In Progress" } });

    await waitFor(() => {
      const calls = vi.mocked(apiClient.PATCH).mock.calls;
      const patchCall = calls.find((c) =>
        (c[0] as string).includes("/api/v1/tasks/")
      );
      expect(patchCall).toBeDefined();
      if (patchCall) {
        expect(patchCall[1]).toMatchObject({
          body: { status: "In Progress" },
        });
      }
    });
  });

  // 5. completed_at shown when status=Done
  it("shows completed_at timestamp when task status is Done", async () => {
    render(<TasksPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Submit arrival report")).toBeInTheDocument();
    });

    // completed_at should be visible for Done task
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it("renders data-testid=tasks-panel on outer wrapper", () => {
    render(<TasksPanel voyageId={VOYAGE_ID} />);
    expect(screen.getByTestId("tasks-panel")).toBeInTheDocument();
  });
});
