import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Schedule to Workspace flow", async ({ page }) => {
  // 1. Login
  await page.goto("/schedule"); 
  
  // Wait for loading to finish
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  // If not logged in, we should see the Authentication Required message
  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  if (await loginButton.isVisible()) {
      await loginButton.click();
  }
  
  // 2. Verify Schedule Page
  await expect(page.locator("h1")).toHaveText("Vessel Schedule", { timeout: 10000 });
  await expect(page.getByTestId("vessel-schedule-canvas")).toBeVisible();

  // 3. Apply Filter (Search)
  const searchInput = page.getByPlaceholder("e.g. V001");
  await searchInput.fill("V001");
  
  // Wait for debounce and URL update
  await page.waitForFunction(() => {
    return new URL(window.location.href).searchParams.get("search") === "V001";
  });

  // 4. Click Voyage Bar
  const voyageBar = page.getByTestId("voyage-bar-00000000-0000-0000-0000-000000000002");
  await expect(voyageBar).toBeVisible({ timeout: 10000 });
  await voyageBar.click();
  
  // 5. Verify Workspace Page
  await page.waitForURL("**/voyages/00000000-0000-0000-0000-000000000002/workspace**");
  await expect(page.locator("h1")).toContainText("Voyage V001");
  await expect(page.locator("text=Itinerary")).toBeVisible();
  await expect(page.locator("text=E2E CHARTERER")).toBeVisible();

  // 6. Go Back
  await page.click('text=Back to Schedule');
  await page.waitForURL("**/schedule**");
  
  // Verify filters are preserved
  expect(new URL(page.url()).searchParams.get("search")).toBe("V001");
});
