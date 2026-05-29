import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StatusTransitionControl } from "../../components/PortCallPanel/StatusTransitionControl";
import { render } from "../../test/test-utils";
import { components } from "../../api/schema";

describe("StatusTransitionControl", () => {
  const mockPortCall: components["schemas"]["PortCallResponseDTO"] = {
    id: "pc1",
    voyage_id: "v1",
    port_id: "p1",
    status: "Planned",
    timezone_name: "UTC",
    free_pratique_granted: false,
    customs_cleared: false,
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
  };

  it("renders legal next transitions for 'Planned' status", () => {
    render(<StatusTransitionControl portCall={mockPortCall} onTransition={vi.fn()} />);

    expect(screen.getByText("Arrived at Pilot Station")).toBeInTheDocument();
    expect(screen.getByText("At Anchor")).toBeInTheDocument();
    expect(screen.getByText("Berthed")).toBeInTheDocument();
    
    // Should NOT show Departed or Cargo Ops Completed
    expect(screen.queryByText("Departed")).not.toBeInTheDocument();
    expect(screen.queryByText("Cargo Ops Completed")).not.toBeInTheDocument();
  });

  it("calls onTransition when a transition button is clicked", () => {
    const onTransition = vi.fn();
    render(<StatusTransitionControl portCall={mockPortCall} onTransition={onTransition} />);

    fireEvent.click(screen.getByText("Berthed"));

    expect(onTransition).toHaveBeenCalledWith("Berthed");
  });
});
