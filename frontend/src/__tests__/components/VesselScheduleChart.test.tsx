import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VesselScheduleChart } from "../../components/VesselScheduleChart";
import * as echarts from "echarts";

// Define a type for the mocked chart instance to avoid 'any'
interface MockChartInstance {
  setOption: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  convertToPixel: ReturnType<typeof vi.fn>;
}

vi.mock("echarts", () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    convertToPixel: vi.fn(() => [100, 100]),
  })),
  graphic: {
    clipRectByRect: vi.fn(),
  },
}));

describe("VesselScheduleChart", () => {
  const mockData = {
    vessels: [
      {
        vessel_id: "v1",
        vessel_name: "Vessel 1",
        voyages: [
          {
            voyage_id: "voy-1",
            voyage_no: "V001",
            status: "Commenced",
            commencing_datetime: "2026-05-01T00:00:00Z",
            expected_completing_datetime: "2026-05-10T00:00:00Z",
            port_sequence: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes echarts and sets option", () => {
    const onBarClick = vi.fn();
    render(<VesselScheduleChart data={mockData} onBarClick={onBarClick} />);

    expect(echarts.init).toHaveBeenCalled();
    const chartInstance = vi.mocked(echarts.init).mock.results[0]?.value as MockChartInstance;
    expect(chartInstance.setOption).toHaveBeenCalled();
    expect(chartInstance.on).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("renders DOM overlay buttons for voyages", () => {
    const onBarClick = vi.fn();
    render(<VesselScheduleChart data={mockData} onBarClick={onBarClick} />);

    expect(screen.getByTestId("voyage-bar-voy-1")).toBeInTheDocument();
  });

  it("disposes chart on unmount", () => {
    const onBarClick = vi.fn();
    const { unmount } = render(<VesselScheduleChart data={mockData} onBarClick={onBarClick} />);
    
    const chartInstance = vi.mocked(echarts.init).mock.results[0]?.value as MockChartInstance;
    unmount();
    expect(chartInstance.dispose).toHaveBeenCalled();
  });
});
