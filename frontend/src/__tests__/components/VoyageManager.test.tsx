import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { VoyageManagerContent } from "../../routes/VoyageManagerPage";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

const MOCK_USER: components["schemas"]["UserResponseDTO"] = {
  id: "user-1",
  username: "ops_user",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_VOYAGE: components["schemas"]["VoyageResponseDTO"] = {
  id: "voyage-id-1",
  voyage_no: "VOY-M1-001",
  vessel_ref: "vessel-id-00000000-0000",
  charterer_ref: null,
  status: "Forecast",
  commencing_datetime: "2026-06-01T08:00:00Z",
  expected_completing_datetime: null,
  expected_completing_manual_override: false,
  previous_voyage_ref: null,
  voyage_instructions: null,
  ops_notes: null,
  commenced_at: null,
  completed_at: null,
  closed_at: null,
  cancelled_at: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ops_coordinator_user_id: "coord-7",
  trade_area: "Mediterranean",
  lob: "Tankers",
  is_pool: true,
  is_ice_class: false,
  is_clean: false,
  is_coated: true,
  terms: null,
  itinerary_lines: [
    {
      id: "line-id-1",
      voyage_id: "voyage-id-1",
      sequence_no: 0,
      port_ref: "port-id-1",
      port_function: "Load",
      planned_eta: "2026-06-10T08:00:00Z",
      planned_etd: "2026-06-12T08:00:00Z",
      speed_kts: "14.0",
      distance_nm: "1344.0",
      eca_nm: "200.0",
      port_days: 2.0,
      sea_days: 4.0,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    },
  ],
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}

describe("VoyageManagerContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok(MOCK_USER);
      if (path === "/api/v1/voyages/{voyage_id}") return ok(MOCK_VOYAGE);
      if (path === "/api/v1/vessels") return ok([{ id: "vessel-id-00000000-0000", name: "MV FORTUNA" }]);
      if (path === "/api/v1/ports") return ok([]);
      return ok(null);
    });
  });

  it("shows voyage number in header", async () => {
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId("voyage-header-no")).toHaveTextContent("VOY-M1-001")
    );
  });

  it("shows vessel name in header", async () => {
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("MV FORTUNA")).toBeInTheDocument());
  });

  it("renders properties panel with ops coordinator pre-filled", async () => {
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={vi.fn()} />);
    await waitFor(() => {
      const input = screen.getByTestId("ops-coordinator-input") as HTMLInputElement;
      expect(input.value).toBe("coord-7");
    });
  });

  it("calls onBack when back button clicked", async () => {
    const onBack = vi.fn();
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={onBack} />);
    await waitFor(() => screen.getByTestId("back-btn"));
    fireEvent.click(screen.getByTestId("back-btn"));
    expect(onBack).toHaveBeenCalled();
  });

  it("calls PATCH when save properties clicked", async () => {
    vi.mocked(apiClient.PATCH).mockResolvedValue({ data: MOCK_VOYAGE, response: new Response(null, { status: 200 }) });
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={vi.fn()} />);
    await waitFor(() => screen.getByTestId("save-properties-btn"));
    fireEvent.click(screen.getByTestId("save-properties-btn"));
    await waitFor(() => expect(apiClient.PATCH).toHaveBeenCalled());
  });

  it("renders ITINERARY tab active by default", async () => {
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={vi.fn()} />);
    await waitFor(() => screen.getByTestId("content-tab-itinerary"));
    expect(screen.getByTestId("content-tab-itinerary")).toBeInTheDocument();
  });

  it("renders disabled content tabs", async () => {
    render(<VoyageManagerContent voyageId="voyage-id-1" onBack={vi.fn()} />);
    await waitFor(() => screen.getByTestId("content-tab-port-activities"));
    expect(screen.getByTestId("content-tab-port-activities")).toBeInTheDocument();
    expect(screen.getByTestId("content-tab-cargoes")).toBeInTheDocument();
    expect(screen.getByTestId("content-tab-delays")).toBeInTheDocument();
  });
});
