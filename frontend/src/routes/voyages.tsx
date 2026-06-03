import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticatedRoute } from "./router";
import { VoyagesPage } from "./VoyagesPage";

export const voyagesSearchSchema = z.object({
  vessel_id: z.string().default(""),
  ops_coordinator: z.string().default(""),
  trade_area: z.string().default(""),
  search: z.string().default(""),
});

export const voyagesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/voyages",
  validateSearch: (search) => voyagesSearchSchema.parse(search),
  component: VoyagesPage,
});
