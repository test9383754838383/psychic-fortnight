import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Checklists full creation and sign-off lifecycle flow", async ({ page }) => {
  // 1. Go to Voyage Workspace
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace"); 
  
  // Wait for loading to finish
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  // If not logged in, click Operator stub sign in
  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // 2. Verify Voyage Workspace Header and Port Call Selection
  await expect(page.locator("h1")).toContainText("Voyage V001");
  await expect(page.locator("text=NLRTM").first()).toBeVisible();

  // 3. Verify Checklists panel empty state exists
  await expect(page.locator("h3:has-text('Checklists')")).toBeVisible();
  await expect(page.locator("text=No checklists created for this port call.")).toBeVisible();

  // 4. Create Pre-Arrival Checklist
  const createPreArrivalBtn = page.locator('button:has-text("Create Pre-Arrival Checklist")');
  await expect(createPreArrivalBtn).toBeVisible();
  await createPreArrivalBtn.click();

  // Verify the checklist card is now visible with 'Open' status
  await expect(page.locator(".checklist-card-title:has-text('Pre-Arrival Checklist')")).toBeVisible();
  await expect(page.locator(".checklist-card .status-chip:has-text('Open')")).toBeVisible();

  // 5. Verify 5 items are rendered
  const items = page.locator(".checklist-item-row");
  await expect(items).toHaveCount(5);

  // 6. Sign off all 5 items one by one
  const signOffButtons = page.getByRole("button", { name: "Sign Off" });
  for (let i = 0; i < 5; i++) {
    const signOffBtn = signOffButtons.first();
    await expect(signOffBtn).toBeVisible();
    await signOffBtn.click();
    await expect(signOffButtons).toHaveCount(4 - i);
  }

  // 7. Verify the checklist status chip auto-completes to 'Completed'
  await expect(page.locator(".checklist-card .status-chip:has-text('Completed')")).toBeVisible();
  await expect(signOffButtons).toHaveCount(0);
});
