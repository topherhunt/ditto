import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("signed-out visitors can open the privacy policy and terms directly, as Google's OAuth review does", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator(".qa-privacy h1")).toHaveText("Privacy policy");
  await expect(page.locator(".qa-privacy")).toContainText("OpenAI");
  await expect(page.locator(".qa-welcome")).toHaveCount(0);

  await page.goto("/terms");
  await expect(page.locator(".qa-terms h1")).toHaveText("Terms of service");
  await expect(page.locator(".qa-welcome")).toHaveCount(0);
});

test("every mention of the contact email on the privacy policy and terms shows the address", async ({ page }) => {
  for (const [path, count] of [["/privacy", 3], ["/terms", 2]] as const) {
    await page.goto(path);
    const links = page.locator(".qa-contact-email");
    await expect(links).toHaveCount(count);
    for (const link of await links.all()) await expect(link).toHaveText(/@/);
  }
});

test("the footer links to the privacy policy and terms, signed out and signed in", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-footer-privacy").click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.locator(".qa-privacy")).toBeVisible();

  await signIn(page, "legal@example.com");
  await page.locator(".qa-footer-terms").click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.locator(".qa-terms")).toBeVisible();
});
