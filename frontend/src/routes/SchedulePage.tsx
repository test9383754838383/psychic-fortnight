import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ScheduleFilterBar, ScheduleFilters } from "../components/ScheduleFilterBar";
import { VesselScheduleChart } from "../components/VesselScheduleChart";
import { scheduleRoute } from "./schedule";

export function SchedulePage() {
  const searchFilters = scheduleRoute.useSearch();
  const navigate = useNavigate({ from: scheduleRoute.fullPath });

  // Fetch Schedule Data
  const { data: scheduleData, isLoading: isScheduleLoading } = useQuery({
    queryKey: ["schedule", searchFilters],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/schedule", {
        params: {
          query: {
            date_from: searchFilters.dateFrom,
            date_to: searchFilters.dateTo,
            vessel_ids: searchFilters.vesselIds.length > 0 ? searchFilters.vesselIds : undefined,
            status: searchFilters.statuses.length > 0 ? searchFilters.statuses : undefined,
            search: searchFilters.search || undefined,
          },
        },
      });
      if (!response.ok) throw new Error("Failed to fetch schedule");
      return data;
    },
  });

  // Fetch Vessels for filter dropdown
  const { data: vesselsData } = useQuery({
    queryKey: ["vessels"],
    queryFn: async () => {
      const { data, response } = await apiClient.GET("/api/v1/vessels");
      if (!response.ok) throw new Error("Failed to fetch vessels");
      return data;
    },
  });

  const availableVessels = (vesselsData as { id: string; name: string }[] | undefined)?.map((v) => ({
    id: v.id,
    name: v.name,
  })) ?? [];

  const handleFilterChange = (newFilters: ScheduleFilters) => {
    void navigate({ search: newFilters });
  };

  const handleBarClick = (voyageId: string) => {
    void navigate({
      to: "/voyages/$voyageId/workspace",
      params: { voyageId },
      search: (old: Record<string, unknown>) => ({ ...old }), 
    });
  };

  if (isScheduleLoading) {
    return <div style={{ padding: "2rem" }}>Loading Vessel Schedule...</div>;
  }

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 className="panel-title" style={{ textAlign: "left" }}>Vessel Schedule</h1>
        <p style={{ color: "var(--text-secondary)" }}>Read-only operational timeline for active vessels</p>
      </header>

      <ScheduleFilterBar
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        availableVessels={availableVessels}
      />

      {scheduleData && (
        <div className="glass-panel" style={{ padding: "1.5rem", maxWidth: "none" }}>
          <VesselScheduleChart data={scheduleData} onBarClick={handleBarClick} />
        </div>
      )}
    </div>
  );
}
