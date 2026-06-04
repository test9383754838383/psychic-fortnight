import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { BunkersPanel } from "../../components/BunkersPanel/BunkersPanel";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

const MOCK_PORT_CALL: components["schemas"]["PortCallResponseDTO"] = {
  id: "pc-id-1",
  voyage_id: "voyage-id-1",
  port_id: "port-id-1",
  itinerary_line_id: null,
  status: "Planned",
  eta: null,
  etd: null,
  ata: null,
  anchored_datetime: null,
  atb: null,
  cargo_ops_started_datetime: null,
  cargo_ops_completed_datetime: null,
  atd: null,
  timezone_name: "UTC",
  timezone_offset_minutes: 0,
  nor_tendered_datetime: null,
  nor_accepted_datetime: null,
  free_pratique_granted: false,
  free_pratique_granted_datetime: null,
  customs_cleared: false,
  customs_cleared_datetime: null,
  ops_notes: null,
  arrival_draft_fwd: null,
  arrival_draft_aft: null,
  departure_draft_fwd: null,
  departure_draft_aft: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const MOCK_ROB: components["schemas"]["BunkerRobReadDTO"] = {
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

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}
function created(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 201 }) });
}
function noContent() {
  return Promise.resolve({ data: null, response: new Response(null, { status: 204 }) });
}

describe("BunkersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([MOCK_PORT_CALL]);
      if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([MOCK_ROB]);
      return ok([]);
    });
  });

  it("renders ROB row with fuel grade, ROBs, and variance", async () => {
    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getAllByText("VLSFO").length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId("rob-row-rob-id-1")).toBeInTheDocument();
    // ROB arrival appears at least once (also shows in summary)
    expect(screen.getAllByText("1,200").length).toBeGreaterThan(0);
  });

  it("shows empty state when no port calls exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([]);
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
    vi.mocked(apiClient.POST).mockResolvedValue(created(MOCK_ROB));

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
      expect(screen.getByTestId(`edit-rob-btn-${MOCK_ROB.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`edit-rob-btn-${MOCK_ROB.id}`));
    const gradeSelect = screen.getByTestId("fuel-grade-select") as HTMLSelectElement;
    expect(gradeSelect.value).toBe("VLSFO");
    // BDN number pre-filled
    const bdnInput = screen.getByTestId("bdn-number-input") as HTMLInputElement;
    expect(bdnInput.value).toBe("BDN-001");
  });

  it("delete button calls DELETE", async () => {
    vi.mocked(apiClient.DELETE).mockResolvedValue(noContent());

    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`delete-rob-btn-${MOCK_ROB.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-rob-btn-${MOCK_ROB.id}`));
    await waitFor(() => {
      expect(vi.mocked(apiClient.DELETE)).toHaveBeenCalledWith(
        "/api/v1/bunker-robs/{rob_id}",
        expect.objectContaining({ params: { path: { rob_id: MOCK_ROB.id } } })
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
      ...MOCK_ROB,
      id: "rob-id-2",
      port_consumption_mt: "80.000",
      calculated_port_consumption_mt: "50.000",
      variance_mt: "30.000",
    };

    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([MOCK_PORT_CALL]);
      if (path === "/api/v1/voyages/{voyage_id}/bunker-robs") return ok([robWithVariance]);
      return ok([]);
    });

    render(<BunkersPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("variance-flag-rob-id-2")).toBeInTheDocument();
    });
  });
});
