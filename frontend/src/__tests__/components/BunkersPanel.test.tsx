import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { BunkersPanel } from "../../components/BunkersPanel/BunkersPanel";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

// ── shared mock data ──────────────────────────────────────────────────────────

const MOCK_ILINE_1: components["schemas"]["ItineraryLineResponseDTO"] = {
  id: "il-id-1",
  voyage_id: "voyage-id-1",
  sequence_no: 1,
  port_ref: "port-id-1",
  port_function: "Load",
  planned_eta: "2026-08-01T08:00:00Z",
  planned_etd: "2026-08-03T08:00:00Z",
  speed_kts: null,
  distance_nm: null,
  eca_nm: null,
  port_days: 2,
  sea_days: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const MOCK_ILINE_2: components["schemas"]["ItineraryLineResponseDTO"] = {
  id: "il-id-2",
  voyage_id: "voyage-id-1",
  sequence_no: 2,
  port_ref: "port-id-2",
  port_function: "Discharge",
  planned_eta: "2026-08-10T08:00:00Z",
  planned_etd: "2026-08-12T08:00:00Z",
  speed_kts: "13",
  distance_nm: "1440",
  eca_nm: null,
  port_days: 2,
  sea_days: 5,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const MOCK_VOYAGE = {
  id: "voyage-id-1",
  voyage_no: "TEST001",
  vessel_ref: "vessel-id-1",
  status: "Commenced",
  is_pool: false,
  is_ice_class: false,
  is_clean: false,
  is_coated: false,
  ops_coordinator_user_id: null,
  trade_area: null,
  lob: null,
  itinerary_lines: [MOCK_ILINE_1, MOCK_ILINE_2],
};

const PC_1: components["schemas"]["PortCallResponseDTO"] = {
  id: "pc-id-1",
  voyage_id: "voyage-id-1",
  port_id: "port-id-1",
  itinerary_line_id: "il-id-1",
  status: "Planned",
  eta: "2026-08-01T08:00:00Z",
  etd: "2026-08-03T08:00:00Z",
  ata: null, anchored_datetime: null, atb: null,
  cargo_ops_started_datetime: null, cargo_ops_completed_datetime: null, atd: null,
  timezone_name: "UTC", timezone_offset_minutes: 0,
  nor_tendered_datetime: null, nor_accepted_datetime: null,
  free_pratique_granted: false, free_pratique_granted_datetime: null,
  customs_cleared: false, customs_cleared_datetime: null,
  ops_notes: null,
  arrival_draft_fwd: null, arrival_draft_aft: null,
  departure_draft_fwd: null, departure_draft_aft: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const PC_2: components["schemas"]["PortCallResponseDTO"] = {
  id: "pc-id-2",
  voyage_id: "voyage-id-1",
  port_id: "port-id-2",
  itinerary_line_id: "il-id-2",
  status: "Planned",
  eta: "2026-08-10T08:00:00Z",
  etd: "2026-08-12T08:00:00Z",
  ata: null, anchored_datetime: null, atb: null,
  cargo_ops_started_datetime: null, cargo_ops_completed_datetime: null, atd: null,
  timezone_name: "UTC", timezone_offset_minutes: 0,
  nor_tendered_datetime: null, nor_accepted_datetime: null,
  free_pratique_granted: false, free_pratique_granted_datetime: null,
  customs_cleared: false, customs_cleared_datetime: null,
  ops_notes: null,
  arrival_draft_fwd: null, arrival_draft_aft: null,
  departure_draft_fwd: null, departure_draft_aft: null,
  created_at: "2026-06-01T01:00:00Z",
  updated_at: "2026-06-01T01:00:00Z",
};

const ROB_BASE = {
  status: "estimated" as const,
  arrival_source_report_id: null,
  departure_source_report_id: null,
  received_source_report_id: null,
  confirmed_at: null,
  confirmed_by: null,
  reconciliation_status: null,
  reported_vs_delta_variance_mt: null,
};

// ROB at PC_1: departure 1650
const ROB_PC1: components["schemas"]["BunkerRobReadDTO"] = {
  ...ROB_BASE,
  id: "rob-id-1",
  port_call_id: "pc-id-1",
  voyage_id: "voyage-id-1",
  fuel_grade: "VLSFO",
  rob_arrival_mt: "1200.000",
  received_mt: "500.000",
  port_consumption_mt: "50.000",
  rob_departure_mt: "1650.000",
  calculated_port_consumption_mt: "50.000",
  variance_mt: "0.000",
  sulphur_pct: "0.0490",
  bdn_number: "BDN-001",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

// ROB at PC_2: arrival 1200 → sea cons = 1650 - 1200 = 450
const ROB_PC2: components["schemas"]["BunkerRobReadDTO"] = {
  ...ROB_BASE,
  id: "rob-id-2",
  port_call_id: "pc-id-2",
  voyage_id: "voyage-id-1",
  fuel_grade: "VLSFO",
  rob_arrival_mt: "1200.000",
  received_mt: "0.000",
  port_consumption_mt: "30.000",
  rob_departure_mt: "1170.000",
  calculated_port_consumption_mt: "30.000",
  variance_mt: "0.000",
  sulphur_pct: null,
  bdn_number: null,
  created_at: "2026-06-02T00:00:00Z",
  updated_at: "2026-06-02T00:00:00Z",
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}
function created(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 201 }) });
}
function noContent() {
  return Promise.resolve({ data: null, response: new Response(null, { status: 204 }) });
}

