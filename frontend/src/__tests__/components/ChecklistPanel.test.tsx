import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChecklistPanel } from "../../components/ChecklistPanel/ChecklistPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const PORT_CALL_ID = "test-port-call-id";
const USER_ID = "test-user-uuid";

const MOCK_OPERATIONS_USER = {
  id: USER_ID,
  username: "operator",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_CHECKLIST_ITEM_1: components["schemas"]["ChecklistItemReadDTO"] = {
  id: "item-001",
  checklist_id: "chk-001",
  sequence_no: 1,
  item_name: "Pre-arrival notice sent to agent",
  status: "Pending",
  signed_off_at: null,
  signed_off_by: null,
};

const MOCK_CHECKLIST_ITEM_2: components["schemas"]["ChecklistItemReadDTO"] = {
  id: "item-002",
  checklist_id: "chk-001",
  sequence_no: 2,
  item_name: "Berth/anchorage confirmed",
  status: "Signed Off",
  signed_off_at: "2026-05-31T20:00:00Z",
  signed_off_by: USER_ID,
};

const MOCK_CHECKLIST: components["schemas"]["ChecklistReadDTO"] = {
  id: "chk-001",
  port_call_id: PORT_CALL_ID,
  checklist_type: "Pre-Arrival",
  status: "Open",
  created_at: "2026-05-31T19:00:00Z",
  items: [MOCK_CHECKLIST_ITEM_1, MOCK_CHECKLIST_ITEM_2],
};

function response(status = 200) {
  return new Response(null, { status });
}

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

describe("ChecklistPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth me endpoint mock
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: response(),
        });
      }
      return Promise.resolve({
        data: [],
        response: response(),
      });
    });
  });

  // 1. Loading & Empty State
  it("renders empty state and creation controls when no checklists exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: response(),
        });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/checklists") {
        return Promise.resolve({
          data: [],
          response: response(),
        });
      }
      return Promise.resolve({
        data: [],
        response: response(),
      });
    });

    render(<ChecklistPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/No checklists created for this port call/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /create pre-arrival checklist/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create pre-departure checklist/i })).toBeInTheDocument();
  });

  // 2. Rendering checklists and ordered items
  it("renders checklists and items ordered by sequence_no", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: response(),
        });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/checklists") {
        return Promise.resolve({
          data: [MOCK_CHECKLIST],
          response: response(),
        });
      }
      return Promise.resolve({
        data: [],
        response: response(),
      });
    });

    render(<ChecklistPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Pre-Arrival Checklist")).toBeInTheDocument();
    });

    // Check checklist status chip
    expect(screen.getByText("Open")).toBeInTheDocument();

    // Check items are rendered
    expect(screen.getByText("Pre-arrival notice sent to agent")).toBeInTheDocument();
    expect(screen.getByText("Berth/anchorage confirmed")).toBeInTheDocument();

    // Check sign-off button for pending item
    const signOffButtons = screen.getAllByRole("button", { name: /sign off/i });
    expect(signOffButtons).toHaveLength(1);

    // Check signed-off metadata for item 2
    expect(screen.getByText(/Signed by: test-user-uuid/i)).toBeInTheDocument();

    // D-ENTRY-2 allows multiple checklists of the same type per port call.
    expect(screen.getByRole("button", { name: /create pre-arrival checklist/i })).toBeEnabled();
  });

  // 3. Creating checklist flow
  it("submits the create request when clicking a creation button", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: response(),
        });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/checklists") {
        return Promise.resolve({
          data: [],
          response: response(),
        });
      }
      return Promise.resolve({
        data: [],
        response: response(),
      });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_CHECKLIST,
      response: response(201),
    });

    render(<ChecklistPanel portCallId={PORT_CALL_ID} />);

    const createBtn = await screen.findByRole("button", { name: /create pre-arrival checklist/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/port-calls/{port_call_id}/checklists");
        expect(lastCall[1]).toMatchObject({ body: { checklist_type: "Pre-Arrival" } });
      }
    });
  });

  // 4. Sign off flow
  it("submits a POST request to the sign-off endpoint on button click", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: response(),
        });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/checklists") {
        return Promise.resolve({
          data: [MOCK_CHECKLIST],
          response: response(),
        });
      }
      return Promise.resolve({
        data: [],
        response: response(),
      });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: {
        ...MOCK_CHECKLIST_ITEM_1,
        status: "Signed Off",
        signed_off_at: "2026-05-31T21:00:00Z",
        signed_off_by: USER_ID,
      },
      response: response(),
    });

    render(<ChecklistPanel portCallId={PORT_CALL_ID} />);

    const signOffBtn = await screen.findByRole("button", { name: /sign off/i });
    fireEvent.click(signOffBtn);

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/checklist-items/{item_id}/sign-off");
        expect(lastCall[1]).toMatchObject({ params: { path: { item_id: "item-001" } } });
      }
    });
  });

  // 5. Auto-completing checklist on last item signed behavior
  it("auto-completes the checklist in the UI when the last item is signed", async () => {
    const fullySignedChecklist: components["schemas"]["ChecklistReadDTO"] = {
      ...MOCK_CHECKLIST,
      status: "Completed",
      items: [
        {
          ...MOCK_CHECKLIST_ITEM_1,
          status: "Signed Off",
          signed_off_at: "2026-05-31T21:00:00Z",
          signed_off_by: USER_ID,
        },
        MOCK_CHECKLIST_ITEM_2,
      ],
    };

    // Initially return the open checklist, then on subsequent fetches, return the completed checklist
    let callCount = 0;
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: response(),
        });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/checklists") {
        callCount++;
        const data = callCount === 1 ? [MOCK_CHECKLIST] : [fullySignedChecklist];
        return Promise.resolve({
          data,
          response: response(),
        });
      }
      return Promise.resolve({
        data: [],
        response: response(),
      });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: {
        ...MOCK_CHECKLIST_ITEM_1,
        status: "Signed Off",
        signed_off_at: "2026-05-31T21:00:00Z",
        signed_off_by: USER_ID,
      },
      response: response(),
    });

    render(<ChecklistPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    const signOffBtn = screen.getByRole("button", { name: /sign off/i });
    fireEvent.click(signOffBtn);

    // Verify it updates and shows Completed status chip
    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /sign off/i })).toBeNull();
  });
});
