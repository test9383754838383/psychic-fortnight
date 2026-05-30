import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user and data before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
  execSync("cd .. && uv run python scripts/seed_e2e_data.py");
});

test("Port Call full lifecycle flow", async ({ page }) => {
  // 1. Login
  await page.goto("/voyages/00000000-0000-0000-0000-000000000002/workspace"); 
  
  // Wait for loading to finish
  await expect(page.locator("text=Loading session...")).not.toBeVisible();

  // If not logged in, we should see the Authentication Required message
  const loginButton = page.locator('button:has-text("Sign In as Operator (Stub)")');
  if (await loginButton.isVisible()) {
      await loginButton.click();
  }

  // 2. Verify Workspace Page
  await expect(page.locator("h1")).toContainText("Voyage V001");
  await expect(page.locator("text=NLRTM").first()).toBeVisible(); // Wait for itinerary to show port code
  await expect(page.getByRole('heading', { name: 'Port Calls' })).toBeVisible();

  // 3. Create Port Call
  await page.click('button:has-text("+ Add Port Call")');
  await expect(page.locator('text=/Add Port Call/i')).toBeVisible();
  
  // Fill Planning
  await page.fill('input[name="eta"]', "2026-06-01T10:00");
  await page.fill('input[name="etd"]', "2026-06-02T18:00");
  
  await page.click('button:has-text("Save Port Call")');
  
  // Verify Port Call listed
  await expect(page.locator('text=/Port: 00000000-0000-0000-0000-000000000003/i').first()).toBeVisible();
  await expect(page.locator('span.status-chip:has-text("Planned")').first()).toBeVisible();

  // 4. Transition Status
  await page.click('button:has-text("Arrived at Pilot Station")');
  await expect(page.locator('span.status-chip:has-text("Arrived at Pilot Station")').first()).toBeVisible();
  
  // 5. Agent Appointment
  const agentSearch = page.getByPlaceholder("Search agent...").first();
  await agentSearch.fill("E2E");
  await page.click('text=E2E GLOBAL AGENT (E2EAGENT)');
  
  // Verify Nominated
  await expect(page.locator("text=Status: Nominated").first()).toBeVisible();
  
  // Confirm Appointment
  await page.click('button:has-text("Confirm Appointment")');
  await expect(page.locator("text=Status: Appointed").first()).toBeVisible();
  
  // 6. Reload and Verify
  await page.reload();
  await expect(page.locator("text=Status: Appointed").first()).toBeVisible();
  await expect(page.locator("text=Agent Ref: 00000000-0000-0000-0000-000000000005").first()).toBeVisible();
});
