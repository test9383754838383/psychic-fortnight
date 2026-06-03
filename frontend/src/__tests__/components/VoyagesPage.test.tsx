import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { VoyagesList } from "../../components/VoyagesList/VoyagesList";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

const MOCK_USER: components["schemas"]["UserResponseDTO"] = {
  id: "user-1",
  username: "ops_user",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_VESSEL = { id: "vessel-id-00000000-0000", name: "MV FORTUNA" };

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
  itinerary_lines: [],
};

const MOCK_SCHEDULED: components["schemas"]["VoyageResponseDTO"] = {
  ...MOCK_VOYAGE,
  id: "voyage-id-2",
  voyage_no: "VOY-M1-002",
  status: "Scheduled",
  ops_coordinator_user_id: null,
  trade_area: null,
  lob: null,
  is_pool: false,
  is_coated: false,
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}

describe("VoyagesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok(MOCK_USER);
      if (path === "/api/v1/voyages") return ok([MOCK_VOYAGE, MOCK_SCHEDULED]);
      if (path === "/api/v1/vessels") return ok([MOCK_VESSEL]);
      return ok([]);
    });
  });

  it("renders the Voyages heading", async () => {
    render(<VoyagesList />);
    await waitFor(() => expect(screen.getByText("Voyages")).toBeInTheDocument());
  });

  it("shows voyage list with voyage numbers", async () => {
    render(<VoyagesList />);
    await waitFor(() => {
      expect(screen.getByText("VOY-M1-001")).toBeInTheDocument();
      expect(screen.getByText("VOY-M1-002")).toBeInTheDocument();
    });
  });

  it("shows vessel name and commencing year in list", async () => {
    render(<VoyagesList />);
    await waitFor(() => {
      expect(screen.getAllByText("MV FORTUNA").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calls onVoyageClick when voyage number is clicked", async () => {
    const onVoyageClick = vi.fn();
    render(<VoyagesList onVoyageClick={onVoyageClick} />);
    await waitFor(() => screen.getByText("VOY-M1-001"));
    fireEvent.click(screen.getByText("VOY-M1-001"));
    expect(onVoyageClick).toHaveBeenCalledWith("voyage-id-1");
  });

  it("clicking + New Voyage opens the modal", async () => {
    render(<VoyagesList />);
    await waitFor(() => screen.getByTestId("new-voyage-btn"));
    fireEvent.click(screen.getByTestId("new-voyage-btn"));
    expect(screen.getByTestId("new-voyage-modal")).toBeInTheDocument();
  });
});
