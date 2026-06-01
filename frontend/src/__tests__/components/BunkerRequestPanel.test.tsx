import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BunkerRequestPanel } from "../../components/BunkerRequestPanel/BunkerRequestPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const VOYAGE_ID = "test-voyage-id";
const BUNKER_ID = "bunker-001";
const USER_ID = "test-user-uuid";

const MOCK_OPERATIONS_USER: components["schemas"]["UserResponseDTO"] = {
  id: USER_ID,
  username: "operator",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_RAISED: components["schemas"]["BunkerRequestReadDTO"] = {
  id: BUNKER_ID,
  voyage_id: VOYAGE_ID,
  port_call_id: null,
  fuel_type: "HFO",
  quantity_required_mt: 500.0,
  specification_grade: "ISO 8217 RMG 380",
  max_sulphur_content: 3.5,
  status: "Raised",
  blocker_note: null,
  raised_by: USER_ID,
  raised_at: "2026-06-01T00:00:00Z",
  supplier_id: null,
  eta_supply: null,
};

const MOCK_IN_PROGRESS: components["schemas"]["BunkerRequestReadDTO"] = {
  ...MOCK_RAISED,
  status: "In Progress",
};

const MOCK_SUPPLIED: components["schemas"]["BunkerRequestReadDTO"] = {
  ...MOCK_RAISED,
  status: "Supplied",
};

const MOCK_BLOCKED: components["schemas"]["BunkerRequestReadDTO"] = {
  ...MOCK_RAISED,
  status: "Blocked",
  blocker_note: "Port congestion",
};

function makeResponse(status = 200) {
  return new Response(null, { status });
}

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

describe("BunkerRequestPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });
  });

  // 1. Empty state
  it("renders empty state and New Request button when no requests exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/bunker-requests") {
        return Promise.resolve({ data: [], response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });

    render(<BunkerRequestPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/no bunker requests/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /new request/i })).toBeInTheDocument();
  });

  // 2. List rendering
  it("renders bunker request rows with fuel_type, quantity, status chip, and raised_at", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/bunker-requests") {
        return Promise.resolve({ data: [MOCK_RAISED], response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });

    render(<BunkerRequestPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("HFO")).toBeInTheDocument();
    });

    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText("Raised")).toBeInTheDocument();
  });

  // 3. Create form submission
  it("submits create request with fuel_type and quantity when form is filled", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/bunker-requests") {
        return Promise.resolve({ data: [], response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_RAISED,
      response: makeResponse(201),
    });

    render(<BunkerRequestPanel voyageId={VOYAGE_ID} />);

    const newRequestBtn = await screen.findByRole("button", { name: /new request/i });
    fireEvent.click(newRequestBtn);

    const fuelTypeSelect = await screen.findByRole("combobox", { name: /fuel type/i });
    fireEvent.change(fuelTypeSelect, { target: { value: "HFO" } });

    const quantityInput = screen.getByRole("spinbutton", { name: /quantity/i });
    fireEvent.change(quantityInput, { target: { value: "500" } });

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/voyages/{voyage_id}/bunker-requests");
        expect(lastCall[1]).toMatchObject({
          body: { fuel_type: "HFO", quantity_required_mt: 500 },
        });
      }
    });
  });

  // 4. Transition controls — Blocked requires note
  it("prevents Blocked transition without a blocker_note and sends it when provided", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/bunker-requests") {
        return Promise.resolve({ data: [MOCK_RAISED], response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_BLOCKED,
      response: makeResponse(200),
    });

    render(<BunkerRequestPanel voyageId={VOYAGE_ID} />);

    // Open blocked section
    const blockedToggle = await screen.findByRole("button", { name: /blocked/i });
    fireEvent.click(blockedToggle);

    // Submit button should be disabled without a note
    const confirmBlockedBtn = screen.getByRole("button", { name: /confirm block/i });
    expect(confirmBlockedBtn).toBeDisabled();

    // Fill in the blocker note
    const noteInput = screen.getByRole("textbox", { name: /blocker note/i });
    fireEvent.change(noteInput, { target: { value: "Port congestion" } });

    expect(confirmBlockedBtn).toBeEnabled();
    fireEvent.click(confirmBlockedBtn);

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/bunker-requests/{bunker_request_id}/transition");
        expect(lastCall[1]).toMatchObject({
          body: { status: "Blocked", blocker_note: "Port congestion" },
        });
      }
    });
  });

  // 5. Terminal state — Supplied has no transition controls
  it("renders no transition buttons when status is Supplied (terminal)", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/bunker-requests") {
        return Promise.resolve({ data: [MOCK_SUPPLIED], response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });

    render(<BunkerRequestPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Supplied")).toBeInTheDocument();
    });

    // Forward-transition buttons must not exist
    expect(screen.queryByRole("button", { name: /in progress/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /stemmed/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /blocked/i })).toBeNull();

    // The "Supplied" chip is the only status indicator
    expect(screen.getByText("Supplied")).toBeInTheDocument();
  });

  // 6. Forward transition (In Progress → Stemmed)
  it("sends transition POST when forward button is clicked", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: makeResponse() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/bunker-requests") {
        return Promise.resolve({ data: [MOCK_IN_PROGRESS], response: makeResponse() });
      }
      return Promise.resolve({ data: [], response: makeResponse() });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { ...MOCK_IN_PROGRESS, status: "Stemmed" },
      response: makeResponse(200),
    });

    render(<BunkerRequestPanel voyageId={VOYAGE_ID} />);

    const stemmedBtn = await screen.findByRole("button", { name: /stemmed/i });
    fireEvent.click(stemmedBtn);

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/bunker-requests/{bunker_request_id}/transition");
        expect(lastCall[1]).toMatchObject({
          body: { status: "Stemmed" },
        });
      }
    });
  });
});
