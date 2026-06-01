import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AlertsPanel } from "../../components/AlertsPanel/AlertsPanel";
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

const MOCK_INFO_ALERT: components["schemas"]["AlertReadDTO"] = {
  id: "alert-info-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  alert_type: "ETA Overdue",
  triggered_at: "2026-06-01T08:00:00Z",
  message: "ETA is overdue by 2 hours",
  severity: "Info",
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
};

const MOCK_WARNING_ALERT: components["schemas"]["AlertReadDTO"] = {
  id: "alert-warning-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  alert_type: "Departure Overdue",
  triggered_at: "2026-06-01T09:00:00Z",
  message: "Departure is overdue",
  severity: "Warning",
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
};

const MOCK_CRITICAL_ALERT: components["schemas"]["AlertReadDTO"] = {
  id: "alert-critical-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  alert_type: "NOR Not Tendered",
  triggered_at: "2026-06-01T10:00:00Z",
  message: "NOR has not been tendered",
  severity: "Critical",
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
};

const MOCK_RESOLVED_ALERT: components["schemas"]["AlertReadDTO"] = {
  id: "alert-resolved-uuid",
  linked_entity_type: "Voyage",
  linked_entity_id: VOYAGE_ID,
  alert_type: "Agent Not Confirmed",
  triggered_at: "2026-06-01T07:00:00Z",
  message: "Agent not confirmed",
  severity: "Info",
  resolved_at: "2026-06-01T11:00:00Z",
  resolved_by: USER_ID,
  resolution_note: "Agent confirmed via phone",
};

const OTHER_VOYAGE_ALERT: components["schemas"]["AlertReadDTO"] = {
  ...MOCK_INFO_ALERT,
  id: "other-voyage-alert",
  linked_entity_id: "other-voyage-id",
  message: "This alert belongs elsewhere",
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

describe("AlertsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/alerts") {
        return Promise.resolve({
          data: [MOCK_INFO_ALERT, MOCK_WARNING_ALERT, MOCK_RESOLVED_ALERT],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });
  });

  // 1. List rendering
  it("renders alert list with type, severity chip, message, triggered_at", async () => {
    render(<AlertsPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("ETA Overdue")).toBeInTheDocument();
    });

    expect(screen.getByText("ETA is overdue by 2 hours")).toBeInTheDocument();
    expect(screen.getByText("Departure is overdue")).toBeInTheDocument();
    // severity chips — both chip and select option may contain "Info"
    expect(screen.getAllByText("Info").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Warning").length).toBeGreaterThanOrEqual(1);
    // resolved badge
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    // unresolved badge
    const unresolvedChips = screen.getAllByText("Unresolved");
    expect(unresolvedChips.length).toBeGreaterThanOrEqual(1);
  });

  it("only renders alerts linked to the current voyage", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/alerts") {
        return Promise.resolve({
          data: [MOCK_INFO_ALERT, OTHER_VOYAGE_ALERT],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    render(<AlertsPanel voyageId={VOYAGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("ETA is overdue by 2 hours")).toBeInTheDocument();
    });

    expect(screen.queryByText("This alert belongs elsewhere")).not.toBeInTheDocument();
  });

  // 2. Create form submission
  it("shows create form and submits POST /api/v1/alerts", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_INFO_ALERT,
      response: response(201),
    });

    render(<AlertsPanel voyageId={VOYAGE_ID} />);

    const newBtn = await screen.findByRole("button", { name: /new alert/i });
    fireEvent.click(newBtn);

    // form visible
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/alert type/i), {
      target: { value: "ETA Overdue" },
    });
    fireEvent.change(screen.getByLabelText(/severity/i), {
      target: { value: "Info" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Test alert message" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const createCall = calls.find((c) => c[0] === "/api/v1/alerts");
      expect(createCall).toBeDefined();
      if (createCall) {
        expect(createCall[1]).toMatchObject({
          body: {
            linked_entity_type: "Voyage",
            linked_entity_id: VOYAGE_ID,
            alert_type: "ETA Overdue",
            severity: "Info",
            message: "Test alert message",
          },
        });
      }
    });
  });

  // 3. Resolve button shows inline form and submits
  it("resolve button shows inline form and submits POST resolve", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/alerts") {
        return Promise.resolve({
          data: [MOCK_INFO_ALERT],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: {
        ...MOCK_INFO_ALERT,
        resolved_at: new Date().toISOString(),
        resolved_by: USER_ID,
      },
      response: response(),
    });

    render(<AlertsPanel voyageId={VOYAGE_ID} />);

    const resolveBtn = await screen.findByRole("button", { name: /resolve/i });
    fireEvent.click(resolveBtn);

    // inline resolution form appears
    expect(screen.getByLabelText(/resolution note/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/resolution note/i), {
      target: { value: "Resolved by operator" },
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm resolve/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const resolveCall = calls.find((c) =>
        (c[0] as string).includes("/resolve")
      );
      expect(resolveCall).toBeDefined();
    });
  });

  // 4. resolution_note is required when severity=Warning/Critical
  it("shows required label on resolution_note when severity=Warning", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/alerts") {
        return Promise.resolve({
          data: [MOCK_WARNING_ALERT],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    render(<AlertsPanel voyageId={VOYAGE_ID} />);

    const resolveBtn = await screen.findByRole("button", { name: /resolve/i });
    fireEvent.click(resolveBtn);

    // label should include "(required)" for Warning
    expect(
      screen.getByText(/resolution note.*required/i)
    ).toBeInTheDocument();
  });

  it("shows required label on resolution_note when severity=Critical", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_USER, response: response() });
      }
      if (path === "/api/v1/alerts") {
        return Promise.resolve({
          data: [MOCK_CRITICAL_ALERT],
          response: response(),
        });
      }
      return Promise.resolve({ data: [], response: response() });
    });

    render(<AlertsPanel voyageId={VOYAGE_ID} />);

    const resolveBtn = await screen.findByRole("button", { name: /resolve/i });
    fireEvent.click(resolveBtn);

    expect(
      screen.getByText(/resolution note.*required/i)
    ).toBeInTheDocument();
  });

  it("renders data-testid=alerts-panel on outer wrapper", () => {
    render(<AlertsPanel voyageId={VOYAGE_ID} />);
    expect(screen.getByTestId("alerts-panel")).toBeInTheDocument();
  });
});
