import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventLogPanel } from "../../components/EventLogPanel/EventLogPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const PORT_CALL_ID = "test-port-call-id";

const MOCK_EVENT: components["schemas"]["PortActivityResponseDTO"] = {
  id: "evt-001",
  port_call_id: PORT_CALL_ID,
  event_type: "Berthed",
  event_timestamp: "2026-05-01T10:00:00Z",
  recorded_by_user_id: "test-user-id",
  notes: "Starboard side alongside",
  corrects_activity_id: null,
  correction_reason: null,
  created_at: "2026-05-01T10:00:00Z",
};

const MOCK_LOG_ENTRY: components["schemas"]["ActivityLogResponseDTO"] = {
  id: "log-001",
  port_call_id: PORT_CALL_ID,
  logged_by_user_id: "test-user-id",
  narrative: "Awaiting pilot confirmation",
  logged_at: "2026-05-01T09:00:00Z",
};

const MOCK_OPERATIONS_USER = {
  id: 'test-user-id',
  username: 'operator',
  is_active: true,
  roles: ['Operations'],
};

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

describe("EventLogPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth mock
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });
  });

  // ─── Empty state ────────────────────────────────────────────────────────────

  it("renders empty state when no events and no log entries", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/No port events recorded/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/No activity log entries/i)).toBeInTheDocument();
    });
  });

  // ─── Event list rendering ────────────────────────────────────────────────────

  it("renders events with event-type chip, timestamp, and notes", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/events") {
        return Promise.resolve({ data: [MOCK_EVENT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Berthed")).toBeInTheDocument();
    });
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Starboard side alongside/)).toBeInTheDocument();
  });

  // ─── Append-only: zero edit/delete controls ───────────────────────────────

  it("has NO edit or delete controls on event rows", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/events") {
        return Promise.resolve({ data: [MOCK_EVENT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() =>
      expect(screen.getByText("Berthed")).toBeInTheDocument()
    );

    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  // ─── Correction mode shows both IDs ──────────────────────────────────────

  it("renders correction note on corrected events", async () => {
    const correctedEvent: components["schemas"]["PortActivityResponseDTO"] = {
      ...MOCK_EVENT,
      id: "evt-002",
      event_type: "Arrived",
      corrects_activity_id: "evt-001",
      correction_reason: "Wrong timestamp in original entry",
    };

    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/events") {
        return Promise.resolve({ data: [MOCK_EVENT, correctedEvent], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() =>
      expect(screen.getByText(/Wrong timestamp in original entry/i)).toBeInTheDocument()
    );
  });

  // ─── AddEventForm: submit creates new event ───────────────────────────────

  it("AddEventForm: submits event_type and event_timestamp, closes form on success", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_EVENT,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    // Open form
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    // Fill fields
    const eventTypeSelect = screen.getByLabelText(/event type/i);
    fireEvent.change(eventTypeSelect, { target: { value: "Berthed" } });

    const timestampInput = screen.getByLabelText(/event timestamp/i);
    fireEvent.change(timestampInput, { target: { value: "2026-05-01T10:00" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save event/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/port-calls/{port_call_id}/events");
        const postArg = lastCall[1] as { body: { event_type: string; event_timestamp: string } };
        expect(postArg.body.event_type).toBe("Berthed");
        expect(postArg.body.event_timestamp).toBe(new Date("2026-05-01T10:00").toISOString());
      }
    });
  });

  // ─── Correction mode toggle ───────────────────────────────────────────────

  it("AddEventForm: correction mode reveals corrects_activity_id and correction_reason fields", () => {
    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    // Correction fields not visible yet
    expect(
      screen.queryByLabelText(/corrects activity id/i)
    ).toBeNull();

    // Toggle correction mode
    fireEvent.click(screen.getByRole("button", { name: /this is a correction/i }));

    expect(
      screen.getByLabelText(/corrects activity id/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/correction reason/i)
    ).toBeInTheDocument();
  });

  // ─── ActivityLogSection ───────────────────────────────────────────────────

  it("ActivityLogSection: renders narrative and submit form", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/activity-log") {
        return Promise.resolve({ data: [MOCK_LOG_ENTRY], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() =>
      expect(
        screen.getByText(/Awaiting pilot confirmation/i)
      ).toBeInTheDocument()
    );
  });

  it("ActivityLogSection: has NO edit or delete controls on log rows", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/port-calls/{port_call_id}/activity-log") {
        return Promise.resolve({ data: [MOCK_LOG_ENTRY], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    await waitFor(() =>
      expect(
        screen.getByText(/Awaiting pilot confirmation/i)
      ).toBeInTheDocument()
    );

    const logSection = screen.getByTestId("activity-log-section");
    expect(within(logSection).queryByRole("button", { name: /edit/i })).toBeNull();
    expect(within(logSection).queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("ActivityLogSection: submits narrative to activity-log endpoint", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_LOG_ENTRY,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    render(<EventLogPanel portCallId={PORT_CALL_ID} />);

    const narrativeInput = await screen.findByPlaceholderText(/add narrative/i);
    fireEvent.change(narrativeInput, { target: { value: "Mooring complete" } });

    fireEvent.click(screen.getByRole("button", { name: /log entry/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/port-calls/{port_call_id}/activity-log");
        const postArg = lastCall[1] as { body: { narrative: string } };
        expect(postArg.body.narrative).toBe("Mooring complete");
      }
    });
  });
});
