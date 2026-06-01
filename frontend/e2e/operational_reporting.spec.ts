import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Operational Reporting Panels E2E flow", async ({ page }) => {
  // 1. Navigate to Voyage Workspace page
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace");

  // Wait for loading to finish
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  await loginButton.click();
  await expect(loginButton).toBeHidden();

  // Verify workspace loads
  await expect(page.locator("h1")).toContainText("Voyage V001");

  // Select port call card
  const portCallCard = page.locator('text=Port: 00000000-0000-0000-0000-000000000003').first();
  await expect(portCallCard).toBeVisible();
  await portCallCard.click();

  // 2. Add Port Event
  const addEventBtn = page.locator('button:has-text("+ Add Event")');
  await expect(addEventBtn).toBeVisible();
  await addEventBtn.click();

  // Wait for the form to appear
  const addEventForm = page.locator('form[aria-label="Add Port Event"]');
  await expect(addEventForm).toBeVisible();

  // Fill form: Event Type select, Event Timestamp, Notes
  await page.selectOption('select#event-type', 'All Fast');
  await page.fill('input#event-timestamp', '2026-06-01T12:00');
  await page.fill('textarea#event-notes', 'E2E Port Event Notes');

  // Submit
  await page.click('button[type="submit"]:has-text("Save Event")');

  // Scope to EventLogPanel immediately — the form's <select> options and chips
  // from prior runs cause strict-mode violations when matching on the full page.
  const eventLogPanel = page.locator('[data-testid="event-log-panel"]');

  // Verify event is listed (use .first() — prior runs may have left duplicate chips)
  await expect(eventLogPanel.locator('span.event-chip:has-text("All Fast")').first()).toBeVisible();
  await expect(eventLogPanel.locator('text=E2E Port Event Notes').first()).toBeVisible();
  await expect(eventLogPanel.locator('button:has-text("Edit")')).not.toBeVisible();
  await expect(eventLogPanel.locator('button:has-text("Delete")')).not.toBeVisible();

  // 3. Add Activity Log Entry
  const activityLogSection = page.locator('[data-testid="activity-log-section"]');
  await expect(activityLogSection).toBeVisible();

  // Fill narrative
  const narrativeInput = activityLogSection.locator('textarea[aria-label="Narrative"]');
  await narrativeInput.fill('E2E Narrative Entry');

  // Submit log entry
  const logEntryBtn = activityLogSection.locator('button:has-text("Log Entry")');
  await logEntryBtn.click();

  // Verify narrative is listed (.first() — prior runs accumulate entries)
  await expect(activityLogSection.locator('text=E2E Narrative Entry').first()).toBeVisible();

  // Verify append-only: no Edit or Delete buttons inside activity-log-section
  await expect(activityLogSection.locator('button:has-text("Edit")')).not.toBeVisible();
  await expect(activityLogSection.locator('button:has-text("Delete")')).not.toBeVisible();

  // 4. Operational Reports
  // Ensure "Reports" tab is active (it should be by default)
  const reportsTab = page.locator('button.tab-btn:has-text("Reports")');
  await reportsTab.click();

  // Click "+ Add Report"
  const addReportBtn = page.locator('button:has-text("+ Add Report")');
  await expect(addReportBtn).toBeVisible();
  await addReportBtn.click();

  // Wait for the ReportForm to render
  const reportForm = page.locator('form[aria-label="Create Report"]');
  await expect(reportForm).toBeVisible();

  // Select Report Type: Arrival
  await page.selectOption('select#report-type', 'Arrival');

  // Submit Arrival report
  await page.click('button[type="submit"]:has-text("Save Report")');

  // Find the newly created Pending card — prior runs accumulate Accepted cards,
  // so filter to Pending status and take the first match.
  const reportsPanel = page.locator('.reports-panel');
  const pendingCard = reportsPanel
    .locator('.report-card[data-testid^="report-card-"]')
    .filter({ has: page.locator('span.status-chip:has-text("Pending")') })
    .first();
  await expect(pendingCard).toBeVisible();
  await expect(pendingCard.locator('text=Arrival').first()).toBeVisible();

  // Save report ID before transitioning (locator filter becomes invalid after
  // the chip changes from Pending → Accepted).
  const testIdAttribute = await pendingCard.getAttribute('data-testid');
  expect(testIdAttribute).not.toBeNull();
  const reportId = testIdAttribute!.replace('report-card-', '');

  // 5. Transition Pending -> Accepted
  const acceptBtn = pendingCard.locator('button:has-text("Accepted")');
  await expect(acceptBtn).toBeVisible();
  await acceptBtn.click();

  // Re-locate by specific testid so the locator still resolves after the
  // Pending chip is replaced by Accepted.
  const reportCard = reportsPanel.locator(`[data-testid="report-card-${reportId}"]`);
  const acceptedChip = reportCard.locator('span.status-chip:has-text("Accepted")');
  await expect(acceptedChip).toBeVisible();

  // Verify report is locked (no Edit button)
  await expect(reportCard.locator('button:has-text("Edit")')).not.toBeVisible();

  // 6. Create superseding report
  await addReportBtn.click();
  const supersedingForm = page.locator('form[aria-label="Create Report"]');
  await expect(supersedingForm).toBeVisible();

  // Select Report Type: Arrival
  await page.selectOption('select#report-type', 'Arrival');

  // Fill Supersedes Report ID
  await page.fill('input#supersedes-report-id', reportId);

  // Submit superseding report
  await page.click('button[type="submit"]:has-text("Save Report")');

  // Verify new report is Pending and displays the supersedes text
  await expect(reportsPanel.locator('text=Supersedes: ' + reportId)).toBeVisible();
});
