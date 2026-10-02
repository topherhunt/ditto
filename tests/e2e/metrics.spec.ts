import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers.ts";

test("a learner's engaged time is reported with only the page's activity and language, and admins see it on /admin/metrics", async ({ page }) => {
  await signIn(page, "engaged@example.com");
  // Takes effect from the next page load, so sign-in runs on the real clock.
  await page.clock.install();
  await page.goto("/it/type/notebook");
  await expect(page.locator(".qa-user")).toBeVisible();
  const report = page.waitForRequest((r) => r.url().endsWith("/api/metrics/engaged"));
  await page.keyboard.press("Shift");
  await page.clock.runFor(31_000);
  expect((await report).postDataJSON()).toEqual({ activity: "notebook", language: "it", seconds: 30 });

  // Idle for over a minute: nothing more is counted, so nothing is reported.
  await page.clock.runFor(120_000);
  let idleReports = 0;
  page.on("request", (r) => { if (r.url().endsWith("/api/metrics/engaged")) idleReports++; });
  await page.clock.runFor(60_000);
  expect(idleReports).toBe(0);

  await signOut(page);
  await signIn(page, "admin@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-admin").click();
  await page.locator(".qa-nav-metrics").click();
  await expect(page.locator(".qa-metrics-activity").filter({ hasText: "notebook" })).toBeVisible();
  await expect(page.locator(".qa-metrics-day").first()).toBeVisible();
});

test("the metrics page shows who was engaged and lets the admin zoom from activity into language", async ({ page }) => {
  await signIn(page, "explorer@example.com");
  await page.clock.install();
  await page.goto("/it/talk");
  await expect(page.locator(".qa-user")).toBeVisible();
  const report = page.waitForRequest((r) => r.url().endsWith("/api/metrics/engaged"));
  await page.keyboard.press("Shift");
  await page.clock.runFor(31_000);
  await report;

  await signOut(page);
  await signIn(page, "admin@example.com");
  await page.goto("/admin/metrics");
  // 30 seconds is under the 2-minute bar, so nobody is "actively engaged" yet but the time still shows.
  await expect(page.locator(".qa-today-engaged")).toHaveText("0");
  await expect(page.locator(".qa-today")).toContainText("at least 2 minutes");
  await page.locator(".qa-today-row").filter({ hasText: "talk" }).first().click();
  await expect(page.locator(".qa-today-row").filter({ hasText: "Italian" }).first()).toBeVisible();

  await expect(page.locator(".today-caret").first()).toBeVisible();
  // Splitting by language puts Italian directly under the area, ahead of the sub-page.
  await page.locator(".qa-today-split-language").click();
  await page.locator(".qa-today-row").filter({ hasText: "talk" }).first().click();
  await expect(page.locator(".qa-today-row").filter({ hasText: "Italian" }).first()).toBeVisible();

  await page.locator(".qa-explore-bar").first().hover();
  await expect(page.locator(".qa-explore-tip")).toHaveText(/^(notebook|talk): [\d.]+ min, \d{4}-\d\d-\d\d$/);
  await page.locator(".qa-explore-series").filter({ hasText: "talk" }).click();
  await expect(page.locator(".qa-explore-filter-activity")).toContainText("talk");
  await expect(page.locator(".qa-explore-series").filter({ hasText: "Italian" })).toBeVisible();
  await page.locator(".qa-explore-filter-activity").click();
  await expect(page.locator(".qa-explore-filter-activity")).toHaveCount(0);
});
