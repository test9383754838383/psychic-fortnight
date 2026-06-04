import { createRoute, useNavigate } from "@tanstack/react-router";
import { authenticatedRoute } from "./router";
import { VoyageManagerContent } from "./VoyageManagerPage";

export const voyageManagerRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/voyages/$voyageId",
  component: function VoyageManagerPage() {
    const { voyageId } = voyageManagerRoute.useParams();
    const navigate = useNavigate();
    return (
      <VoyageManagerContent
        voyageId={voyageId}
        onBack={() =>
          void navigate({
            to: "/voyages",
            search: { vessel_id: "", ops_coordinator: "", trade_area: "", search: "" },
          })
        }
      />
    );
  },
});
