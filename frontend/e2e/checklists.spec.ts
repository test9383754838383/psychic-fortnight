import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import type { Page } from "@playwright/test";

const E2E_SESSION_ID = "e2e-fixed-session-00000000000000000000000000000001";

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

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Checklists full creation and sign-off lifecycle flow", async ({ page }) => {
  // 1. Go to Voyage Workspace
  await withAuth(page);
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace");

  // 2. Verify Voyage Workspace Header and Port Call Selection
  await expect(page.locator("h1")).toContainText("Voyage V001");
  await expect(page.locator("text=NLRTM").first()).toBeVisible();

  // 3. Verify Checklists panel heading is visible (skip empty-state check —
  //    stale data from prior runs may have left checklists in the DB).
  await expect(page.locator("h3:has-text('Checklists')")).toBeVisible();

  // 4. Create Pre-Arrival Checklist (button always present in panel header)
  const createPreArrivalBtn = page.locator('button:has-text("Create Pre-Arrival Checklist")');
  await expect(createPreArrivalBtn).toBeVisible();
  await createPreArrivalBtn.click();

  // Wait for the new card to appear — it will be the last open Pre-Arrival card.
  // Capture its testid immediately so we have a stable reference that survives
  // DOM refetches during sign-off (class-based .last() drifts on re-render).
  const newCardLocator = page
    .locator('[data-testid^="checklist-card-"]')
    .filter({ has: page.locator('.checklist-card-title:has-text("Pre-Arrival Checklist")') })
    .filter({ has: page.locator('.status-chip:has-text("Open")') })
    .last();
  await expect(newCardLocator).toBeVisible();
  const cardTestId = await newCardLocator.getAttribute('data-testid');
  expect(cardTestId).not.toBeNull();

  // Use the stable testid locator for all subsequent interactions.
  const checklistCard = page.locator(`[data-testid="${cardTestId}"]`);
  await expect(checklistCard.locator('.status-chip:has-text("Open")')).toBeVisible();

  // 5. Verify 5 items are rendered inside this card
  const items = checklistCard.locator(".checklist-item-row");
  await expect(items).toHaveCount(5);

  // 6. Sign off all 5 items one by one
  const signOffButtons = checklistCard.getByRole("button", { name: "Sign Off" });
  for (let i = 0; i < 5; i++) {
    const signOffBtn = signOffButtons.first();
    await expect(signOffBtn).toBeVisible();
    await signOffBtn.click();
    await expect(signOffButtons).toHaveCount(4 - i);
  }

  // 7. Verify the checklist status chip auto-completes to 'Completed'
  await expect(checklistCard.locator('.status-chip:has-text("Completed")')).toBeVisible();
  await expect(signOffButtons).toHaveCount(0);
});
