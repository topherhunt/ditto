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
    await expect(page.locator(".qa-install-text")).toHaveCount(0);
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

test.describe("on other mobile browsers", () => {
  test("Chrome on iOS gets the alert and a written guide instead of the Safari screenshots", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: devices["iPhone 13"].userAgent.replace("Version/", "CriOS/120.0 Version/") });
    const p = await context.newPage();
    await signIn(p, "install5@example.com");
    await p.locator(".qa-install-hint-show").click();
    await expect(p.locator(".qa-install-text")).toContainText("Add to Home Screen");
    await expect(p.locator(".qa-install-image")).toHaveCount(0);
    await context.close();
  });

  test("Chrome on Android gets the alert, and the button opens the native install dialog when the browser offers one", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: devices["Pixel 7"].userAgent });
    const p = await context.newPage();
    await signIn(p, "install6@example.com");
    await expect(p.locator(".qa-install-hint-show")).toBeVisible();
    await p.evaluate(() => {
      (window as unknown as { __prompted: boolean }).__prompted = false;
      window.dispatchEvent(Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: async () => { (window as unknown as { __prompted: boolean }).__prompted = true; },
        userChoice: Promise.resolve({ outcome: "accepted" }),
      }));
    });
    await p.locator(".qa-install-hint-prompt").click();
    await expect(p.locator(".qa-install-hint")).toHaveCount(0);
    expect(await p.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted)).toBe(true);
    expect((await (await p.request.get("/api/me")).json()).installHintDismissed).toBe(true);
    await context.close();
  });

  test("Android without a native install dialog links to a written guide", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: devices["Pixel 7"].userAgent });
    const p = await context.newPage();
    await signIn(p, "install7@example.com");
    await expect(p.locator(".qa-install-hint-prompt")).toHaveCount(0);
    await p.locator(".qa-install-hint-show").click();
    await expect(p.locator(".qa-install-text")).toContainText("Install app");
    await context.close();
  });
});

test("the dashboard shows no install alert on desktop, and the guide tells the learner to use their phone", async ({ page }) => {
  await signIn(page, "install3@example.com");
  await expect(page.locator(".qa-dash-title")).toBeVisible();
  await expect(page.locator(".qa-install-hint")).toHaveCount(0);
  await page.goto("/about/home-screen");
  await expect(page.locator(".qa-install-text")).toContainText("on your phone");
});

test("the guide opens from the About tips and from Settings, on any browser and after the alert was dismissed", async ({ page }) => {
  await signIn(page, "install4@example.com");
  expect((await page.request.post("/api/install-hint/dismiss", { data: {} })).ok()).toBe(true);

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-about").click();
  await page.locator(".qa-about-install-link").click();
  await expect(page).toHaveURL(/\/about\/home-screen$/);
  await expect(page.locator(".qa-install-text")).toBeVisible();

  await page.goto("/settings");
  await page.locator(".qa-settings-install").click();
  await expect(page).toHaveURL(/\/about\/home-screen$/);
  await expect(page.locator(".qa-install-text")).toBeVisible();
});
