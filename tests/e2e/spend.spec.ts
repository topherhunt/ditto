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
  await expect(page.locator(".qa-spend-today")).toHaveText(/^Usage today: \$0 \/ \$\d+(\.\d\d)?$/);
});

test("a paid call refused at the cap sends the learner to the congratulations page, in their interface language", async ({ page }) => {
  await signIn(page, "capped@example.com");
  await page.request.put("/api/locale", { data: { locale: "it" } });
  // Spending a real dollar in E2E isn't possible, so starting a conversation is answered as the server does at the cap.
  await page.route("**/api/conversations", (route) => route.request().method() === "POST"
    ? route.fulfill({
      status: 429, contentType: "application/json", headers: { "x-spend-today": "1.000100", "x-spend-cap": "1.00" },
      body: JSON.stringify({ error: "Daily AI budget ($1.00) reached; it resets at midnight UTC" }),
    })
    : route.continue());
  await page.goto("/it/talk");
  await page.locator(".qa-speak-starter-cafe").click();

  await expect(page).toHaveURL(/\/cap$/);
  await expect(page.locator(".qa-cap-reached h1")).toHaveText("Congratulazioni!");
  await expect(page.locator(".qa-cap-reached")).toContainText("$1.00");
  await expect(page.locator(".qa-cap-free li")).toHaveCount(4);
  // The next real response restores the true (zero) spend, so only the footer's language is checked.
  await expect(page.locator(".qa-spend-today")).toContainText(/^Uso oggi: \$/);
  await page.locator(".qa-cap-continue").click();
  await expect(page).toHaveURL(/\/it$/);
});
