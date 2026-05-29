import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PortCallForm } from "../../components/PortCallPanel/PortCallForm";
import { render } from "../../test/test-utils";

describe("PortCallForm", () => {
  const mockPort = {
    id: "port1",
    name: "Singapore",
    timezone_name: "Asia/Singapore",
  };

  it("renders all form sections", () => {
    render(<PortCallForm port={mockPort} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("Actuals")).toBeInTheDocument();
    expect(screen.getByText("NOR & Clearance")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("displays the port timezone label", () => {
    render(<PortCallForm port={mockPort} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    
    expect(screen.getAllByText(/Asia\/Singapore/i).length).toBeGreaterThan(0);
  });

  it("validates that ATA is before ATB", () => {
    const onSubmit = vi.fn();
    const badData: import("../../api/schema").components["schemas"]["PortCallResponseDTO"] = {
      id: "pc1",
      voyage_id: "v1",
      port_id: "port1",
      status: "Berthed",
      timezone_name: "Asia/Singapore",
      free_pratique_granted: false,
      customs_cleared: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      ata: "2026-05-02T10:00:00Z",
      atb: "2026-05-01T10:00:00Z",
    };
    render(<PortCallForm port={mockPort} initialData={badData} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText(/Save Port Call/i));

    expect(screen.getByText(/Actual times must be monotonic/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
