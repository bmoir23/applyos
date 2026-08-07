import { test, expect } from "@playwright/test";

/**
 * Smoke journeys — require a running app and seeded auth to go deep.
 * Default suite only checks the marketing surface is reachable.
 * Authenticated journeys are skipped unless PLAYWRIGHT_AUTH=1.
 */
test.describe("marketing smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/ApplyOS|career|job/i).first()).toBeVisible();
  });
});

test.describe("authenticated journeys", () => {
  test.skip(
    !process.env.PLAYWRIGHT_AUTH,
    "Set PLAYWRIGHT_AUTH=1 with a signed-in base URL to run deep journeys",
  );

  test("dashboard is reachable", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("jobs feed is reachable", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: /jobs/i })).toBeVisible();
  });

  test("applications pipeline is reachable", async ({ page }) => {
    await page.goto("/applications");
    await expect(
      page.getByRole("heading", { name: /applications/i }),
    ).toBeVisible();
  });

  test("approvals queue is reachable", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page.getByText(/approval|disabled|workspace/i).first()).toBeVisible();
  });
});
