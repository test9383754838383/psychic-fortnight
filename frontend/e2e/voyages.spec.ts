import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execSync } from "child_process";

// Fixed session seeded by seed_e2e_user.py — injected as a cookie so tests
// never hit the Argon2-backed login endpoint during parallel execution.
const E2E_SESSION_ID = "e2e-fixed-session-00000000000000000000000000000001";

test.beforeAll(() => {
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

async function withAuth(page: Page): Promise<void> {
  await page.context().addCookies([{
    name: "session_id",
    value: E2E_SESSION_ID,
    domain: "localhost",
    path: "/",
    expires: Date.now() / 1000 + 365 * 24 * 3600,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  }]);
}

test("voyages list shows active voyage and navigates to Voyage Manager with Properties save", async ({
  page,
}) => {
  await withAuth(page);
  await page.goto("/voyages");

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

  // Properties panel is open by default — coordinator is now a select picker
  await expect(page.getByTestId("ops-coordinator-select")).toBeVisible({ timeout: 10000 });

  // Select the seeded operator user and save
  await page.getByTestId("ops-coordinator-select").selectOption({ label: "operator" });
  await page.getByTestId("save-properties-btn").click();

  // Save completes — button returns to "Save", no error banner
  await expect(page.getByTestId("save-properties-btn")).toHaveText("Save", {
    timeout: 5000,
  });
  await expect(page.locator("text=Failed to save.")).not.toBeVisible();
});

test("itinerary line can be added and voyage summary updates", async ({ page }) => {
  const voyageNo = `ITIN-E2E-${Date.now()}`;

  await withAuth(page);
  await page.goto("/voyages");

  await expect(page.locator("h1")).toHaveText("Voyages", { timeout: 10000 });

  // Create a fresh voyage so this test is idempotent across runs
  await page.getByTestId("new-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).toBeVisible();
  await page.getByTestId("voyage-no-input").fill(voyageNo);
  await page.getByTestId("vessel-select").selectOption({ label: "E2E TEST VESSEL" });
  await page.getByTestId("create-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).not.toBeVisible({ timeout: 10000 });

  // Navigate to the new voyage's Manager page
  await expect(page.locator(`button:has-text("${voyageNo}")`)).toBeVisible({ timeout: 10000 });
  await page.locator(`button:has-text("${voyageNo}")`).click();
  await page.waitForURL("**/voyages/**", { timeout: 10000 });

  // ITINERARY tab is active by default
  await expect(page.getByTestId("content-tab-itinerary")).toBeVisible({ timeout: 10000 });

  // Click + Add Port
  await page.getByTestId("add-port-btn").click();
  await expect(page.getByTestId("port-select")).toBeVisible({ timeout: 5000 });

  // Select the seeded Rotterdam port (id seeded as 00000000-0000-0000-0000-000000000003)
  await page.getByTestId("port-select").selectOption({ value: "00000000-0000-0000-0000-000000000003" });
  await page.getByTestId("port-fn-select").selectOption("Load");

  // ETA and ETD: 1 day apart
  await page.getByTestId("eta-input").fill("2026-07-01T08:00");
  await page.getByTestId("etd-input").fill("2026-07-02T08:00");

  // Speed 12 kts, distance 288 nm → sea_days = 288/(12*24) = 1.0
  await page.getByTestId("speed-input").fill("12");
  await page.getByTestId("distance-input").fill("288");
  await page.getByTestId("eca-input").fill("0");

  await page.getByTestId("save-row-btn").click();

  // Fresh voyage has 0 existing lines → after adding 1: port_days=1.00, sea_days=1.00
  await expect(page.getByTestId("summary-port-days")).toContainText("1.00", { timeout: 10000 });
  await expect(page.getByTestId("summary-sea-days")).toContainText("1.00", { timeout: 10000 });
  await expect(page.locator("text=Failed to add port")).not.toBeVisible();
});

test("port activities: start port call, add activity, save drafts", async ({ page }) => {
  const voyageNo = `PORT-ACT-E2E-${Date.now()}`;

  await withAuth(page);
  await page.goto("/voyages");
  await expect(page.locator("h1")).toHaveText("Voyages", { timeout: 10000 });

  // Create a fresh voyage
  await page.getByTestId("new-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).toBeVisible();
  await page.getByTestId("voyage-no-input").fill(voyageNo);
  await page.getByTestId("vessel-select").selectOption({ label: "E2E TEST VESSEL" });
  await page.getByTestId("create-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).not.toBeVisible({ timeout: 10000 });

  // Navigate to the new voyage
  await expect(page.locator(`button:has-text("${voyageNo}")`)).toBeVisible({ timeout: 10000 });
  await page.locator(`button:has-text("${voyageNo}")`).click();
  await page.waitForURL("**/voyages/**", { timeout: 10000 });

  // Add a port in the Itinerary tab first
  await expect(page.getByTestId("add-port-btn")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("add-port-btn").click();
  await page.getByTestId("port-select").selectOption({ value: "00000000-0000-0000-0000-000000000003" });
  await page.getByTestId("port-fn-select").selectOption("Load");
  await page.getByTestId("eta-input").fill("2026-08-01T08:00");
  await page.getByTestId("etd-input").fill("2026-08-03T08:00");
  await page.getByTestId("save-row-btn").click();
  await expect(page.getByTestId("summary-port-days")).toBeVisible({ timeout: 10000 });

  // Switch to PORT ACTIVITIES tab
  await page.getByTestId("content-tab-port-activities").click();
  await expect(page.getByTestId("port-selector")).toBeVisible({ timeout: 10000 });

  // No port call yet — Start Port Call button should appear
  await expect(page.getByTestId("start-port-call-btn")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("start-port-call-btn").click();

  // Port call created — header + status chip + draft inputs visible
  await expect(page.getByTestId("port-call-status")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("arrival-draft-fwd-input")).toBeVisible();

  // Save arrival drafts
  await page.getByTestId("arrival-draft-fwd-input").fill("6.50");
  await page.getByTestId("arrival-draft-aft-input").fill("6.80");
  await page.getByTestId("save-port-call-btn").click();
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });

  // Add NOR Tendered activity
  await page.getByTestId("add-activity-btn").click();
  await page.getByTestId("activity-type-select").selectOption("NOR Tendered");
  await page.getByTestId("activity-timestamp-input").fill("2026-08-01T10:00");
  await page.getByTestId("activity-notes-input").fill("NOR tendered at anchorage");
  await page.getByTestId("save-activity-btn").click();

  // Activity appears in the timeline
  await expect(page.getByRole("cell", { name: "NOR Tendered", exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("cell", { name: "NOR tendered at anchorage", exact: true })).toBeVisible();
});

test("New Voyage modal creates voyage and it appears in list", async ({ page }) => {
  const voyageNo = `E2E-VOY-${Date.now()}`;

  await withAuth(page);
  await page.goto("/voyages");

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
