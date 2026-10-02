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
