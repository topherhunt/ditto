import { devices, expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

const { userAgent: IOS_SAFARI } = devices["iPhone 13"];

test.describe("on iOS Safari", () => {
  test.use({ userAgent: IOS_SAFARI });

  test("the dashboard invites adding Ditto to the home screen until dismissed, and the guide walks through the four steps", async ({ page }) => {
    await signIn(page, "install1@example.com");
    await expect(page.locator(".qa-install-hint")).toBeVisible();

    await page.locator(".qa-install-hint-show").click();
    await expect(page).toHaveURL(/\/about\/home-screen$/);
    await expect(page.locator(".qa-install-not-ios")).toHaveCount(0);
    await expect(page.locator(".qa-install-back")).toBeDisabled();
    for (const n of [1, 2, 3, 4]) {
      await expect(page.locator(".qa-install-progress")).toHaveText(`Step ${n} of 4`);
      await expect(page.locator(".qa-install-image")).toHaveAttribute("src", `/install/ios-${n}.jpg`);
      await expect.poll(() => page.locator(".qa-install-image").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      if (n < 4) await page.locator(".qa-install-next").click();
    }
    await expect(page.locator(".qa-install-next")).toHaveCount(0);
    await page.locator(".qa-install-back").click();
    await expect(page.locator(".qa-install-progress")).toHaveText("Step 3 of 4");
    await page.locator(".qa-install-next").click();

    await page.locator(".qa-install-finish").click();
    await expect(page).toHaveURL(/\/it$/);
    await expect(page.locator(".qa-install-hint")).toBeVisible();
    await page.locator(".qa-install-hint-dismiss").click();
    await expect(page.locator(".qa-install-hint")).toHaveCount(0);
    expect((await (await page.request.get("/api/me")).json()).installHintDismissed).toBe(true);
    await page.reload();
    await expect(page.locator(".qa-dash-title")).toBeVisible();
    await expect(page.locator(".qa-install-hint")).toHaveCount(0);
  });

  test("the alert is hidden when Ditto is already running from the home screen", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
    await signIn(page, "install2@example.com");
    await expect(page.locator(".qa-dash-title")).toBeVisible();
    await expect(page.locator(".qa-install-hint")).toHaveCount(0);
  });
});

test("the dashboard shows no install alert outside iOS Safari, and the guide says its steps are for Safari", async ({ page }) => {
  await signIn(page, "install3@example.com");
  await expect(page.locator(".qa-dash-title")).toBeVisible();
  await expect(page.locator(".qa-install-hint")).toHaveCount(0);
  await page.goto("/about/home-screen");
  await expect(page.locator(".qa-install-not-ios")).toBeVisible();
});

test("the guide opens from the About tips and from Settings, on any browser and after the alert was dismissed", async ({ page }) => {
  await signIn(page, "install4@example.com");
  expect((await page.request.post("/api/install-hint/dismiss", { data: {} })).ok()).toBe(true);

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-about").click();
  await page.locator(".qa-about-install-link").click();
  await expect(page).toHaveURL(/\/about\/home-screen$/);
  await expect(page.locator(".qa-install-progress")).toHaveText("Step 1 of 4");

  await page.goto("/settings");
  await page.locator(".qa-settings-install").click();
  await expect(page).toHaveURL(/\/about\/home-screen$/);
  await expect(page.locator(".qa-install-not-ios")).toBeVisible();
});
