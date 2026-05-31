import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReportsPanel } from "../../components/ReportsPanel/ReportsPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const VOYAGE_ID = "test-voyage-id";
const PORT_CALL_ID = "test-port-call-id";

const MOCK_PENDING_REPORT: components["schemas"]["OperationalReportResponseDTO"] = {
  id: "report-001",
  voyage_id: null,
  port_call_id: PORT_CALL_ID,
  report_type: "Arrival",
  status: "Pending",
  submitted_by_user_id: "test-user-id",
  submitted_at: "2026-05-01T12:00:00Z",
  received_at: null,
  position_lat: null,
  position_lon: null,
  speed_24h: null,
  distance_to_go: null,
  eta_next_port: null,
  bunker_rob_total_mt: null,
  raw_content_ref: null,
  supersedes_report_id: null,
  created_at: "2026-05-01T12:00:00Z",
  updated_at: "2026-05-01T12:00:00Z",
};

const MOCK_ACCEPTED_REPORT: components["schemas"]["OperationalReportResponseDTO"] = {
  ...MOCK_PENDING_REPORT,
  id: "report-002",
  status: "Accepted",
};

const MOCK_NOON_REPORT: components["schemas"]["OperationalReportResponseDTO"] = {
  ...MOCK_PENDING_REPORT,
  id: "report-003",
  voyage_id: VOYAGE_ID,
  port_call_id: null,
  report_type: "Noon",
  status: "Pending",
};

const MOCK_OPERATIONS_USER = {
  id: 'test-user-id',
  username: 'operator',
  is_active: true,
  roles: ['Operations'],
};

const MOCK_VIEWER_USER = {
  id: 'viewer-user-id',
  username: 'viewer',
  is_active: true,
  roles: ['Viewer'],
};

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

