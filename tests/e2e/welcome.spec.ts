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

test("the practice samples follow the course picked, and emoji bullets hang outside their text", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".qa-welcome-sample-quiz")).toContainText("Ieri");
  await page.locator(".qa-learn-nl").click();
  await expect(page.locator(".qa-welcome-sample-quiz")).toContainText("Gisteren");
  await expect(page.locator(".qa-welcome-sample-diff")).toContainText("koffie");
  await expect(page.locator(".qa-welcome-way-talk")).toContainText("Ik wil een cappuccino hebben.");

  const item = page.locator(".qa-welcome-along li").first();
  await expect(item.locator("span").first()).toHaveText("🔁");
  await expect(item.locator("span").nth(1)).not.toContainText("🔁");
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
  await expect(page.locator(".qa-learn-ga")).toBeVisible();
  await expect(page.locator(".qa-request-language")).toHaveAttribute("href", /^https:\/\/docs\.google\.com\/forms\//);

  await page.locator(".qa-welcome-speak-nl").click();
  await expect(page.locator(".qa-learn-en")).toBeVisible();
  await expect(page.locator(".qa-learn-it")).toBeVisible();
  await expect(page.locator(".qa-learn-nl")).toHaveCount(0);
  await expect(page.locator(".qa-learn-ga")).toBeVisible();
});

test("the course picked before sign-in is saved to the new account, which then lands in that course", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-learn-it").click();
  await expect(page.locator(".qa-learn-it")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".qa-learn-it")).toHaveAttribute("aria-pressed", "true");

  await page.locator(".qa-dev-email").fill("carryover@example.com");
  await page.locator(".qa-dev-submit").click();
  await page.locator(".qa-level-A1").click();
  await page.locator(".qa-username").fill("carryover");
  await page.locator(".qa-username-save").click();
  await expect(page).toHaveURL(/\/it$/);
  const me = await (await page.request.get("/api/me")).json();
  expect(me.learning).toEqual(["it"]);
});

test("a new account that skipped the course question picks one on the setup screen, which then asks its level", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-dev-email").fill("nopick@example.com");
  await page.locator(".qa-dev-submit").click();
  const setup = page.locator(".qa-choose-username");
  await expect(setup.locator(".qa-level-picker")).toHaveCount(0);
  await setup.locator(".qa-learn-it").click();
  await expect(setup.locator(".qa-level-picker legend")).toHaveText("How much Italian do you know?");
  await setup.locator(".qa-level-A1").click();
  await page.locator(".qa-username").fill("nopick");
  await page.locator(".qa-username-save").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-user")).toHaveText("nopick");
  const me = await (await page.request.get("/api/me")).json();
  expect(me.learning).toEqual(["it"]);
});

test("signing in from a deep link keeps the visitor on that page", async ({ page }) => {
  await page.goto("/it/type/notebook");
  await expect(page.locator(".qa-welcome")).toBeVisible();
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill("deeplink@example.com");
  await page.locator(".qa-dev-submit").click();
  await page.locator(".qa-level-A1").click();
  await page.locator(".qa-username").fill("deeplink");
  await page.locator(".qa-username-save").click();
  await expect(page).toHaveURL(/\/it\/type\/notebook$/);
  await expect(page.locator(".qa-welcome")).toHaveCount(0);
});

test("the logo takes a signed-in learner to their dashboard, and the footer to the homepage, which leads back", async ({ page }) => {
  await signIn(page, "logo@example.com");
  await page.goto("/it/type");
  await page.locator(".qa-nav-home").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-dash-title")).toBeVisible();
  await page.locator(".qa-footer-home").click();
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

  await page.locator("label[for=learn-nl]").click();
  await expect(page.locator(".qa-settings-general .qa-settings-status")).toHaveText("Saved");
  await expect(page.locator(".qa-settings-learn-it")).toBeEnabled();

  await page.locator("label[for=learn-it]").click();
  await expect(page.locator(".qa-settings-learn-nl")).toBeDisabled();
  await page.reload();
  await expect(page.locator(".qa-settings-learn-it")).not.toBeChecked();
});
