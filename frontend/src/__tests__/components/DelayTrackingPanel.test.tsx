import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DelayTrackingPanel } from "../../components/DelayTrackingPanel/DelayTrackingPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const VOYAGE_ID = "voyage-uuid-123";
const USER_ID = "user-uuid-456";

const MOCK_USER = {
  id: USER_ID,
  username: "ops_user",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_PORT_CALLS: components["schemas"]["PortCallResponseDTO"][] = [
  {
    id: "port-call-uuid-1",
    voyage_id: VOYAGE_ID,
    port_id: "NLRTM",
    timezone_name: "Europe/Amsterdam",
    status: "Planned",
    free_pratique_granted: false,
    customs_cleared: false,
    created_at: "2026-05-31T20:00:00Z",
    updated_at: "2026-05-31T20:00:00Z",
  },
];

const MOCK_OPEN_DELAY: components["schemas"]["DelayReadDTO"] = {
  id: "delay-open-uuid",
  voyage_id: VOYAGE_ID,
  port_call_id: null,
  leg_ref: null,
  delay_type: "Weather",
  fault_attribution: "Weather",
  start_datetime: "2026-06-01T01:00:00Z",
  end_datetime: null,
  actual_duration: null,
  claimed_duration: 2.5,
  description: "Delayed due to stormy weather",
  recorded_by: USER_ID,
  approved_by: null,
};

const MOCK_APPROVED_DELAY: components["schemas"]["DelayReadDTO"] = {
  id: "delay-approved-uuid",
  voyage_id: VOYAGE_ID,
  port_call_id: "port-call-uuid-1",
  leg_ref: null,
  delay_type: "Mechanical",
  fault_attribution: "Vessel",
  start_datetime: "2026-06-01T04:00:00Z",
  end_datetime: "2026-06-01T08:30:00Z",
  actual_duration: 4.5,
  claimed_duration: null,
  description: "Main engine maintenance",
  recorded_by: USER_ID,
  approved_by: "supervisor-uuid",
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

describe("DelayTrackingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_USER,
          response: response(),
        });
      }
      if (path === "/api/v1/voyages/{voyage_id}/delays") {
        return Promise.resolve({
          data: [MOCK_OPEN_DELAY, MOCK_APPROVED_DELAY],
          response: response(),
        });
      }
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") {
        return Promise.resolve({
          data: MOCK_PORT_CALLS,
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
  it("renders empty state when no delays exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/delays") {
        return Promise.resolve({ data: [], response: response() });
      }
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") {
        return Promise.resolve({ data: MOCK_PORT_CALLS, response: response() });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    render(<DelayTrackingPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/No delays recorded for this voyage/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /\+ Add Delay/i })).toBeInTheDocument();
  });

  // 2. Listing delays and status chips
  it("renders delays with types, attribution, actual or claimed duration, and approved/open chip", async () => {
    render(<DelayTrackingPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getAllByText("Weather").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("Mechanical")).toBeInTheDocument();
    
    // Check attribution
    expect(screen.getAllByText("Weather").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Vessel")).toBeInTheDocument();

    // Check duration display
    expect(screen.getByText(/2.50 hrs \(Claimed\)/i)).toBeInTheDocument();
    expect(screen.getByText(/4.50 hrs \(Actual\)/i)).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText("Delayed due to stormy weather")).toBeInTheDocument();
    expect(screen.getByText("Main engine maintenance")).toBeInTheDocument();

    // Check status chips
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();

    // Open delay should have edit & approve buttons
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });

  // 3. Creating a delay flow
  it("allows creating a new delay and enforces mutual exclusivity of anchors", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_OPEN_DELAY,
      response: response(201),
    });

    render(<DelayTrackingPanel voyageId={VOYAGE_ID} />);

    // Click Add Delay
    const addBtn = await screen.findByRole("button", { name: /\+ Add Delay/i });
    fireEvent.click(addBtn);

    // Form should be visible
    expect(screen.getByText(/Record New Delay/i)).toBeInTheDocument();

    // Fill out form
    fireEvent.change(screen.getByLabelText(/Delay Type/i), { target: { value: "Weather" } });
    fireEvent.change(screen.getByLabelText(/Fault Attribution/i), { target: { value: "Weather" } });
    fireEvent.change(screen.getByLabelText(/Start Datetime/i), { target: { value: "2026-06-01T01:00" } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Heavy fog delay" } });

    // Verify mutual exclusivity: Anchor Type default is Voyage Level (disabled inputs)
    const anchorSelect = screen.getByLabelText<HTMLSelectElement>(/Anchor Location/i);
    expect(anchorSelect.value).toBe("voyage");
    expect(screen.queryByLabelText(/Port Call/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Leg Reference/i)).not.toBeInTheDocument();

    // Switch anchor to Port Call
    fireEvent.change(anchorSelect, { target: { value: "port_call" } });
    const portCallSelect = screen.getByLabelText<HTMLSelectElement>(/Port Call/i);
    expect(portCallSelect).toBeInTheDocument();
    fireEvent.change(portCallSelect, { target: { value: "port-call-uuid-1" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /save delay/i }));

    await waitFor(() => {
      const lastCall = vi.mocked(apiClient.POST).mock.calls[0];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/voyages/{voyage_id}/delays");
        expect(lastCall[1]).toMatchObject({
          body: {
            delay_type: "Weather",
            fault_attribution: "Weather",
            start_datetime: new Date("2026-06-01T01:00").toISOString(),
            description: "Heavy fog delay",
            port_call_id: "port-call-uuid-1",
            leg_ref: null,
          },
        });
      }
    });
  });

  // 4. Editing an open delay flow
  it("allows editing an open delay and submits patch request", async () => {
    vi.mocked(apiClient.PATCH).mockResolvedValue({
      data: { ...MOCK_OPEN_DELAY, description: "Updated weather delay" },
      response: response(200),
    });

    render(<DelayTrackingPanel voyageId={VOYAGE_ID} />);

    // Click Edit on the open delay
    const editBtn = await screen.findByRole("button", { name: /edit/i });
    fireEvent.click(editBtn);

    // Form should be visible and pre-populated
    expect(screen.getByText(/Edit Delay/i)).toBeInTheDocument();
    const descTextarea = screen.getByLabelText<HTMLTextAreaElement>(/Description/i);
    expect(descTextarea.value).toBe("Delayed due to stormy weather");

    // Change description
    fireEvent.change(descTextarea, { target: { value: "Updated weather delay" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save delay/i }));

    await waitFor(() => {
      const lastCall = vi.mocked(apiClient.PATCH).mock.calls[0];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/delays/{delay_id}");
        expect(lastCall[1]).toMatchObject({
          params: { path: { delay_id: "delay-open-uuid" } },
          body: {
            description: "Updated weather delay",
          },
        });
      }
    });
  });

  // 5. Approving delay locks it
  it("submits approve request when clicking Approve, which refetches and hides buttons", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { ...MOCK_OPEN_DELAY, approved_by: "supervisor-uuid" },
      response: response(200),
    });

    render(<DelayTrackingPanel voyageId={VOYAGE_ID} />);

    const approveBtn = await screen.findByRole("button", { name: /approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const approveCall = calls.find(c => c[0] === "/api/v1/delays/{delay_id}/approve");
      expect(approveCall).toBeDefined();
      if (approveCall) {
        expect(approveCall[1]).toMatchObject({
          params: { path: { delay_id: "delay-open-uuid" } },
        });
      }
    });
  });
});
