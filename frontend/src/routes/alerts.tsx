import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "./router";
import { AlertsPage } from "./AlertsPage";

export const alertsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/alerts",
  component: AlertsPage,
});
