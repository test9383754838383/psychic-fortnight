import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { ActivityReportsPanel } from "../../components/ActivityReportsPanel/ActivityReportsPanel";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

const MOCK_REPORT: components["schemas"]["ActivityReportReadDTO"] = {
  id: "rep-id-1",
  voyage_id: "voyage-id-1",
  port_call_id: null,
  report_type: "NOON",
  report_datetime: "2026-08-05T12:00:00Z",
  latitude: "10.500",
  longitude: "50.250",
  wind_force: 4,
  sea_state: 3,
  swell: null,
  rpm: "82.5",
  slip_pct: null,
  speed_kn: "12.5",
  distance_nm: "300.0",
  status: "DRAFT",
  approved_at: null,
  approved_by: null,
  bunker_lines: [
    {
      id: "line-id-1",
      activity_report_id: "rep-id-1",
      fuel_grade: "VLSFO",
      reported_rob_mt: "1300.000",
      reported_consumption_mt: "80.000",
      received_mt: null,
      sulphur_pct: null,
      bdn_number: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    },
  ],
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const MOCK_APPROVED_REPORT: components["schemas"]["ActivityReportReadDTO"] = {
  ...MOCK_REPORT,
  id: "rep-id-2",
  status: "APPROVED",
  approved_at: "2026-06-01T14:00:00Z",
  approved_by: "user-id-1",
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}
function created(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 201 }) });
}

describe("ActivityReportsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([MOCK_REPORT]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      return ok([]);
    });
  });

  it("renders existing NOON report with status badge", async () => {
    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText("NOON")).toBeInTheDocument();
    });
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
  });

  it("shows empty state when no reports exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      return ok([]);
    });
    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText(/No activity reports/i)).toBeInTheDocument();
    });
  });

  it("add report button opens create form", async () => {
    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-report-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-report-btn"));
    expect(screen.getByTestId("report-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("report-datetime-input")).toBeInTheDocument();
  });

  it("report type select has all 5 types", async () => {
    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-report-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-report-btn"));
    const select = screen.getByTestId("report-type-select") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain("COMMENCING");
    expect(values).toContain("NOON");
    expect(values).toContain("ARRIVAL");
    expect(values).toContain("DEPARTURE");
    expect(values).toContain("TERMINATING");
  });

  it("create form shows ops fields", async () => {
    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-report-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-report-btn"));
    expect(screen.getByTestId("wind-force-input")).toBeInTheDocument();
    expect(screen.getByTestId("sea-state-input")).toBeInTheDocument();
    expect(screen.getByTestId("speed-kn-input")).toBeInTheDocument();
    expect(screen.getByTestId("distance-nm-input")).toBeInTheDocument();
  });

  it("submitting create form calls POST", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created(MOCK_REPORT));

    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-report-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-report-btn"));
    fireEvent.change(screen.getByTestId("report-type-select"), { target: { value: "NOON" } });
    fireEvent.change(screen.getByTestId("report-datetime-input"), { target: { value: "2026-08-05T12:00" } });
    fireEvent.click(screen.getByTestId("save-report-btn"));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/voyages/{voyage_id}/activity-reports",
        expect.objectContaining({ params: { path: { voyage_id: "voyage-id-1" } } })
      );
    });
  });

  it("submit button appears on DRAFT report and calls submit endpoint", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(ok({ ...MOCK_REPORT, status: "SUBMITTED" }));

    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`submit-report-btn-${MOCK_REPORT.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`submit-report-btn-${MOCK_REPORT.id}`));
    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/activity-reports/{report_id}/submit",
        expect.objectContaining({ params: { path: { report_id: MOCK_REPORT.id } } })
      );
    });
  });

  it("approve button appears on SUBMITTED report and calls approve endpoint", async () => {
    const submittedReport = { ...MOCK_REPORT, status: "SUBMITTED" };
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([submittedReport]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      return ok([]);
    });
    vi.mocked(apiClient.POST).mockResolvedValue(ok({ ...submittedReport, status: "APPROVED" }));

    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`approve-report-btn-${MOCK_REPORT.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`approve-report-btn-${MOCK_REPORT.id}`));
    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/activity-reports/{report_id}/approve",
        expect.objectContaining({ params: { path: { report_id: MOCK_REPORT.id } } })
      );
    });
  });

  it("approved report shows APPROVED badge and no submit/approve buttons", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([MOCK_APPROVED_REPORT]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      return ok([]);
    });

    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText("APPROVED")).toBeInTheDocument();
    });
    expect(screen.queryByTestId(`submit-report-btn-${MOCK_APPROVED_REPORT.id}`)).toBeNull();
    expect(screen.queryByTestId(`approve-report-btn-${MOCK_APPROVED_REPORT.id}`)).toBeNull();
  });

  it("bunker lines are shown for each report", async () => {
    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText("VLSFO")).toBeInTheDocument();
    });
    expect(screen.getByText(/1,300/)).toBeInTheDocument();  // reported_rob_mt
  });

  it("add bunker line button calls POST bunker-lines endpoint", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created({
      id: "line-id-new",
      activity_report_id: MOCK_REPORT.id,
      fuel_grade: "MGO",
      reported_rob_mt: null,
      reported_consumption_mt: null,
      received_mt: null,
      sulphur_pct: null,
      bdn_number: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    }));

    render(<ActivityReportsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId(`add-bunker-line-btn-${MOCK_REPORT.id}`)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId(`add-bunker-line-btn-${MOCK_REPORT.id}`));
    await expect(screen.getByTestId("bunker-line-grade-select")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("bunker-line-grade-select"), { target: { value: "MGO" } });
    fireEvent.click(screen.getByTestId("save-bunker-line-btn"));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/activity-reports/{report_id}/bunker-lines",
        expect.objectContaining({ params: { path: { report_id: MOCK_REPORT.id } } })
      );
    });
  });
});