// ── default single-port-call mock (for tests that don't need sea legs) ────────
function mockSingle() {
  vi.mocked(apiClient.GET).mockImplementation((path) => {
    if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
    if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([PC_1]);
    if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([ROB_PC1]);
    if (path === "/api/v1/voyages/{voyage_id}") return ok({ ...MOCK_VOYAGE, itinerary_lines: [MOCK_ILINE_1] });
    if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([]);
    return ok([]);
  });
}

// ── two-port-call mock (for sea-leg tests) ────────────────────────────────────
function mockDouble() {
  vi.mocked(apiClient.GET).mockImplementation((path) => {
    if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
    if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([PC_1, PC_2]);
    if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([ROB_PC1, ROB_PC2]);
    if (path === "/api/v1/voyages/{voyage_id}") return ok(MOCK_VOYAGE);
    if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([]);
    return ok([]);
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("BunkersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle();
  });

  it("renders ROB row with fuel grade, ROBs, and variance", async () => {
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getAllByText("VLSFO").length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId("rob-row-rob-id-1")).toBeInTheDocument();
    expect(screen.getAllByText("1,200").length).toBeGreaterThan(0);
  });

  it("shows empty state when no port calls exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([]);
      if (path === "/api/v1/voyages/{voyage_id}") return ok({ ...MOCK_VOYAGE, itinerary_lines: [] });
      return ok([]);
    });

    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText(/No port calls/i)).toBeInTheDocument();
    });
  });

  it("add ROB button opens form", async () => {
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-rob-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-rob-btn"));
    expect(screen.getByTestId("fuel-grade-select")).toBeInTheDocument();
    expect(screen.getByTestId("rob-arrival-input")).toBeInTheDocument();
    expect(screen.getByTestId("rob-departure-input")).toBeInTheDocument();
    expect(screen.getByTestId("received-input")).toBeInTheDocument();
    expect(screen.getByTestId("port-consumption-input")).toBeInTheDocument();
    expect(screen.getByTestId("bdn-number-input")).toBeInTheDocument();
  });

  it("fuel grade select has all 5 grades", async () => {
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-rob-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-rob-btn"));
    const select = screen.getByTestId("fuel-grade-select") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain("VLSFO");
    expect(values).toContain("LSMGO");
    expect(values).toContain("HSFO");
    expect(values).toContain("MGO");
    expect(values).toContain("LNG");
  });

  it("submitting add form calls POST", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created(ROB_PC1));

    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-rob-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-rob-btn"));
    fireEvent.change(screen.getByTestId("fuel-grade-select"), { target: { value: "MGO" } });
    fireEvent.change(screen.getByTestId("rob-arrival-input"), { target: { value: "100" } });
    fireEvent.click(screen.getByTestId("save-rob-btn"));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/voyages/{voyage_id}/bunker-robs",
        expect.objectContaining({ params: { path: { voyage_id: "voyage-id-1" } } })
      );
    });
  });

  it("edit button opens form pre-filled with existing values", async () => {
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`edit-rob-btn-${ROB_PC1.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`edit-rob-btn-${ROB_PC1.id}`));
    const gradeSelect = screen.getByTestId("fuel-grade-select") as HTMLSelectElement;
    expect(gradeSelect.value).toBe("VLSFO");
    const bdnInput = screen.getByTestId("bdn-number-input") as HTMLInputElement;
    expect(bdnInput.value).toBe("BDN-001");
  });

  it("delete button calls DELETE", async () => {
    vi.mocked(apiClient.DELETE).mockResolvedValue(noContent());

    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`delete-rob-btn-${ROB_PC1.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-rob-btn-${ROB_PC1.id}`));
    await waitFor(() => {
      expect(vi.mocked(apiClient.DELETE)).toHaveBeenCalledWith(
        "/api/v1/bunker-robs/{rob_id}",
        expect.objectContaining({ params: { path: { rob_id: ROB_PC1.id } } })
      );
    });
  });

  it("voyage summary section is rendered", async () => {
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("voyage-bunker-summary")).toBeInTheDocument();
    });
  });

  it("nonzero variance is flagged visually", async () => {
    const robWithVariance: components["schemas"]["BunkerRobReadDTO"] = {
      ...ROB_PC1,
      id: "rob-id-var",
      port_consumption_mt: "80.000",
      calculated_port_consumption_mt: "50.000",
      variance_mt: "30.000",
    };

    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([PC_1]);
      if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([robWithVariance]);
      if (path === "/api/v1/voyages/{voyage_id}") return ok({ ...MOCK_VOYAGE, itinerary_lines: [MOCK_ILINE_1] });
      if (path === "/api/v1/voyages/{voyage_id}/activity-reports") return ok([]);
      return ok([]);
    });

    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("variance-flag-rob-id-var")).toBeInTheDocument();
    });
  });

  // ── sea-leg tests ─────────────────────────────────────────────────────────

  it("sea-leg consumption row appears between consecutive port calls", async () => {
    mockDouble();
    render(<BunkersPanel voyageId="voyage-id-1" />);
    // sea cons = 1650 - 1200 = 450 MT
    await waitFor(() => {
      expect(screen.getByTestId("sea-leg-row-0-VLSFO")).toBeInTheDocument();
    });
    const row = screen.getByTestId("sea-leg-row-0-VLSFO");
    expect(row).toHaveTextContent("450");
  });

  it("sea-leg row shows distance and MT/day when itinerary data available", async () => {
    mockDouble();
    render(<BunkersPanel voyageId="voyage-id-1" />);
    // ILINE_2 has distance_nm=1440, sea_days=5 → 450/5 = 90 MT/day
    await waitFor(() => {
      expect(screen.getByTestId("sea-leg-row-0-VLSFO")).toBeInTheDocument();
    });
    const row = screen.getByTestId("sea-leg-row-0-VLSFO");
    expect(row).toHaveTextContent("1,440");  // distance
    expect(row).toHaveTextContent("5.0");    // sea_days
    expect(row).toHaveTextContent("90.0");   // MT/day
  });

  it("sea-leg row is read-only (no edit/delete buttons)", async () => {
    mockDouble();
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("sea-leg-row-0-VLSFO")).toBeInTheDocument();
    });
    const row = screen.getByTestId("sea-leg-row-0-VLSFO");
    expect(row.querySelector("button")).toBeNull();
  });

  it("voyage summary includes total sea cons column", async () => {
    mockDouble();
    render(<BunkersPanel voyageId="voyage-id-1" />);
    // summary should exist and have a sea cons value for VLSFO
    await waitFor(() => {
      expect(screen.getByTestId("voyage-bunker-summary")).toBeInTheDocument();
    });
    // sea cons for VLSFO = 450
    expect(screen.getByTestId("summary-sea-cons-VLSFO")).toBeInTheDocument();
    expect(screen.getByTestId("summary-sea-cons-VLSFO")).toHaveTextContent("450");
  });
});
