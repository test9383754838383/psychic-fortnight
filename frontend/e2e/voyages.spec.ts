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

  // No port call yet — Start Port Call button should appear.
  // Generous timeout: under 6-worker parallel load the voyage refetch can lag.
  await expect(page.getByTestId("start-port-call-btn")).toBeVisible({ timeout: 20000 });
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

test("cargoes: add, edit, delete cargo on a new voyage", async ({ page }) => {
  const voyageNo = `CARGO-E2E-${Date.now()}`;

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

  // Navigate to the voyage
  await expect(page.locator(`button:has-text("${voyageNo}")`)).toBeVisible({ timeout: 10000 });
  await page.locator(`button:has-text("${voyageNo}")`).click();
  await page.waitForURL("**/voyages/**", { timeout: 10000 });

  // Switch to CARGOES tab
  await expect(page.getByTestId("content-tab-cargoes")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("content-tab-cargoes").click();

  // Empty state visible
  await expect(page.locator("text=No cargoes added yet")).toBeVisible({ timeout: 5000 });

  // Open add form
  await page.getByTestId("add-cargo-btn").click();
  await expect(page.getByTestId("commodity-select")).toBeVisible();

  // Fill the form — commodity dropdown, quantity, unit, load+discharge port
  await page.getByTestId("commodity-select").selectOption("Crude Oil");
  await page.getByTestId("quantity-input").fill("25000");
  await page.getByTestId("unit-select").selectOption("MT");
  await page.getByTestId("load-port-select").selectOption({ value: "00000000-0000-0000-0000-000000000003" });
  await page.getByTestId("discharge-port-select").selectOption({ value: "00000000-0000-0000-0000-000000000003" });
  await page.getByTestId("cargo-notes-input").fill("E2E test cargo");

  await page.getByTestId("save-cargo-btn").click();

  // Cargo card appears
  await expect(page.locator("text=CRUDE OIL — 25,000 MT")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=E2E test cargo")).toBeVisible();

  // Edit the cargo — change quantity
  const cargoCard = page.locator('[data-testid^="cargo-card-"]').first();
  const cargoId = await cargoCard.getAttribute("data-testid").then((t) => t?.replace("cargo-card-", "") ?? "");
  await page.getByTestId(`edit-cargo-btn-${cargoId}`).click();

  await page.getByTestId("quantity-input").fill("30000");
  await page.getByTestId("save-cargo-btn").click();

  await expect(page.locator("text=CRUDE OIL — 30,000 MT")).toBeVisible({ timeout: 10000 });

  // Delete the cargo
  await page.getByTestId(`delete-cargo-btn-${cargoId}`).click();
  await expect(page.locator("text=No cargoes added yet")).toBeVisible({ timeout: 10000 });
});

test("delays tab: add delay and approve in Voyage Manager", async ({ page }) => {
  await withAuth(page);
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002");
  await expect(page.getByTestId("voyage-header-no")).toHaveText("V001", { timeout: 10000 });

  // Click DELAYS tab
  await page.getByTestId("content-tab-delays").click();
  await expect(page.getByTestId("delay-tracking-panel")).toBeVisible({ timeout: 5000 });

  // Add a delay
  await page.locator('button:has-text("+ Add Delay")').click();
  await expect(page.locator("h3:has-text('Record New Delay')")).toBeVisible({ timeout: 5000 });

  await page.selectOption("#delay-type", "Weather");
  await page.selectOption("#fault-attribution", "Weather");
  await page.locator("#start-datetime").fill("2026-06-01T06:00");
  await page.locator("#end-datetime").fill("2026-06-01T09:30");
  await page.locator("#description").fill("M6 E2E delay");
  await page.locator('button:has-text("Save Delay")').click();

  // Card appears with correct duration (3.50 hrs)
  const openCard = page.locator('[data-testid^="delay-card-"]')
    .filter({ hasText: "M6 E2E delay" })
    .filter({ hasText: "Open" })
    .first();
  await expect(openCard).toBeVisible({ timeout: 10000 });
  const cardTestId = await openCard.getAttribute("data-testid");
  expect(cardTestId).not.toBeNull();
  const card = page.locator(`[data-testid="${cardTestId}"]`);
  await expect(card.locator("text=3.50 hrs (Actual)")).toBeVisible();

  // Approve
  await card.locator('button:has-text("Approve")').click();
  await expect(card.locator(".status-chip")).toContainText("Approved", { timeout: 10000 });
});

test("bunkers tab: add ROB entry for a port call", async ({ page }) => {
  const voyageNo = `BUNKER-E2E-${Date.now()}`;

  await withAuth(page);
  await page.goto("/voyages");
  await expect(page.locator("h1")).toHaveText("Voyages", { timeout: 10000 });

  // Create fresh voyage
  await page.getByTestId("new-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).toBeVisible();
  await page.getByTestId("voyage-no-input").fill(voyageNo);
  await page.getByTestId("vessel-select").selectOption({ label: "E2E TEST VESSEL" });
  await page.getByTestId("create-voyage-btn").click();
  await expect(page.getByTestId("new-voyage-modal")).not.toBeVisible({ timeout: 10000 });

  // Navigate to the voyage
  await expect(page.locator(`button:has-text("${voyageNo}")`)).toBeVisible({ timeout: 10000 });
  await page.locator(`button:has-text("${voyageNo}")`).click();
  await page.waitForURL("**/voyages/**", { timeout: 10000 });

  // Add a port call via ITINERARY tab first (required for BUNKERS panel to show content)
  await expect(page.getByTestId("add-port-btn")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("add-port-btn").click();
  await page.getByTestId("port-select").selectOption({ value: "00000000-0000-0000-0000-000000000003" });
  await page.getByTestId("port-fn-select").selectOption("Load");
  await page.getByTestId("eta-input").fill("2026-09-01T08:00");
  await page.getByTestId("etd-input").fill("2026-09-03T08:00");
  await page.getByTestId("save-row-btn").click();
  await expect(page.getByTestId("summary-port-days")).toBeVisible({ timeout: 10000 });

  // Navigate to PORT ACTIVITIES to start a port call
  await page.getByTestId("content-tab-port-activities").click();
  await expect(page.getByTestId("start-port-call-btn")).toBeVisible({ timeout: 20000 });
  await page.getByTestId("start-port-call-btn").click();
  await expect(page.getByTestId("port-call-status")).toBeVisible({ timeout: 10000 });

  // Switch to BUNKERS tab
  await page.getByTestId("content-tab-bunkers").click();

  // Panel loads — add ROB entry button should be visible (port call exists)
  await expect(page.getByTestId("add-rob-btn")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("add-rob-btn").click();

  // Form visible
  await expect(page.getByTestId("fuel-grade-select")).toBeVisible();

  // Fill the form
  await page.getByTestId("fuel-grade-select").selectOption("VLSFO");
  await page.getByTestId("rob-arrival-input").fill("1500");
  await page.getByTestId("received-input").fill("300");
  await page.getByTestId("port-consumption-input").fill("40");
  await page.getByTestId("rob-departure-input").fill("1760");
  await page.getByTestId("bdn-number-input").fill("BDN-E2E-001");
  await page.getByTestId("save-rob-btn").click();

  // ROB row appears in table
  await expect(page.locator("text=VLSFO").first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=BDN-E2E-001")).toBeVisible();

  // Voyage summary shows the grade
  await expect(page.getByTestId("voyage-bunker-summary")).toBeVisible();
  await expect(page.getByTestId("summary-row-VLSFO")).toBeVisible({ timeout: 5000 });

  // ── sea-leg consumption: add second port + port call + ROB ──────────────

  // Add second itinerary line (Discharge, later dates)
  await page.getByTestId("content-tab-itinerary").click();
  await expect(page.getByTestId("add-port-btn")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("add-port-btn").click();
  await page.getByTestId("port-select").selectOption({ value: "00000000-0000-0000-0000-000000000003" });
  await page.getByTestId("port-fn-select").selectOption("Discharge");
  await page.getByTestId("eta-input").fill("2026-09-10T08:00");
  await page.getByTestId("etd-input").fill("2026-09-12T08:00");
  await page.getByTestId("speed-input").fill("13");
  await page.getByTestId("distance-input").fill("1440");
  await page.getByTestId("eca-input").fill("0");
  await page.getByTestId("save-row-btn").click();
  await expect(page.getByTestId("summary-port-days")).toBeVisible({ timeout: 10000 });

  // Switch to PORT ACTIVITIES; select second line and start port call
  await page.getByTestId("content-tab-port-activities").click();
  await expect(page.getByTestId("port-selector")).toBeVisible({ timeout: 10000 });
  // Select the Discharge option (second line, index 1)
  await page.getByTestId("port-selector").selectOption({ index: 1 });
  await expect(page.getByTestId("start-port-call-btn")).toBeVisible({ timeout: 20000 });
  await page.getByTestId("start-port-call-btn").click();
  await expect(page.getByTestId("port-call-status")).toBeVisible({ timeout: 10000 });

  // Back to BUNKERS tab — add ROB at second port call (VLSFO arrival = 1200)
  await page.getByTestId("content-tab-bunkers").click();
  await expect(page.getByTestId("add-rob-btn")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("add-rob-btn").click();
  await expect(page.getByTestId("fuel-grade-select")).toBeVisible();

  // Select second port call in the form and fill arrival ROB
  const portCallSelect = page.getByTestId("port-call-select");
  const pcOptions = await portCallSelect.locator("option").all();
  // Select last option (the newly created second port call)
  const lastOption = pcOptions[pcOptions.length - 1];
  const lastValue = await lastOption.getAttribute("value");
  await portCallSelect.selectOption({ value: lastValue ?? "" });

  await page.getByTestId("fuel-grade-select").selectOption("VLSFO");
  await page.getByTestId("rob-arrival-input").fill("1200");
  await page.getByTestId("rob-departure-input").fill("1100");
  await page.getByTestId("save-rob-btn").click();

  // Sea-leg row should appear: departure 1760 (PC1) - arrival 1200 (PC2) = 560 MT
  await expect(page.getByTestId("sea-leg-row-0-VLSFO")).toBeVisible({ timeout: 10000 });
  const seaLegRow = page.getByTestId("sea-leg-row-0-VLSFO");
  await expect(seaLegRow).toContainText("560");

  // Summary sea cons for VLSFO = 560
  await expect(page.getByTestId("summary-sea-cons-VLSFO")).toBeVisible();
  await expect(page.getByTestId("summary-sea-cons-VLSFO")).toContainText("560");
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
