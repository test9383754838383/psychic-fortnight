import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Delay tracking full creation, editing, and approval/locking lifecycle flow", async ({
  page,
}) => {
  // 1. Go to Voyage Workspace
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace");

  // Wait for loading to finish
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  // If not logged in, click Operator stub sign in
  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // 2. Verify Voyage Workspace Header is loaded
  await expect(page.locator("h1")).toContainText("Voyage V001");

  // 3. Verify Delays panel is visible
  await expect(page.locator("h3:has-text('Delays')")).toBeVisible();

  // 4. Click Add Delay to open the form
  const addDelayBtn = page.locator('button:has-text("+ Add Delay")');
  await expect(addDelayBtn).toBeVisible();
  await addDelayBtn.click();

  // Verify form is visible
  await expect(page.locator("h3:has-text('Record New Delay')")).toBeVisible();

  // 5. Fill out the creation form
  await page.selectOption("#delay-type", "Weather");
  await page.selectOption("#fault-attribution", "Weather");
  await page.locator("#start-datetime").fill("2026-06-01T01:00");
  await page.locator("#description").fill("Stormy delay at sea");

  // Save delay
  await page.locator('button:has-text("Save Delay")').click();

  // 6. Verify it is created in the list
  const delayCard = page.locator(".checklist-panel .checklist-card").first();
  await expect(delayCard).toBeVisible();
  await expect(delayCard.locator(".checklist-card-title")).toContainText("Weather");
  await expect(delayCard.locator(".status-chip")).toContainText("Open");
  await expect(delayCard.locator("text=Stormy delay at sea")).toBeVisible();

  // 7. Click Edit on the open delay card
  const editBtn = delayCard.locator('button:has-text("Edit")');
  await expect(editBtn).toBeVisible();
  await editBtn.click();

  // Verify edit form is open
  await expect(page.locator("h3:has-text('Edit Delay')")).toBeVisible();

  // 8. Set end_datetime to derive actual_duration
  await page.locator("#end-datetime").fill("2026-06-01T04:30");

  // Save delay
  await page.locator('button:has-text("Save Delay")').click();

  // 9. Verify updated duration is visible in the list (3.50 hours derived from 01:00 to 04:30)
  await expect(delayCard.locator("text=3.50 hrs (Actual)")).toBeVisible();

  // 10. Click Approve to lock the record
  const approveBtn = delayCard.locator('button:has-text("Approve")');
  await expect(approveBtn).toBeVisible();
  await approveBtn.click();

  // 11. Verify the delay is locked (Approve and Edit are hidden, locked status shown)
  await expect(delayCard.locator(".status-chip")).toContainText("Approved");
  await expect(delayCard.locator("text=Locked")).toBeVisible();
  await expect(delayCard.locator('button:has-text("Edit")')).not.toBeVisible();
  await expect(delayCard.locator('button:has-text("Approve")')).not.toBeVisible();
});
