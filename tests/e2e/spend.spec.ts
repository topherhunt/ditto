import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("the feedback link is in the footer before and after signing in", async ({ page }) => {
  await page.goto("/");
  const link = page.locator(".qa-feedback-link");
  await expect(page.locator(".qa-dev-email")).toBeVisible();
  await expect(link).toHaveAttribute("href", /^https:\/\/docs\.google\.com\/forms\//);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(page.locator(".qa-spend-today")).toHaveCount(0);

  await signIn(page, "footer@example.com");
  await expect(link).toBeVisible();
  await expect(page.locator(".qa-spend-today")).toContainText(/\$0\.000 of \$\d+\.\d\d/);
});

test("an exercise shows the congratulations screen once the day's spend reaches the cap", async ({ page }) => {
  await signIn(page, "capped@example.com");
  // Spending a real dollar in E2E isn't possible, so the lesson's response reports the cap as reached.
  await page.route("**/api/lessons/**", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), "x-spend-today": "1.000100", "x-spend-cap": "1.00" } });
  });
  await page.locator(".qa-lesson-start").first().click();
  await expect(page.locator(".qa-cap-reached")).toContainText("$1.00");
  await expect(page.locator(".qa-slot")).toHaveCount(0);
  await expect(page.locator(".qa-spend-today")).toContainText("$1.00 of $1.00");
});
