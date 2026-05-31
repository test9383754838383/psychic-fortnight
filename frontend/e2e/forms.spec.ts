import { test, expect } from "@playwright/test";

const OPERATIONS_USER = {
  id: "e2e-ops-user",
  username: "operator",
  is_active: true,
  roles: ["Operations"],
};

const FORM_ID = "e2e-form-001";

const FORM_RECEIVED = {
  id: FORM_ID,
  form_type: "Noon",
  status: "Received",
  submitted_by: "e2e-ops-user",
  submitted_at: "2026-05-30T08:00:00Z",
  received_at: "2026-05-30T08:01:00Z",
  voyage_id: "e2e-voyage-111",
  port_call_id: null,
  assigned_to: null,
  reviewed_by: null,
  reviewed_at: null,
  notes: null,
  accepted_parse_attempt_id: null,
  raw_fields: {
    vessel: "MV Meridian",
    report_date: "2026-05-30",
    position: "12.5N 45.2E",
    speed_24h: "13.2",
  },
  raw_source_ref:
    "From: master@mvmeridian.com\nNoon Report\nVessel: MV Meridian\nPosition: 12.5N 45.2E",
  parse_failed: false,
  latest_attempt: null,
  parse_attempts: [],
};

const FORM_ACCEPTED = {
  ...FORM_RECEIVED,
  status: "Accepted",
  reviewed_by: "e2e-ops-user",
  reviewed_at: "2026-05-30T09:00:00Z",
};

const FORM_FAILED = {
  ...FORM_RECEIVED,
  id: "e2e-form-failed",
  raw_fields: null,
  parse_failed: true,
};

async function stubApis(
  page: import("@playwright/test").Page,
  opts: {
    parseResponse?: object;
    formDetailResponse?: object;
    listResponse?: object[];
  } = {},
) {
  const parseResponse = opts.parseResponse ?? FORM_RECEIVED;
  let formDetail = opts.formDetailResponse ?? FORM_RECEIVED;
  const listResponse = opts.listResponse ?? [];

  await page.route(/\/api\/v1\/auth\/me/, (route) => {
    void route.fulfill({ json: OPERATIONS_USER });
  });

  await page.route(/\/api\/v1\/auth\/login/, (route) => {
    void route.fulfill({ json: OPERATIONS_USER });
  });

  await page.route(/\/api\/v1\/forms/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = new URL(url).pathname;

    if (path === "/api/v1/forms/parse" && method === "POST") {
      await route.fulfill({ status: 201, json: parseResponse });
      return;
    }

    if (/\/api\/v1\/forms\/[^/]+\/transition$/.test(path) && method === "POST") {
      formDetail = FORM_ACCEPTED;
      await route.fulfill({ json: FORM_ACCEPTED });
      return;
    }

    if (/\/api\/v1\/forms\/[^/]+$/.test(path) && method === "GET") {
      await route.fulfill({ json: formDetail });
      return;
    }

    if (/\/api\/v1\/forms\/[^/]+$/.test(path) && method === "PATCH") {
      await route.fulfill({ json: formDetail });
      return;
    }

    if (path === "/api/v1/forms" && method === "GET") {
      await route.fulfill({ json: listResponse });
      return;
    }

    await route.continue();
  });
}

test.describe("Forms review queue (stubbed API)", () => {
  test("paste → parse → review parsed-vs-raw → accept → form locked", async ({
    page,
  }) => {
    await stubApis(page);

    await page.goto("/forms");

    await expect(page.getByText("Forms Review Queue")).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText("No forms found.")).toBeVisible();

    await page.getByLabel("Raw text").fill(
      "From: master@mvmeridian.com\nNoon Report\nVessel: MV Meridian\nPosition: 12.5N 45.2E",
    );
    await page.getByLabel("Form type").selectOption("Noon");
    await page.getByLabel("Voyage ID").fill("e2e-voyage-111");

    await page.getByRole("button", { name: /parse/i }).click();

    await expect(page.getByTestId("parsed-fields-panel")).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId("raw-source-panel")).toBeVisible();

    await expect(
      page.getByTestId("parsed-fields-panel").getByText(/MV Meridian/),
    ).toBeVisible();

    await expect(
      page.getByTestId("raw-source-panel").getByText(/Noon Report/),
    ).toBeVisible();

    await page.getByRole("button", { name: /accept/i }).click();

    await expect(
      page.getByTestId("form-status-chip").getByText("Accepted"),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", { name: /^accept$/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /^reject$/i }),
    ).not.toBeVisible();
  });

  test("failed parse shows parse-failed-warning banner", async ({ page }) => {
    await stubApis(page, {
      parseResponse: FORM_FAILED,
      formDetailResponse: FORM_FAILED,
    });

    await page.goto("/forms");

    await expect(page.getByText("Forms Review Queue")).toBeVisible({
      timeout: 10000,
    });

    await page.getByLabel("Raw text").fill("garbled unreadable text ###");
    await page.getByLabel("Form type").selectOption("Noon");
    await page.getByLabel("Voyage ID").fill("e2e-voyage-111");

    await page.getByRole("button", { name: /parse/i }).click();

    await expect(page.getByTestId("parse-failed-banner")).toBeVisible({
      timeout: 10000,
    });
  });
});
