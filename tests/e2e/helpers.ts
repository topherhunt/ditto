import { expect, type Page } from "@playwright/test";

/** Dev-logs in; a new account picks `username` (the email's local part by default) at the prompt. */
export async function signIn(page: Page, email: string, username = email.split("@")[0]) {
  await page.goto("/");
  await page.locator(".qa-dev-email").fill(email);
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-user, .qa-choose-username")).toBeVisible();
  if (await page.locator(".qa-choose-username").isVisible()) {
    await page.locator(".qa-username").fill(username);
    await page.locator(".qa-username-save").click();
  }
  await expect(page.locator(".qa-user")).toHaveText(username);
}

export async function signOut(page: Page) {
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await expect(page.locator(".qa-dev-email")).toBeVisible();
}
