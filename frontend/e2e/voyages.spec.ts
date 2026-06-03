import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("voyages list shows active voyage and navigates to Voyage Manager with Properties save", async ({
  page,
}) => {
  await page.goto("/voyages");
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  await loginButton.click();
  await expect(loginButton).toBeHidden();

  await expect(page.locator("h1")).toHaveText("Voyages", { timeout: 10000 });

  // Seeded voyage V001 (status: Commenced) is in the active default view
  await expect(page.locator('button:has-text("V001")')).toBeVisible({ timeout: 10000 });

  // Vessel name resolved from /api/v1/vessels
  await expect(page.locator("text=E2E TEST VESSEL").first()).toBeVisible({ timeout: 10000 });

  // Click voyage number → navigates to Voyage Manager
  await page.locator('button:has-text("V001")').click();
  await page.waitForURL("**/voyages/00000000-0000-0000-0000-000000000002**", {
    timeout: 10000,
  });

  await expect(page.getByTestId("voyage-header-no")).toHaveText("V001");

  // Properties panel is open by default
  await expect(page.getByTestId("ops-coordinator-input")).toBeVisible({ timeout: 10000 });

  // Edit and save an M1 field
  await page.getByTestId("ops-coordinator-input").fill("test-coordinator");
  await page.getByTestId("save-properties-btn").click();

  // Save completes — button returns to "Save", no error banner
  await expect(page.getByTestId("save-properties-btn")).toHaveText("Save", {
    timeout: 5000,
  });
  await expect(page.locator("text=Failed to save.")).not.toBeVisible();
});

test("itinerary line can be added and voyage summary updates", async ({ page }) => {
  await page.goto("/voyages");
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  await loginButton.click();
  await expect(loginButton).toBeHidden();

  await page.waitForURL("**/voyages**", { timeout: 10000 });
  await page.locator('button:has-text("V001")').click();
  await page.waitForURL("**/voyages/00000000-0000-0000-0000-000000000002**", { timeout: 10000 });

  // ITINERARY tab is active by default
  await expect(page.getByTestId("content-tab-itinerary")).toBeVisible({ timeout: 10000 });

  // Click + Add Port
  await page.getByTestId("add-port-btn").click();
  await expect(page.getByTestId("port-select")).toBeVisible({ timeout: 5000 });

  // Select the seeded Rotterdam port
  await page.getByTestId("port-select").selectOption({ label: /Rotterdam/ });
  await page.getByTestId("port-fn-select").selectOption("Load");

  // ETA and ETD: 1 day apart
  await page.getByTestId("eta-input").fill("2026-07-01T08:00");
  await page.getByTestId("etd-input").fill("2026-07-02T08:00");

  // Speed 12 kts, distance 288 nm → sea_days = 1.0
  await page.getByTestId("speed-input").fill("12");
  await page.getByTestId("distance-input").fill("288");
  await page.getByTestId("eca-input").fill("0");

  await page.getByTestId("save-row-btn").click();

  // After save: summary updates
  await expect(page.getByTestId("summary-port-days")).toContainText("1.00", { timeout: 10000 });
  await expect(page.getByTestId("summary-sea-days")).toContainText("1.00", { timeout: 10000 });
  await expect(page.locator("text=Failed to add port")).not.toBeVisible();
});

test("New Voyage modal creates voyage and it appears in list", async ({ page }) => {
  const voyageNo = `E2E-VOY-${Date.now()}`;

  await page.goto("/voyages");
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  await loginButton.click();
  await expect(loginButton).toBeHidden();

  await expect(page.locator("h1")).toHaveText("Voyages", { timeout: 10000 });

  await page.getByTestId("new-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).toBeVisible();

  await page.getByTestId("voyage-no-input").fill(voyageNo);
  await page.getByTestId("vessel-select").selectOption({ label: "E2E TEST VESSEL" });

  await page.getByTestId("create-voyage-btn").click();

  // Modal closes after successful creation
  await expect(page.getByTestId("new-voyage-modal")).not.toBeVisible({ timeout: 10000 });

  // New voyage is Scheduled (active) — appears in default list view
  await expect(page.locator(`button:has-text("${voyageNo}")`)).toBeVisible({
    timeout: 10000,
  });
});
