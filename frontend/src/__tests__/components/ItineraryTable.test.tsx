import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ItineraryTable } from "../../components/ItineraryTable";

describe("ItineraryTable", () => {
  const mockItinerary = [
    {
      sequence_no: 1,
      port_code: "NLRTM",
      planned_eta: "2026-05-01T10:00:00Z",
      planned_etd: "2026-05-02T18:00:00Z",
    },
    {
      sequence_no: 2,
      port_code: "SGSIN",
      planned_eta: "2026-05-20T08:00:00Z",
      planned_etd: "2026-05-21T12:00:00Z",
    },
  ];

  it("renders ordered itinerary rows", () => {
    render(<ItineraryTable itinerary={mockItinerary} />);

    const rows = screen.getAllByRole("row");
    // Row 0 is header, Row 1 is Seq 1, Row 2 is Seq 2
    expect(rows[1]).toHaveTextContent("1");
    expect(rows[1]).toHaveTextContent("NLRTM");
    expect(rows[2]).toHaveTextContent("2");
    expect(rows[2]).toHaveTextContent("SGSIN");
  });
});
