import { expect, test, type Page } from "@playwright/test";
import type { LevelTestOut } from "../../shared/api.ts";
import { signIn } from "./helpers.ts";

/** Opens the A1 level test from the home page and returns the sentences it serves, in order. */
async function startTest(page: Page, open: () => Promise<void>) {
  const served = page.waitForResponse((r) => r.url().includes("/api/level-test?"));
  await open();
  return ((await (await served).json()) as LevelTestOut).units;
}

async function answer(page: Page, text: string, meaning: string) {
  await page.locator(".qa-free-input").fill(text);
  await page.locator(".qa-free-input").press("Enter");
  await page.locator(".qa-meaning-option").filter({ hasText: new RegExp(`^\\d${meaning.replace(/[.?]/g, "\\$&")}$`) }).click();
}

test("next lesson button, then a level test: fail on the first miss, retry, pass, and the level unlocks unchecked", async ({ page }) => {
  await signIn(page, "tester1@example.com");
  await expect(page.locator(".qa-next-lesson")).toContainText("Un caffè, per favore");
  await expect(page.locator(".qa-level-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".qa-course-locked")).toHaveCount(1);

  let units = await startTest(page, () => page.locator(".qa-level-test").click());
  await expect(page).toHaveURL(/\/it\/test\/A1$/);
  await expect(page.locator(".qa-hint")).toHaveCount(0);
  // One wrong check ends the item, and the test with it.
  await page.locator(".qa-free-input").fill("sbagliato");
  await page.locator(".qa-free-input").press("Enter");
  await page.locator(".qa-meaning-option").first().click();
  await page.locator(".qa-next").click();
  await expect(page.locator(".qa-test-failed")).toBeVisible();

  units = await startTest(page, () => page.locator(".qa-test-retry").click());
  for (const u of units) {
    await answer(page, u.text, u.translation!);
    await page.locator(".qa-next").click();
  }
  await expect(page.locator(".qa-test-passed")).toBeVisible();

  await page.locator(".qa-back").click();
  await expect(page.locator(".qa-level-passed")).toBeVisible();
  await expect(page.locator(".qa-level-test")).toHaveCount(0);
  await expect(page.locator(".qa-course")).toHaveCount(0);
  await page.locator(".qa-level-toggle").click();
  await expect(page.locator(".qa-course-locked")).toHaveCount(0);
  await expect(page.locator(".qa-lesson-start")).toHaveCount(3);
  await expect(page.locator(".qa-lesson-progress").filter({ hasText: "✓" })).toHaveCount(0);

  await page.locator(".qa-next-lesson").click();
  await expect(page).toHaveURL(/\/it\/lesson\/it-a1-bar-1$/);
});
