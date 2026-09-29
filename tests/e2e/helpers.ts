import { expect, type Page } from "@playwright/test";

/** Dev-logs in from the homepage, learning Italian; a new account picks `username` (the email's local part by default) at the prompt. */
export async function signIn(page: Page, email: string, username = email.split("@")[0]) {
  await page.goto("/");
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill(email);
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-user, .qa-choose-username")).toBeVisible();
  if (await page.locator(".qa-choose-username").isVisible()) {
    await page.locator(".qa-username").fill(username);
    await page.locator(".qa-username-save").click();
  }
  await expect(page.locator(".qa-user")).toHaveText(username);
}

/** Sets the signed-in learner's courses, as the Settings switches do, and reloads so the nav picks them up. */
export async function setLearning(page: Page, languages: string[]) {
  expect((await page.request.put("/api/learning", { data: { languages } })).ok()).toBe(true);
  await page.reload();
}

export async function signOut(page: Page) {
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await expect(page.locator(".qa-dev-email")).toBeVisible();
}
