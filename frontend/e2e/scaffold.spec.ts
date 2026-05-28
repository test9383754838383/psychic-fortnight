import { test, expect } from "@playwright/test";

test("should load the application scaffold and display stable state", async ({ page }) => {
  await page.goto("/");

  // Assert page contains the exact scaffold success indicator string
  await expect(page.locator("body")).toContainText("Vessel & Voyage Operations Control System — scaffold OK");

  // Assert auth context is initialized with the mock backend-matching stub user ID
  const authUser = page.locator("[data-testid='auth-user-id']");
  await expect(authUser).toHaveText("test-user-id");
});
