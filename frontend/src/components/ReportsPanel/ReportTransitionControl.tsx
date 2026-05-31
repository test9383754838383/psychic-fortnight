import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { LEGAL_REPORT_TRANSITIONS, MUTATION_ROLES } from "../../lib/operationalReportingConstants";

interface ReportTransitionControlProps {
  report: components["schemas"]["OperationalReportResponseDTO"];
  currentUser: components["schemas"]["UserResponseDTO"] | null;
  voyageId: string;
}

export function ReportTransitionControl({
  report,
  currentUser,
  voyageId,
}: ReportTransitionControlProps) {
  const queryClient = useQueryClient();

  const canMutate =
    currentUser?.roles.some((r) => MUTATION_ROLES.has(r)) ?? false;

  const nextStatuses = LEGAL_REPORT_TRANSITIONS[report.status] ?? [];

  const mutation = useMutation({
    mutationFn: async (body: components["schemas"]["ReportTransitionDTO"]) => {
      const { data, response } = await apiClient.POST(
        "/api/v1/reports/{report_id}/transition",
        {
          params: { path: { report_id: report.id } },
          body,
        }
      );
      if (!response.ok) throw new Error("Transition failed");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["voyage", voyageId, "reports"],
      });
    },
  });

  // Terminal state — nothing to show
  if (nextStatuses.length === 0) return null;

  // Viewer — locked indicator only
  if (!canMutate) return null;

  const STATUS_CLASS: Record<string, string> = {
    Queried: "btn-transition btn-transition--queried",
    Accepted: "btn-transition btn-transition--accepted",
    Rejected: "btn-transition btn-transition--rejected",
  };

  return (
    <div className="transition-control">
      {nextStatuses.map((status) => (
        <button
          key={status}
          className={STATUS_CLASS[status] ?? "btn-transition"}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ status })}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
