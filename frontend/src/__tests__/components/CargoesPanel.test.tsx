import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { CargoesPanel } from "../../components/CargoesPanel/CargoesPanel";

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

const MOCK_CARGO: components["schemas"]["CargoResponseDTO"] = {
  id: "cargo-id-1",
  voyage_id: "voyage-id-1",
  commodity: "Crude Oil",
  quantity: "25000.000" as unknown as number,
  unit: "MT",
  load_port_ref: "port-id-1",
  discharge_port_ref: "port-id-2",
  notes: "Test cargo",
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

describe("CargoesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/ports") return ok([MOCK_PORT, MOCK_PORT2]);
      if (path === "/api/v1/voyages/{voyage_id}/cargoes") return ok([MOCK_CARGO]);
      return ok([]);
    });
  });

  it("renders existing cargo card with commodity, quantity, and ports", async () => {
    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText(/CRUDE OIL — 25,000 MT/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Rotterdam/)).toBeInTheDocument();
    expect(screen.getByText(/Singapore/)).toBeInTheDocument();
    expect(screen.getByText("Test cargo")).toBeInTheDocument();
  });

  it("shows empty state when no cargoes", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/ports") return ok([]);
      if (path === "/api/v1/voyages/{voyage_id}/cargoes") return ok([]);
      return ok([]);
    });

    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText(/No cargoes added yet/)).toBeInTheDocument();
    });
  });

  it("shows add form when Add Cargo button clicked", async () => {
    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-cargo-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-cargo-btn"));
    expect(screen.getByTestId("commodity-select")).toBeInTheDocument();
    expect(screen.getByTestId("quantity-input")).toBeInTheDocument();
    expect(screen.getByTestId("unit-select")).toBeInTheDocument();
    expect(screen.getByTestId("load-port-select")).toBeInTheDocument();
    expect(screen.getByTestId("discharge-port-select")).toBeInTheDocument();
  });

  it("commodity and unit dropdowns have correct values wired", async () => {
    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-cargo-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-cargo-btn"));
    const commoditySelect = screen.getByTestId("commodity-select") as HTMLSelectElement;
    const unitSelect = screen.getByTestId("unit-select") as HTMLSelectElement;

    const commodityOptions = Array.from(commoditySelect.options).map((o) => o.value);
    expect(commodityOptions).toContain("Crude Oil");
    expect(commodityOptions).toContain("Grain");
    expect(commodityOptions).toContain("Other");
    expect(commodityOptions).toHaveLength(9);

    const unitOptions = Array.from(unitSelect.options).map((o) => o.value);
    expect(unitOptions).toEqual(["MT", "BBL", "CBM"]);
  });

  it("submitting add form calls POST and closes form", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created(MOCK_CARGO));

    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("add-cargo-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-cargo-btn"));
    fireEvent.change(screen.getByTestId("commodity-select"), { target: { value: "Grain" } });
    fireEvent.change(screen.getByTestId("quantity-input"), { target: { value: "10000" } });

    fireEvent.click(screen.getByTestId("save-cargo-btn"));
    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/voyages/{voyage_id}/cargoes",
        expect.objectContaining({ params: { path: { voyage_id: "voyage-id-1" } } })
      );
    });
  });

  it("edit button opens edit form pre-filled", async () => {
    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`edit-cargo-btn-${MOCK_CARGO.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`edit-cargo-btn-${MOCK_CARGO.id}`));
    const commoditySelect = screen.getByTestId("commodity-select") as HTMLSelectElement;
    expect(commoditySelect.value).toBe("Crude Oil");
  });

  it("delete button calls DELETE", async () => {
    vi.mocked(apiClient.DELETE).mockResolvedValue(noContent());

    render(<CargoesPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`delete-cargo-btn-${MOCK_CARGO.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-cargo-btn-${MOCK_CARGO.id}`));
    await waitFor(() => {
      expect(vi.mocked(apiClient.DELETE)).toHaveBeenCalledWith(
        "/api/v1/cargoes/{cargo_id}",
        expect.objectContaining({ params: { path: { cargo_id: MOCK_CARGO.id } } })
      );
    });
  });
});
