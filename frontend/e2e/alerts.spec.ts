import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("alerts: create Critical alert, attempt resolve without note → error, resolve with note → resolved", async ({
  page,
}) => {
  const alertMessage = `Critical NOR alert ${Date.now()}`;

  // 1. Navigate to Voyage Workspace
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace");

  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  await loginButton.click();
  await expect(loginButton).toBeHidden();

  // 2. Verify workspace loaded
  await expect(page.locator("h1")).toContainText("Voyage V001");

  // 3. Find the AlertsPanel
  const alertsPanel = page.locator('[data-testid="alerts-panel"]');
  await expect(alertsPanel).toBeVisible();

  // 4. Open create form
  await alertsPanel.locator('button:has-text("New Alert")').click();

  // 5. Fill form with Critical severity
  await page.selectOption("#alert-severity", "Critical");
  await page.selectOption("#alert-type", "NOR Not Tendered");
  await page.locator("#alert-message").fill(alertMessage);

  // 6. Submit
  await alertsPanel.locator('button[aria-label="Submit"]').click();

  // 7. Wait for the alert to appear in the list
  await expect(
    alertsPanel.locator("p", { hasText: alertMessage }).first()
  ).toBeVisible({ timeout: 10000 });

  // 8. Click Resolve on the new critical alert
  const alertCard = alertsPanel
    .locator("p", { hasText: alertMessage })
    .locator("xpath=ancestor::div[contains(@style,'border-radius')][1]");
  await alertCard.locator('button[aria-label="Resolve"]').click();

  // 9. Inline resolution form visible
  await expect(page.locator('label:has-text("Resolution Note (required)")').first()).toBeVisible();

  // 10. Attempt confirm without filling note → button disabled
  const confirmBtn = page.locator('button[aria-label="Confirm Resolve"]').first();
  await expect(confirmBtn).toBeDisabled();

  // 11. Fill note and confirm
  const noteInput = page.locator('textarea[id^="resolve-note-"]').first();
  await noteInput.fill("Resolved after investigation");
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  // 12. Alert should now show Resolved badge
  await expect(alertCard.locator('.status-chip:has-text("Resolved")')).toBeVisible({
    timeout: 10000,
  });
});
