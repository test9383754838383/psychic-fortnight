import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentAppointmentSection } from "../../components/PortCallPanel/AgentAppointmentSection";
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

describe("AgentAppointmentSection", () => {
  const portCallId = "pc1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'No active agent' when there are no appointments", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path: string) => {
      if (path === "/api/v1/port-calls/{port_call_id}/agent-appointments") {
        return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/counterparties") {
        return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
      }
      return Promise.reject(new Error("Unknown path"));
    });

    render(<AgentAppointmentSection portCallId={portCallId} />);

    await waitFor(() => {
      expect(screen.getByText(/No active agent/i)).toBeInTheDocument();
    });
  });

  it("renders the active agent and nomination history", async () => {
    const mockAppointments: components["schemas"]["AgentAppointmentResponseDTO"][] = [
      {
        id: "app1",
        port_call_id: portCallId,
        agent_ref: "agent1",
        status: "Appointed",
        appointed_date: "2026-05-01",
        created_at: "2026-05-01T10:00:00Z",
        updated_at: "2026-05-01T11:00:00Z",
      },
    ];

    vi.mocked(apiClient.GET).mockImplementation((path: string) => {
      if (path === "/api/v1/port-calls/{port_call_id}/agent-appointments") {
        return Promise.resolve({ data: mockAppointments, response: { ok: true } as unknown as Response });
      }
      if (path === "/api/v1/counterparties") {
        return Promise.resolve({ data: [], response: { ok: true } as unknown as Response });
      }
      return Promise.reject(new Error("Unknown path"));
    });

    render(<AgentAppointmentSection portCallId={portCallId} />);

    await waitFor(() => {
      expect(screen.getByText(/Agent Ref: agent1/i)).toBeInTheDocument();
      expect(screen.getByText("Status: Appointed")).toBeInTheDocument();
    });
  });
});
