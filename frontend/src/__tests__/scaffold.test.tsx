import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { AuthProvider } from "../auth/AuthContext";
import { indexRoute } from "../routes/router";
import { describe, it, expect } from "vitest";

describe("Scaffold Component Unit Tests", () => {
  it("renders exactly the scaffold success string and auth hydration in hidden elements", async () => {
    const Component = indexRoute.options.component!;

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Component />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Assert that the exact scaffold status string is rendered on the screen
    expect(
      screen.getByText("Vessel & Voyage Operations Control System — scaffold OK")
    ).toBeInTheDocument();

    // Verify there is no extra visible feature UI or headings
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    // Wait for the auth context stub to hydrate (immediate mock hydration)
    await waitFor(() => {
      expect(screen.getByTestId("auth-user-id")).toHaveTextContent("test-user-id");
    });
  });
});
