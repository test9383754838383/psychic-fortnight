import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { ItineraryPanel } from "../../components/ItineraryPanel/ItineraryPanel";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

const MOCK_PORT: components["schemas"]["PortResponseDTO"] = {
  id: "port-id-1",
  unlocode: "NLRTM",
  name: "Rotterdam",
  country: "Netherlands",
  timezone: "Europe/Amsterdam",
  latitude: 51.9,
  longitude: 4.5,
  distance_table_ref: null,
  status: "Active",
};

const MOCK_PORT2: components["schemas"]["PortResponseDTO"] = {
  id: "port-id-2",
  unlocode: "SGSIN",
  name: "Singapore",
  country: "Singapore",
  timezone: "Asia/Singapore",
  latitude: 1.3,
  longitude: 103.8,
  distance_table_ref: null,
  status: "Active",
};

const MOCK_LINE_1: components["schemas"]["ItineraryLineResponseDTO"] = {
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
};

const MOCK_LINE_2: components["schemas"]["ItineraryLineResponseDTO"] = {
  id: "line-id-2",
  voyage_id: "voyage-id-1",
  sequence_no: 1,
  port_ref: "port-id-2",
  port_function: "Discharge",
  planned_eta: "2026-06-20T10:00:00Z",
  planned_etd: "2026-06-22T10:00:00Z",
  speed_kts: "12.0",
  distance_nm: "576.0",
  eca_nm: "100.0",
  port_days: 2.0,
  sea_days: 2.0,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}

describe("ItineraryPanel", () => {
  const onRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/ports") return ok([MOCK_PORT, MOCK_PORT2]);
      return ok(null);
    });
  });

  it("renders itinerary rows with port names and computed values", async () => {
    render(
      <ItineraryPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE_1, MOCK_LINE_2]}
        onRefetch={onRefetch}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Rotterdam")).toBeInTheDocument();
      expect(screen.getByText("Singapore")).toBeInTheDocument();
    });
    expect(screen.getByTestId("itinerary-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("itinerary-row-1")).toBeInTheDocument();
    // port days displayed in cell
    expect(screen.getAllByText(/2\.00 port days/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Voyage Summary totals correctly", async () => {
    render(
      <ItineraryPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE_1, MOCK_LINE_2]}
        onRefetch={onRefetch}
      />
    );

    await waitFor(() => screen.getByTestId("summary-port-days"));
    // port days: 2.0 + 2.0 = 4.00
    expect(screen.getByTestId("summary-port-days")).toHaveTextContent("4.00 days");
    // sea days: 4.0 + 2.0 = 6.00
    expect(screen.getByTestId("summary-sea-days")).toHaveTextContent("6.00 days");
    // total nm: 1344 + 576 = 1920
    expect(screen.getByTestId("summary-total-nm")).toHaveTextContent("1920 nm");
    // eca nm: 200 + 100 = 300
    expect(screen.getByTestId("summary-eca-nm")).toHaveTextContent("300 nm");
  });

  it("clicking Add Port shows the add form", async () => {
    render(
      <ItineraryPanel voyageId="voyage-id-1" itineraryLines={[]} onRefetch={onRefetch} />
    );

    await waitFor(() => screen.getByTestId("add-port-btn"));
    fireEvent.click(screen.getByTestId("add-port-btn"));
    expect(screen.getByTestId("port-select")).toBeInTheDocument();
    expect(screen.getByTestId("eta-input")).toBeInTheDocument();
    expect(screen.getByTestId("save-row-btn")).toBeInTheDocument();
  });

  it("submitting add form calls POST and invokes onRefetch", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_LINE_1,
      response: new Response(null, { status: 201 }),
    });

    render(
      <ItineraryPanel voyageId="voyage-id-1" itineraryLines={[]} onRefetch={onRefetch} />
    );

    await waitFor(() => screen.getByTestId("add-port-btn"));
    fireEvent.click(screen.getByTestId("add-port-btn"));

    await waitFor(() => screen.getByTestId("port-select"));
    fireEvent.change(screen.getByTestId("port-select"), { target: { value: "port-id-1" } });
    fireEvent.change(screen.getByTestId("eta-input"), { target: { value: "2026-06-10T08:00" } });
    fireEvent.change(screen.getByTestId("etd-input"), { target: { value: "2026-06-12T08:00" } });

    fireEvent.click(screen.getByTestId("save-row-btn"));

    await waitFor(() => expect(apiClient.POST).toHaveBeenCalled());
    await waitFor(() => expect(onRefetch).toHaveBeenCalled());
  });

  it("clicking edit shows inline form pre-filled with existing values", async () => {
    render(
      <ItineraryPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE_1]}
        onRefetch={onRefetch}
      />
    );

    await waitFor(() => screen.getByTestId("edit-row-btn"));
    fireEvent.click(screen.getByTestId("edit-row-btn"));

    const portSelect = screen.getByTestId("port-select") as HTMLSelectElement;
    expect(portSelect.value).toBe("port-id-1");

    const speedInput = screen.getByTestId("speed-input") as HTMLInputElement;
    expect(speedInput.value).toBe("14.0");
  });

  it("clicking delete calls DELETE and invokes onRefetch", async () => {
    vi.mocked(apiClient.DELETE).mockResolvedValue({
      data: undefined,
      response: new Response(null, { status: 204 }),
    });

    render(
      <ItineraryPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE_1]}
        onRefetch={onRefetch}
      />
    );

    await waitFor(() => screen.getByTestId("delete-row-btn"));
    fireEvent.click(screen.getByTestId("delete-row-btn"));

    await waitFor(() => expect(apiClient.DELETE).toHaveBeenCalled());
    await waitFor(() => expect(onRefetch).toHaveBeenCalled());
  });
});
