import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { REPORT_TYPES, VOYAGE_ANCHORED_REPORT_TYPES, ReportType } from "../../lib/operationalReportingConstants";

interface ReportFormProps {
  voyageId: string;
  portCallId: string | null;
  report?: components["schemas"]["OperationalReportResponseDTO"];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReportForm({
  voyageId,
  portCallId,
  report,
  onSuccess,
  onCancel,
}: ReportFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!report;

  const [reportType, setReportType] = useState<string>(
    report?.report_type ?? REPORT_TYPES[0]
  );
  const [positionLat, setPositionLat] = useState<string>(
    report?.position_lat?.toString() ?? ""
  );
  const [positionLon, setPositionLon] = useState<string>(
    report?.position_lon?.toString() ?? ""
  );
  const [speed24h, setSpeed24h] = useState<string>(
    report?.speed_24h?.toString() ?? ""
  );
  const [distanceToGo, setDistanceToGo] = useState<string>(
    report?.distance_to_go?.toString() ?? ""
  );
  const [etaNextPort, setEtaNextPort] = useState<string>(
    report?.eta_next_port ?? ""
  );
  const [bunkerRobTotalMt, setBunkerRobTotalMt] = useState<string>(
    report?.bunker_rob_total_mt?.toString() ?? ""
  );
  const [supersedesReportId, setSupersedesReportId] = useState<string>(
    report?.supersedes_report_id ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const isNoon = VOYAGE_ANCHORED_REPORT_TYPES.has(reportType as ReportType);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async ({
      body,
      isNoonReport,
    }: {
      body: components["schemas"]["ReportCreateDTO"];
      isNoonReport: boolean;
    }) => {
      if (isNoonReport) {
        const { data, response } = await apiClient.POST(
          "/api/v1/voyages/{voyage_id}/reports",
          {
            params: { path: { voyage_id: voyageId } },
            body,
          }
        );
        if (!response.ok) throw new Error("Failed to create Noon report");
        return data;
      } else {
        if (!portCallId) throw new Error("Port call is required for this report type");
        const { data, response } = await apiClient.POST(
          "/api/v1/port-calls/{port_call_id}/reports",
          {
            params: { path: { port_call_id: portCallId } },
            body,
          }
        );
        if (!response.ok) throw new Error(`Failed to create ${reportType} report`);
        return data;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["voyage", voyageId, "reports"],
      });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (body: components["schemas"]["ReportUpdateDTO"]) => {
      if (!report) throw new Error("No report to update");
      const { data, response } = await apiClient.PATCH(
        "/api/v1/reports/{report_id}",
        {
          params: { path: { report_id: report.id } },
          body,
        }
      );
      if (!response.ok) throw new Error("Failed to update report");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["voyage", voyageId, "reports"],
      });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const commonData = {
      position_lat: isNoon && positionLat ? Number(positionLat) : null,
      position_lon: isNoon && positionLon ? Number(positionLon) : null,
      speed_24h: isNoon && speed24h ? Number(speed24h) : null,
      distance_to_go: isNoon && distanceToGo ? Number(distanceToGo) : null,
      eta_next_port: isNoon && etaNextPort ? etaNextPort : null,
      bunker_rob_total_mt: isNoon && bunkerRobTotalMt ? Number(bunkerRobTotalMt) : null,
      supersedes_report_id: supersedesReportId.trim() || null,
    };

    if (isEditMode) {
      updateMutation.mutate(commonData);
    } else {
      createMutation.mutate({
        body: {
          report_type: reportType,
          ...commonData,
        },
        isNoonReport: isNoon,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="report-form" aria-label={isEditMode ? "Edit Report" : "Create Report"}>
      <h4 className="form-title">{isEditMode ? "Edit Report" : "Create New Report"}</h4>

      <div className="form-group">
        <label htmlFor="report-type" id="report-type-label">Report Type</label>
        <select
          id="report-type"
          aria-labelledby="report-type-label"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          disabled={isEditMode}
        >
          {REPORT_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>
      </div>

      {isNoon && (
        <div className="voyage-only-fields" data-testid="voyage-only-fields">
          <div className="form-group">
            <label htmlFor="position-lat">Position Lat</label>
            <input
              id="position-lat"
              type="number"
              step="any"
              value={positionLat}
              onChange={(e) => setPositionLat(e.target.value)}
              placeholder="e.g. 54.1234"
            />
          </div>

          <div className="form-group">
            <label htmlFor="position-lon">Position Lon</label>
            <input
              id="position-lon"
              type="number"
              step="any"
              value={positionLon}
              onChange={(e) => setPositionLon(e.target.value)}
              placeholder="e.g. 12.5678"
            />
          </div>

          <div className="form-group">
            <label htmlFor="speed">Speed</label>
            <input
              id="speed"
              type="number"
              step="any"
              value={speed24h}
              onChange={(e) => setSpeed24h(e.target.value)}
              placeholder="Average speed in knots"
            />
          </div>

          <div className="form-group">
            <label htmlFor="distance-to-go">Distance To Go</label>
            <input
              id="distance-to-go"
              type="number"
              step="any"
              value={distanceToGo}
              onChange={(e) => setDistanceToGo(e.target.value)}
              placeholder="Distance in nautical miles"
            />
          </div>

          <div className="form-group">
            <label htmlFor="eta-next-port">ETA Next Port</label>
            <input
              id="eta-next-port"
              type="datetime-local"
              value={etaNextPort ? etaNextPort.substring(0, 16) : ""}
              onChange={(e) => {
                const val = e.target.value;
                setEtaNextPort(val ? new Date(val).toISOString() : "");
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bunker-rob">Bunker ROB Total MT</label>
            <input
              id="bunker-rob"
              type="number"
              step="any"
              value={bunkerRobTotalMt}
              onChange={(e) => setBunkerRobTotalMt(e.target.value)}
              placeholder="Metric Tons remaining on board"
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="supersedes-report-id">Supersedes Report ID</label>
        <input
          id="supersedes-report-id"
          type="text"
          value={supersedesReportId}
          onChange={(e) => setSupersedesReportId(e.target.value)}
          placeholder="UUID of report to supersede (optional)"
        />
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-primary"
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : "Save Report"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
