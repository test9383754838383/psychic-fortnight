import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "./router";
import { VoyageWorkspacePage } from "./VoyageWorkspacePage";

export const voyageWorkspaceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/voyages/$voyageId/workspace",
  component: VoyageWorkspacePage,
});