describe("ReportsPanel", () => {
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

  // ─── Empty state ─────────────────────────────────────────────────────────

  it("renders empty state when no reports", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() => {
      expect(screen.getByText(/No reports found/i)).toBeInTheDocument();
    });
  });

  // ─── Report list rendering ────────────────────────────────────────────────

  it("renders report with status chip, report_type, and submitted_at", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_PENDING_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Arrival")).toBeInTheDocument();
    });
    // Match part of formatted date to work with any timezone/locale settings
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  // ─── Pending: edit allowed ────────────────────────────────────────────────

  it("shows Edit button for Pending reports", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_PENDING_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() =>
      expect(screen.getByText("Pending")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  // ─── Accepted: NO edit/delete controls ───────────────────────────────────

  it("shows NO edit/delete controls for Accepted reports", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_ACCEPTED_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() =>
      expect(screen.getByText("Accepted")).toBeInTheDocument()
    );

    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  // ─── ReportForm fields per type ──────────────────────────────────────────

  it("ReportForm: shows voyage fields (position, speed, distance) when report_type=Noon", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add report/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add report/i }));

    const reportTypeSelect = screen.getByLabelText(/report type/i);
    fireEvent.change(reportTypeSelect, { target: { value: "Noon" } });

    expect(screen.getByLabelText(/position lat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/position lon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/speed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distance to go/i)).toBeInTheDocument();
  });

  it("ReportForm: hides voyage fields when report_type=Arrival", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add report/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add report/i }));

    const reportTypeSelect = screen.getByLabelText(/report type/i);
    fireEvent.change(reportTypeSelect, { target: { value: "Arrival" } });

    expect(screen.queryByLabelText(/position lat/i)).toBeNull();
    expect(screen.queryByLabelText(/speed/i)).toBeNull();
  });

  // ─── ReportForm: submit creates report ───────────────────────────────────

  it("ReportForm: creates Arrival report, calls port-call endpoint", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_PENDING_REPORT,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add report/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add report/i }));

    const reportTypeSelect = screen.getByLabelText(/report type/i);
    fireEvent.change(reportTypeSelect, { target: { value: "Arrival" } });

    fireEvent.click(screen.getByRole("button", { name: /save report/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/port-calls/{port_call_id}/reports");
        const postArg = lastCall[1] as {
          params: { path: { port_call_id: string } };
          body: { report_type: string };
        };
        expect(postArg.params.path.port_call_id).toBe(PORT_CALL_ID);
        expect(postArg.body.report_type).toBe("Arrival");
      }
    });
  });

  it("ReportForm: creates Noon report, calls voyage endpoint", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_NOON_REPORT,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add report/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add report/i }));

    const reportTypeSelect = screen.getByLabelText(/report type/i);
    fireEvent.change(reportTypeSelect, { target: { value: "Noon" } });

    fireEvent.click(screen.getByRole("button", { name: /save report/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/voyages/{voyage_id}/reports");
        const postArg = lastCall[1] as {
          params: { path: { voyage_id: string } };
          body: { report_type: string };
        };
        expect(postArg.params.path.voyage_id).toBe(VOYAGE_ID);
        expect(postArg.body.report_type).toBe("Noon");
      }
    });
  });

  // ─── ReportTransitionControl: legal transitions ───────────────────────────

  it("shows Queried, Accepted, Rejected buttons for Pending report (Operations user)", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_PENDING_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() =>
      expect(screen.getByText("Pending")).toBeInTheDocument()
    );

    const reportCard = screen.getByTestId(`report-card-${MOCK_PENDING_REPORT.id}`);
    expect(within(reportCard).getByRole("button", { name: /queried/i })).toBeInTheDocument();
    expect(within(reportCard).getByRole("button", { name: /accepted/i })).toBeInTheDocument();
    expect(within(reportCard).getByRole("button", { name: /rejected/i })).toBeInTheDocument();
  });

  it("shows NO transition buttons for Accepted report (terminal state)", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_ACCEPTED_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() =>
      expect(screen.getByText("Accepted")).toBeInTheDocument()
    );

    const reportCard = screen.getByTestId(`report-card-${MOCK_ACCEPTED_REPORT.id}`);
    expect(within(reportCard).queryByRole("button", { name: /accepted/i })).toBeNull();
    expect(within(reportCard).queryByRole("button", { name: /rejected/i })).toBeNull();
  });

  it("Transition control: fires correct status on POST /api/v1/reports/:id/transition", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_OPERATIONS_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_PENDING_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { ...MOCK_PENDING_REPORT, status: "Accepted" },
      response: { ok: true } as unknown as Response,
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() =>
      expect(screen.getByText("Pending")).toBeInTheDocument()
    );

    const reportCard = screen.getByTestId(`report-card-${MOCK_PENDING_REPORT.id}`);
    fireEvent.click(within(reportCard).getByRole("button", { name: /accepted/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        expect(lastCall[0]).toBe("/api/v1/reports/{report_id}/transition");
        const postArg = lastCall[1] as {
          params: { path: { report_id: string } };
          body: { status: string };
        };
        expect(postArg.params.path.report_id).toBe(MOCK_PENDING_REPORT.id);
        expect(postArg.body.status).toBe("Accepted");
      }
    });
  });

  // ─── Role gating: Viewer cannot mutate ───────────────────────────────────

  it("hides transition buttons for Viewer role user", async () => {
    // Override /me to return Viewer role
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_VIEWER_USER, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/voyages/{voyage_id}/reports") {
        return Promise.resolve({ data: [MOCK_PENDING_REPORT], response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    await waitFor(() =>
      expect(screen.getByText("Pending")).toBeInTheDocument()
    );

    const reportCard = screen.getByTestId(`report-card-${MOCK_PENDING_REPORT.id}`);
    expect(within(reportCard).queryByRole("button", { name: /queried/i })).toBeNull();
    expect(within(reportCard).queryByRole("button", { name: /accepted/i })).toBeNull();
    expect(within(reportCard).queryByRole("button", { name: /rejected/i })).toBeNull();
  });

  it("hides Add Report button for Viewer role user", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({ data: MOCK_VIEWER_USER, response: { ok: true } as unknown as Response });
      }
      return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
    });

    render(
      <ReportsPanel voyageId={VOYAGE_ID} portCallId={PORT_CALL_ID} />
    );

    // Wait for loading to finish
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).toBeNull()
    );

    expect(screen.queryByRole("button", { name: /add report/i })).toBeNull();
  });
});
