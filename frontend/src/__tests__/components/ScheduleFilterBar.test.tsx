import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ScheduleFilterBar } from "../../components/ScheduleFilterBar";

describe("ScheduleFilterBar", () => {
  const mockFilters = {
    dateFrom: "2026-05-01",
    dateTo: "2026-05-31",
    vesselIds: [],
    statuses: [],
    search: "",
  };

  const mockVessels = [
    { id: "v1", name: "Vessel 1" },
    { id: "v2", name: "Vessel 2" },
  ];

  it("renders with initial filters", () => {
    const onFilterChange = vi.fn();
    render(
      <ScheduleFilterBar
        filters={mockFilters}
        onFilterChange={onFilterChange}
        availableVessels={mockVessels}
      />
    );

    expect(screen.getByPlaceholderText("e.g. V001")).toHaveValue("");
  });

  it("calls onFilterChange when search input changes (debounced)", () => {
    vi.useFakeTimers();
    const onFilterChange = vi.fn();
    render(
      <ScheduleFilterBar
        filters={mockFilters}
        onFilterChange={onFilterChange}
        availableVessels={mockVessels}
      />
    );

    const searchInput = screen.getByPlaceholderText("e.g. V001");
    fireEvent.change(searchInput, { target: { value: "V001" } });

    // Should not call immediately
    expect(onFilterChange).not.toHaveBeenCalled();

    // Fast-forward debounce time
    vi.advanceTimersByTime(300);

    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      search: "V001",
    }));
    vi.useRealTimers();
  });

  it("displays available vessels when 'Select vessel...' is clicked", () => {
    const onFilterChange = vi.fn();
    render(
      <ScheduleFilterBar
        filters={mockFilters}
        onFilterChange={onFilterChange}
        availableVessels={mockVessels}
      />
    );

    const selectVesselBtn = screen.getByText("Select vessel...");
    fireEvent.click(selectVesselBtn);

    expect(screen.getByText("Vessel 1")).toBeInTheDocument();
    expect(screen.getByText("Vessel 2")).toBeInTheDocument();
  });
});
