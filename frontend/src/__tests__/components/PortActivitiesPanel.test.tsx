import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { PortActivitiesPanel } from "../../components/PortActivitiesPanel/PortActivitiesPanel";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
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

const MOCK_LINE: components["schemas"]["ItineraryLineResponseDTO"] = {
  id: "line-id-1",
  voyage_id: "voyage-id-1",
  sequence_no: 0,
  port_ref: "port-id-1",
  port_function: "Load",
  planned_eta: "2026-06-10T08:00:00Z",
  planned_etd: "2026-06-12T08:00:00Z",
  speed_kts: null,
  distance_nm: null,
  eca_nm: null,
  port_days: 2.0,
  sea_days: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const MOCK_PORT_CALL: components["schemas"]["PortCallResponseDTO"] = {
  id: "pc-id-1",
  voyage_id: "voyage-id-1",
  port_id: "port-id-1",
  itinerary_line_id: "line-id-1",
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

const MOCK_ACTIVITY: components["schemas"]["PortActivityResponseDTO"] = {
  id: "act-id-1",
  port_call_id: "pc-id-1",
  event_type: "NOR Tendered",
  event_timestamp: "2026-06-10T09:00:00Z",
  recorded_by_user_id: "user-id-1",
  notes: "Tendered at anchorage",
  corrects_activity_id: null,
  correction_reason: null,
  created_at: "2026-06-01T00:00:00Z",
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}

function created(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 201 }) });
}

describe("PortActivitiesPanel", () => {
  const onRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/ports") return ok([MOCK_PORT]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([MOCK_PORT_CALL]);
      if (path === "/api/v1/port-calls/{port_call_id}/events") return ok([MOCK_ACTIVITY]);
      return ok([]);
    });
  });

  it("renders port selector with itinerary lines", async () => {
    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("port-selector")).toBeInTheDocument();
      expect(screen.getByText(/Rotterdam.*Load/)).toBeInTheDocument();
    });
  });

  it("shows Start Port Call when no port call exists for selected line", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/ports") return ok([MOCK_PORT]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      return ok([]);
    });

    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("start-port-call-btn")).toBeInTheDocument();
    });
  });

  it("shows port call status and draft inputs when port call exists", async () => {
    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("port-call-status")).toBeInTheDocument();
    });
    expect(screen.getByTestId("arrival-draft-fwd-input")).toBeInTheDocument();
    expect(screen.getByTestId("arrival-draft-aft-input")).toBeInTheDocument();
    expect(screen.getByTestId("departure-draft-fwd-input")).toBeInTheDocument();
    expect(screen.getByTestId("departure-draft-aft-input")).toBeInTheDocument();
    expect(screen.getByTestId("save-port-call-btn")).toBeInTheDocument();
  });

  it("renders existing activities in timeline", async () => {
    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("NOR Tendered")).toBeInTheDocument();
    });
    expect(screen.getByText("Tendered at anchorage")).toBeInTheDocument();
    expect(screen.getByTestId(`activity-row-${MOCK_ACTIVITY.id}`)).toBeInTheDocument();
  });

  it("add activity form opens, fills, and submits", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created(MOCK_ACTIVITY));

    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() => expect(screen.getByTestId("add-activity-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("add-activity-btn"));
    expect(screen.getByTestId("activity-type-select")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("activity-type-select"), {
      target: { value: "Berthed" },
    });
    fireEvent.change(screen.getByTestId("activity-timestamp-input"), {
      target: { value: "2026-06-10T14:00" },
    });
    fireEvent.change(screen.getByTestId("activity-notes-input"), {
      target: { value: "Berthed at terminal 3" },
    });

    fireEvent.click(screen.getByTestId("save-activity-btn"));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/port-calls/{port_call_id}/events",
        expect.objectContaining({
          params: { path: { port_call_id: "pc-id-1" } },
        })
      );
    });
  });

  it("correct activity pre-fills form with corrects_activity_id", async () => {
    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[MOCK_LINE]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() =>
      expect(screen.getByTestId(`correct-activity-btn-${MOCK_ACTIVITY.id}`)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`correct-activity-btn-${MOCK_ACTIVITY.id}`));

    expect(screen.getByTestId("correction-reason-input")).toBeInTheDocument();
    expect(screen.getByTestId("activity-type-select")).toBeInTheDocument();
    const typeSelect = screen.getByTestId("activity-type-select") as HTMLSelectElement;
    expect(typeSelect.value).toBe("NOR Tendered");
  });

  it("shows empty state with no itinerary lines", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/ports") return ok([]);
      if (path === "/api/v1/voyages/{voyage_id}/port-calls") return ok([]);
      return ok([]);
    });

    render(
      <PortActivitiesPanel
        voyageId="voyage-id-1"
        itineraryLines={[]}
        onRefetch={onRefetch}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/Add ports in the Itinerary tab first/)).toBeInTheDocument();
    });
  });
});
