import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("signed-out visitors see the homepage: three ways to practice, a real graded sample, the free daily credit and a sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".qa-welcome")).toBeVisible();
  await expect(page.locator(".qa-welcome-way")).toHaveCount(3);
  await expect(page.locator(".qa-welcome-way-quiz")).toContainText("In Italian");

  const diff = page.locator(".qa-welcome-sample-diff");
  await expect(diff.locator(".qa-letter-insert").first()).toBeVisible();
  await expect(diff.locator(".qa-letter-delete").first()).toBeVisible();
  await expect(diff.locator(".qa-letter-accent").first()).toBeVisible();

  await expect(page.locator(".qa-welcome-cap")).toContainText("$1.00");
  await page.locator(".qa-welcome-cta").click();
  await expect(page.locator(".qa-dev-email")).toBeInViewport();
});

test("the homepage offers only the courses translated into the language the visitor speaks", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".qa-learn-it")).toBeVisible();
  await expect(page.locator(".qa-learn-nl")).toBeVisible();
  await expect(page.locator(".qa-learn-en")).toHaveCount(0);

  await page.locator(".qa-welcome-speak-it").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.locator(".qa-learn-en")).toBeVisible();
  await expect(page.locator(".qa-learn-it")).toHaveCount(0);
  await expect(page.locator(".qa-learn-nl")).toHaveCount(0);
  await expect(page.locator(".qa-request-language")).toHaveAttribute("href", /^https:\/\/docs\.google\.com\/forms\//);
});

test("the course picked before sign-in is saved to the new account, which then lands in that course", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-learn-it").click();
  await expect(page.locator(".qa-learn-it")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".qa-learn-it")).toHaveAttribute("aria-pressed", "true");

  await page.locator(".qa-dev-email").fill("carryover@example.com");
  await page.locator(".qa-dev-submit").click();
  await page.locator(".qa-username").fill("carryover");
  await page.locator(".qa-username-save").click();
  await expect(page).toHaveURL(/\/it$/);
  const me = await (await page.request.get("/api/me")).json();
  expect(me.learning).toEqual(["it"]);
});

test("a new account that skipped the course question picks one before anything else", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-dev-email").fill("nopick@example.com");
  await page.locator(".qa-dev-submit").click();
  await page.locator(".qa-username").fill("nopick");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-choose-learning")).toBeVisible();
  await expect(page.locator(".qa-user")).toHaveCount(0);
  await page.locator(".qa-choose-learning .qa-learn-it").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-user")).toHaveText("nopick");
});

test("signing in from a deep link keeps the visitor on that page", async ({ page }) => {
  await page.goto("/it/notebook");
  await expect(page.locator(".qa-welcome")).toBeVisible();
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill("deeplink@example.com");
  await page.locator(".qa-dev-submit").click();
  await page.locator(".qa-username").fill("deeplink");
  await page.locator(".qa-username-save").click();
  await expect(page).toHaveURL(/\/it\/notebook$/);
  await expect(page.locator(".qa-welcome")).toHaveCount(0);
});

test("the logo takes a signed-in learner to the homepage, which leads back to their course", async ({ page }) => {
  await signIn(page, "logo@example.com");
  await page.locator(".qa-nav-home").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".qa-welcome-way")).toHaveCount(3);
  await expect(page.locator(".qa-dev-email")).toHaveCount(0);
  await expect(page.locator(".qa-welcome-cta")).toHaveCount(0);
  await page.locator(".qa-welcome-continue").click();
  await expect(page).toHaveURL(/\/it$/);
});

test("Settings adds and hides courses but never hides the last one", async ({ page }) => {
  await signIn(page, "settingslearn@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page.locator(".qa-settings-learn-it")).toBeChecked();
  await expect(page.locator(".qa-settings-learn-it")).toBeDisabled();
  await expect(page.locator(".qa-lang-picker")).toHaveCount(0);

  await page.locator(".qa-settings-learn-nl").check();
  await expect(page.locator(".qa-settings-general .qa-settings-status")).toHaveText("Saved");
  await expect(page.locator(".qa-settings-learn-it")).toBeEnabled();
  await expect(page.locator(".qa-lang-picker")).toBeVisible();

  await page.locator(".qa-settings-learn-it").uncheck();
  await expect(page.locator(".qa-settings-learn-nl")).toBeDisabled();
  await expect(page.locator(".qa-lang-picker")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".qa-settings-learn-it")).not.toBeChecked();
});
