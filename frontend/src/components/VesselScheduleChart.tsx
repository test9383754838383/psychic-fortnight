import React, { useEffect, useRef, useMemo, useState } from "react";
import * as echarts from "echarts";
import { buildScheduleOption } from "../lib/scheduleChartOption";
import type { components } from "../api/schema";

type VesselScheduleResponse = components["schemas"]["VesselScheduleResponse"];
type VoyageBarDTO = components["schemas"]["VoyageBarDTO"];

interface VesselScheduleChartProps {
  data: VesselScheduleResponse;
  onBarClick: (voyageId: string) => void;
}

interface OverlayBar {
  voyage_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const VesselScheduleChart: React.FC<VesselScheduleChartProps> = ({
  data,
  onBarClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [overlayBars, setOverlayBars] = useState<OverlayBar[]>([]);

  // Memoize option to avoid unnecessary updates
  const option = useMemo(() => buildScheduleOption(data), [data]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;

    chart.on("click", (params: echarts.ECElementEvent) => {
      if (params.seriesType === "custom" && params.value) {
        const val = params.value as [number, number, number, VoyageBarDTO];
        const voyage = val[3];
        if (voyage?.voyage_id) {
          onBarClick(voyage.voyage_id);
        }
      }
    });

    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [onBarClick]);

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setOption(option, { notMerge: true });
      
      const bars: OverlayBar[] = [];
      data.vessels?.forEach((vessel, vesselIndex) => {
        vessel.voyages.forEach((voyage) => {
          const startMs = new Date(voyage.commencing_datetime).getTime();
          const endMs = voyage.expected_completing_datetime
            ? new Date(voyage.expected_completing_datetime).getTime()
            : startMs + 24 * 60 * 60 * 1000;

          const startPixel = instanceRef.current?.convertToPixel({ seriesIndex: 0 }, [startMs, vesselIndex]);
          const endPixel = instanceRef.current?.convertToPixel({ seriesIndex: 0 }, [endMs, vesselIndex]);
          
          if (startPixel && endPixel && startPixel[0] !== undefined && startPixel[1] !== undefined && endPixel[0] !== undefined) {
            const height = 24; // Matches 40 * 0.6 from buildScheduleOption
            bars.push({
              voyage_id: voyage.voyage_id,
              x: startPixel[0],
              y: startPixel[1] - height / 2,
              width: endPixel[0] - startPixel[0],
              height: height,
            });
          }
        });
      });
      setOverlayBars(bars);
    }
  }, [option, data]);

  return (
    <div style={{ position: "relative", width: "100%", height: "600px" }}>
      <div
        ref={chartRef}
        style={{ width: "100%", height: "100%" }}
        data-testid="vessel-schedule-canvas"
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {overlayBars.map((bar) => (
          <button
            key={bar.voyage_id}
            data-testid={`voyage-bar-${bar.voyage_id}`}
            onClick={() => onBarClick(bar.voyage_id)}
            style={{
              position: "absolute",
              left: `${bar.x}px`,
              top: `${bar.y}px`,
              width: `${Math.max(bar.width, 1)}px`,
              height: `${bar.height}px`,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              pointerEvents: "auto",
              padding: 0,
              margin: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};
