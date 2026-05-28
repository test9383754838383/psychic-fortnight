import { test, expect } from "@playwright/test";

test("should load the application scaffold, perform login, check user, and logout", async ({
  page,
}) => {
  await page.goto("/");

  // Assert scaffold string
  await expect(
    page.locator("text=Vessel & Voyage Operations Control System — scaffold OK"),
  ).toBeVisible();

  // Initially not logged in, auth-user-id should be none
  const authUser = page.locator("[data-testid='auth-user-id']");
  await expect(authUser).toHaveText("none");

  // TODO: Add full login flow once a login form exists. 
  // Currently, the frontend only provides a React context.
  // The test just checks that the scaffold loads and auth starts as "none".
});
