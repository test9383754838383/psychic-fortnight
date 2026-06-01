import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "./router";
import { TasksPage } from "./TasksPage";

export const tasksRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/tasks",
  component: TasksPage,
});
