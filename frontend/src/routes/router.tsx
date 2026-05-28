/* eslint-disable react-refresh/only-export-components */
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { useCurrentUser } from "../auth/AuthContext";
import { RequireAuth } from "../auth/RequireAuth";

// Root Route - Layout wrapper
export const rootRoute = createRootRoute({
  component: () => (
    <div className="app-container">
      <Outlet />
    </div>
  ),
});

// Contract safety check: verify that backend schema changes break frontend typecheck
import type { components } from "../api/schema";
export const verifyContractSafe = (voyage: components["schemas"]["VoyageResponseDTO"]) => {
  return voyage.voyage_no;
};

function IndexPage() {
  const { currentUser } = useCurrentUser();
  return (
    <div>
      Vessel & Voyage Operations Control System — scaffold OK
      <div data-testid="auth-user-id" id="auth-user-id" style={{ display: "none" }}>
        {currentUser?.id ?? "none"}
      </div>
    </div>
  );
}

// Index Route - Renders the placeholder root route proving auth integration
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

// Authenticated Layout Route
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
});

// Placeholder child route to prevent empty layout route collision
export const authenticatedPlaceholderRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/authenticated-placeholder",
  component: () => <div>Guarded Zone Placeholder</div>,
});

// Build Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  authenticatedRoute.addChildren([authenticatedPlaceholderRoute]),
]);

// Create Router instance
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
export type AppRouter = typeof router;
export { routeTree };
