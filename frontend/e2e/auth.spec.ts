import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.beforeAll(() => {
  // Seed the E2E user before tests run
  execSync("cd .. && uv run python scripts/seed_e2e_user.py");
});

test("API: login -> /me -> logout -> 401", async ({ request }) => {
  // Wait for the backend to be ready
  await expect.poll(async () => {
    const res = await request.get("/api/v1/schedule?date_from=2026-01-01&date_to=2026-12-31");
    return res.status();
  }, { timeout: 10000 }).toBe(401);

  // Attempt login with non-existent user should fail
  const failedLogin = await request.post("/api/v1/auth/login", {
    data: { username: "does-not-exist", password: "pw" },
  });
  expect(failedLogin.status()).toBe(401);

  // Positive flow: login with the seeded user
  const loginRes = await request.post("/api/v1/auth/login", {
    data: { username: "e2e_admin", password: "e2e_password" },
  });
  expect(loginRes.status()).toBe(200);
  const loginData = await loginRes.json();
  expect(loginData.username).toBe("e2e_admin");
  expect(loginData.roles).toContain("Admin");

  // Verify /me works
  const meRes = await request.get("/api/v1/auth/me");
  expect(meRes.status()).toBe(200);
  const meData = await meRes.json();
  expect(meData.username).toBe("e2e_admin");

  // Verify a protected request works (e.g., getting voyages or users)
  const usersRes = await request.get("/api/v1/admin/users");
  expect(usersRes.status()).toBe(200);

  // Logout
  const logoutRes = await request.post("/api/v1/auth/logout");
  expect(logoutRes.status()).toBe(200);

  // Verify protected request returns 401
  const protectedRes = await request.get("/api/v1/admin/users");
  expect(protectedRes.status()).toBe(401);
});
