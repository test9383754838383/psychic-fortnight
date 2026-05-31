import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PortCallPanel } from "../../components/PortCallPanel/PortCallPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import { components } from "../../api/schema";

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

describe("PortCallPanel", () => {
  const voyageId = "test-voyage-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'No port calls found' when list is empty", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({
      data: [],
      response: { ok: true } as unknown as Response,
    });

    render(<PortCallPanel voyageId={voyageId} />);

    await waitFor(() => {
      expect(screen.getByText(/No port calls found/i)).toBeInTheDocument();
    });
  });

  it("renders a list of port calls", async () => {
    const mockPortCalls: components["schemas"]["PortCallResponseDTO"][] = [
      {
        id: "pc1",
        voyage_id: voyageId,
        port_id: "port1",
        status: "Planned",
        eta: "2026-05-01T10:00:00Z",
        etd: "2026-05-02T18:00:00Z",
        timezone_name: "UTC",
        free_pratique_granted: false,
        customs_cleared: false,
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      },
    ];

    vi.mocked(apiClient.GET).mockResolvedValue({
      data: mockPortCalls,
      response: { ok: true } as unknown as Response,
    });

    render(<PortCallPanel voyageId={voyageId} />);

    await waitFor(() => {
      expect(screen.getAllByText("Planned")[0]).toBeInTheDocument();
      expect(screen.getByText(/2026-05-01/)).toBeInTheDocument();
    });
  });
});
