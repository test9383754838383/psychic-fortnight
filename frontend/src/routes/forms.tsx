import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "./router";
import { FormsPage } from "./FormsPage";

export const formsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/forms",
  component: FormsPage,
});
