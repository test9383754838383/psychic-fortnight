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
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("tasks: create task, transition to In Progress, transition to Done, completed_at visible", async ({
  page,
}) => {
  const taskTitle = `E2E Test Task ${Date.now()}`;

  // 1. Navigate to Voyage Workspace
  await withAuth(page);
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace");

  // 2. Verify workspace loaded
  await expect(page.locator("h1")).toContainText("Voyage V001");

  // 3. Find the TasksPanel
  const tasksPanel = page.locator('[data-testid="tasks-panel"]');
  await expect(tasksPanel).toBeVisible();

  // 4. Open create form
  await tasksPanel.locator('button[aria-label="Add Task"]').click();

  // 5. Fill create form
  await page.locator("#task-title").fill(taskTitle);

  // 6. Save task
  await page.locator('button[aria-label="Save Task"]').click();

  // 7. Wait for task to appear in the list
  await expect(tasksPanel.getByText(taskTitle).first()).toBeVisible({
    timeout: 10000,
  });

  // 8. Find the task card and its status dropdown
  const taskCard = tasksPanel
    .getByText(taskTitle)
    .locator("xpath=ancestor::div[contains(@style,'border-radius')]");

  const statusSelect = taskCard.locator('select[aria-label="Status"]');

  // 9. Transition to In Progress
  await statusSelect.selectOption("In Progress");
  await expect(
    taskCard.locator('.status-chip:has-text("In Progress")')
  ).toBeVisible({ timeout: 5000 });

  // 10. Transition to Done
  await statusSelect.selectOption("Done");
  await expect(
    taskCard.locator('.status-chip:has-text("Done")')
  ).toBeVisible({ timeout: 5000 });

  // 11. completed_at should be visible
  await expect(tasksPanel.getByText(/Completed:/i).first()).toBeVisible({
    timeout: 5000,
  });
});
