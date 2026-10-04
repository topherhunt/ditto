import { expect, test } from "./fixtures.ts";
import { signIn } from "./helpers.ts";

test("tapping a face on the dashboard card saves the mood at once, and the page it opens can add tags and text before returning to the dashboard with thanks", async ({ page }) => {
  await signIn(page, "fb1@example.com");
  await page.locator(".qa-dash-feedback .qa-feedback-mood-2").click();
  await expect(page).toHaveURL(/\/feedback\?id=\d+$/);
  await expect(page.locator(".qa-feedback-mood-2")).toHaveAttribute("aria-pressed", "true");
  // The mood is stored before anything is sent from the page.
  const saved = await page.request.get(page.url().replace("/feedback?id=", "/api/feedback/"));
  expect((await saved.json()).mood).toBe(2);

  await page.locator(".qa-feedback-tag-too_hard").click();
  await page.locator(".qa-feedback-tag-reminders").click();
  await page.locator(".qa-feedback-message").fill("The grammar jumps are steep");
  await page.locator(".qa-feedback-send").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-feedback-thanks")).toContainText("Thank you 💙");
  await page.locator(".qa-nav-type").click();
  await page.locator(".qa-nav-home").click();
  await expect(page.locator(".qa-feedback-thanks")).toHaveCount(0);
});

test("the footer link opens a blank form whose Send stays disabled until something is filled in", async ({ page }) => {
  await signIn(page, "fb2@example.com");
  await page.locator(".qa-feedback-link").click();
  await expect(page).toHaveURL(/\/feedback\?from=%2Fit$/);
  await expect(page.locator(".qa-feedback-send")).toBeDisabled();
  await page.locator(".qa-feedback-tag-bugs").click();
  await expect(page.locator(".qa-feedback-send")).toBeEnabled();
  await page.locator(".qa-feedback-send").click();
  await expect(page.locator(".qa-feedback-thanks")).toBeVisible();
});

test("the operator sees the sent feedback ranked by tag at /admin/feedback", async ({ page }) => {
  await signIn(page, "fb3@example.com");
  await page.locator(".qa-feedback-link").click();
  await page.locator(".qa-feedback-mood-5").click();
  await page.locator(".qa-feedback-tag-habit").click();
  await page.locator(".qa-feedback-message").fill("Daily nudges would help");
  await page.locator(".qa-feedback-send").click();
  await expect(page.locator(".qa-feedback-thanks")).toBeVisible();
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();

  await signIn(page, "admin@example.com");
  await page.goto("/admin/feedback");
  await expect(page.locator(".qa-feedback-filter-habit")).toBeVisible();
  await expect(page.locator(".qa-feedback-item", { hasText: "Daily nudges would help" })).toContainText("fb3");
});
