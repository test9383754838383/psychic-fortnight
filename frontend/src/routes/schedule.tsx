import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticatedRoute } from "./router";
import { subDays, addDays, format } from "date-fns";
import { SchedulePage } from "./SchedulePage";

// Route search schema via Zod (D-LOCK-6)
const today = new Date();
const defaultDateFrom = format(subDays(today, 30), "yyyy-MM-dd");
const defaultDateTo = format(addDays(today, 30), "yyyy-MM-dd");

export const scheduleSearchSchema = z.object({
  dateFrom: z.string().default(defaultDateFrom),
  dateTo: z.string().default(defaultDateTo),
  vesselIds: z.array(z.string()).default([]),
  statuses: z.array(z.string()).default([]),
  search: z.string().default(""),
});

export const scheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/schedule",
  validateSearch: (search) => scheduleSearchSchema.parse(search),
  component: SchedulePage,
});
