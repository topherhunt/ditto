import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers.ts";

// playwright.config.ts makes admin@example.com the admin.
test("an admin triages a report, reviews the fix, and non-admins can't reach the page", async ({ page }) => {
  await signIn(page, "reporter@example.com");
  await expect((await page.request.post("/api/reports", { data: { unitId: "it-a1-bar-1-u01", rev: 1, voice: 0, kind: "audio", note: "e2e-triage" } })).status()).toBe(200);
  await page.locator(".qa-user").click();
  await expect(page.locator(".qa-nav-profile")).toBeVisible();
  await expect(page.locator(".qa-nav-reports")).toHaveCount(0);
  await page.goto("/admin/reports");
  await expect(page.locator(".alert-danger")).toContainText("Admins only");
  await page.goto("/");
  await signOut(page);

  await signIn(page, "admin@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-reports").click();
  const report = page.locator(".qa-admin-report").filter({ has: page.locator(".qa-admin-note", { hasText: "e2e-triage" }) });
  await expect(report.locator(".qa-play-reported")).toBeVisible();

  await expect(report.locator(".qa-decide-fix_audio")).toBeDisabled();
  await report.locator(".qa-triage-note").fill("stress on the wrong syllable");
  await report.locator(".qa-decide-fix_audio").click();
  await expect(report).toHaveCount(0);

  await page.locator(".qa-reports-triaged").click();
  await expect(report.locator(".qa-decide-fix_audio")).toHaveClass(/btn-primary/);
  await expect(report.locator(".qa-triage-note")).toHaveValue("stress on the wrong syllable");
  await report.locator(".qa-review-approved").click();
  await expect(report.locator(".qa-review-approved")).toHaveClass(/btn-success/);
  const download = page.waitForEvent("download");
  await page.locator(".qa-reports-download").click();
  expect((await download).suggestedFilename()).toMatch(/^reports-triaged-.*\.json$/);

  // Dismissing closes a report; reopening puts it back in New.
  await report.locator(".qa-decide-dismiss").click();
  await expect(report).toHaveCount(0);
  await page.locator(".qa-reports-closed").click();
  await report.locator(".qa-reopen").click();
  await expect(report).toHaveCount(0);
  await page.locator(".qa-reports-new").click();
  await expect(report.locator(".qa-triage-note")).toHaveValue("");
});
