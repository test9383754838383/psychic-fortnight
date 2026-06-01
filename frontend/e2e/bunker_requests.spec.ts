import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Bunker Requests lifecycle: create -> In Progress -> Stemmed -> Supplied -> locked", async ({ page }) => {
  // 1. Go to Voyage Workspace
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace");

  // Wait for loading to finish
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  // If not logged in, click Operator stub sign in
  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // 2. Verify Voyage Workspace Header and Bunker Requests Panel
  await expect(page.locator("h1")).toContainText("Voyage V001");
  await expect(page.locator("h3:has-text('Bunker Requests')")).toBeVisible();

  // 3. Verify Bunker Requests panel empty state exists
  await expect(page.locator("text=No bunker requests for this voyage.")).toBeVisible();

  // 4. Click New Request to open the create form
  const newRequestBtn = page.locator('button:has-text("New Request")');
  await expect(newRequestBtn).toBeVisible();
  await newRequestBtn.click();

  // 5. Fill out the Bunker Request form
  await page.locator("label:has-text('Fuel Type') + select").selectOption("VLSFO");
  await page.locator("label:has-text('Quantity (mt)') + input").fill("450");
  await page.locator("label:has-text('Specification Grade') + input").fill("ISO 8217 RMG 380");
  await page.locator("label:has-text('Max Sulphur') + input").fill("0.5");

  // Submit the form
  const submitBtn = page.locator('button:has-text("Submit")');
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // 6. Verify the Bunker Request card is now visible with 'Raised' status
  const card = page.locator(".bunker-request-card").first();
  await expect(card).toBeVisible();
  await expect(card.locator(".bunker-fuel-type")).toContainText("VLSFO");
  await expect(card.locator("text=450 mt")).toBeVisible();
  await expect(card.locator(".status-chip:has-text('Raised')")).toBeVisible();
  await expect(card.locator("text=ISO 8217 RMG 380 · S ≤ 0.5%")).toBeVisible();

  // 7. Transition to 'In Progress'
  const inProgressBtn = card.locator('button[aria-label="In Progress"]');
  await expect(inProgressBtn).toBeVisible();
  await inProgressBtn.click();

  // Verify status updates
  await expect(card.locator(".status-chip:has-text('In Progress')")).toBeVisible();

  // 8. Transition to 'Stemmed'
  const stemmedBtn = card.locator('button[aria-label="Stemmed"]');
  await expect(stemmedBtn).toBeVisible();
  await stemmedBtn.click();

  // Verify status updates
  await expect(card.locator(".status-chip:has-text('Stemmed')")).toBeVisible();

  // 9. Transition to 'Supplied'
  const suppliedBtn = card.locator('button[aria-label="Supplied"]');
  await expect(suppliedBtn).toBeVisible();
  await suppliedBtn.click();

  // Verify status updates
  await expect(card.locator(".status-chip:has-text('Supplied')")).toBeVisible();

  // 10. Verify controls are locked (no buttons are visible in the transition section)
  await expect(card.locator('button[aria-label="In Progress"]')).not.toBeVisible();
  await expect(card.locator('button[aria-label="Stemmed"]')).not.toBeVisible();
  await expect(card.locator('button[aria-label="Blocked"]')).not.toBeVisible();
  await expect(card.locator('button[aria-label="Supplied"]')).not.toBeVisible();
});
