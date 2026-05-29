import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { getStatusColor } from "./scheduleChartColors";
import type { components } from "../api/schema";

type VesselScheduleResponse = components["schemas"]["VesselScheduleResponse"];
type VoyageBarDTO = components["schemas"]["VoyageBarDTO"];

interface ChartDataItem {
  name: string;
  value: [number, number, number, VoyageBarDTO];
  itemStyle: {
    color: string;
  };
}

interface RenderItemParams {
  coordSys: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface RenderItemApi {
  value: (idx: number) => unknown;
  coord: (data: unknown[]) => [number, number];
  size: (data: unknown[]) => [number, number];
}

export function buildScheduleOption(data: VesselScheduleResponse): EChartsOption {
  const vessels = data.vessels ?? [];
  const vesselNames = vessels.map((v) => v.vessel_name);

  const seriesData: ChartDataItem[] = [];
  vessels.forEach((vessel, vesselIndex) => {
    vessel.voyages.forEach((voyage) => {
      const start = new Date(voyage.commencing_datetime).getTime();
      const end = voyage.expected_completing_datetime
        ? new Date(voyage.expected_completing_datetime).getTime()
        : start + 24 * 60 * 60 * 1000; // Default 1 day if missing

      seriesData.push({
        name: voyage.voyage_no,
        value: [vesselIndex, start, end, voyage],
        itemStyle: {
          color: getStatusColor(voyage.status),
        },
      });
    });
  });

  return {
    tooltip: {
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number, VoyageBarDTO] };
        const voyage = p.value[3];
        const ports = (voyage.port_sequence ?? []).map((port) => port.port_code).join(" → ");
        return `
          <div style="font-weight: bold; margin-bottom: 4px;">Voyage: ${voyage.voyage_no}</div>
          <div>Status: ${voyage.status}</div>
          <div>Charterer: ${voyage.charterer ?? "N/A"}</div>
          <div>Itinerary: ${ports || "N/A"}</div>
          <div>Start: ${new Date(voyage.commencing_datetime).toLocaleString()}</div>
          <div>End: ${voyage.expected_completing_datetime ? new Date(voyage.expected_completing_datetime).toLocaleString() : "N/A"}</div>
        `;
      },
    },
    grid: {
      height: vessels.length * 40, // 40px per vessel row
      top: 40,
      left: 150,
      right: 50,
      bottom: 80,
    },
    xAxis: {
      type: "time",
      position: "top",
      splitLine: {
        lineStyle: {
          color: "#E0E6F1",
        },
      },
    },
    yAxis: {
      data: vesselNames,
      inverse: true,
      splitLine: {
        show: true,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
    },
    dataZoom: [
      {
        type: "slider",
        filterMode: "weakFilter",
        showDataShadow: false,
        top: vessels.length * 40 + 80,
        labelFormatter: "",
      },
      {
        type: "inside",
        filterMode: "weakFilter",
      },
    ],
    series: [
      {
        type: "custom",
        renderItem: (params: unknown, api: unknown) => {
          const p = params as RenderItemParams;
          const a = api as RenderItemApi;
          
          const categoryIndex = a.value(0) as number;
          const startCoord = a.coord([a.value(1), categoryIndex]);
          const endCoord = a.coord([a.value(2), categoryIndex]);
          
          const size = a.size([0, 1]);
          const height = size[1] * 0.6;

          const rectShape = echarts.graphic.clipRectByRect(
            {
              x: startCoord[0],
              y: startCoord[1] - height / 2,
              width: endCoord[0] - startCoord[0],
              height: height,
            },
            {
              x: p.coordSys.x,
              y: p.coordSys.y,
              width: p.coordSys.width,
              height: p.coordSys.height,
            }
          );

          const voyage = a.value(3) as VoyageBarDTO;
          const label = `${voyage.voyage_no} ${voyage.current_next_port_code ?? ""}`;

          const barColor = getStatusColor(voyage.status);
          const textStyle = {
            text: label,
            x: rectShape ? rectShape.x + 5 : 0,
            y: rectShape ? rectShape.y + rectShape.height / 2 : 0,
            fill: "#fff",
            verticalAlign: "middle" as const,
            align: "left" as const,
            truncate: {
              width: rectShape ? rectShape.width - 10 : 0,
              ellipsis: "..",
            },
          };

          return {
            type: "group",
            children: [
              {
                type: "rect",
                ignore: !rectShape,
                shape: rectShape,
                style: {
                  fill: barColor,
                  opacity: 0.8,
                },
              },
              {
                type: "text",
                ignore: !rectShape || (rectShape && rectShape.width < 20),
                style: textStyle,
              },
            ],
          };
        },
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: seriesData,
      },
    ] as echarts.CustomSeriesOption[], 
  };
}
