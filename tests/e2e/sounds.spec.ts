import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers.ts";

/** Records each UI sound instead of playing it, as "name volume". */
async function recordSounds(page: Page) {
  await page.addInitScript(() => {
    const sounds: string[] = [];
    (window as unknown as { sounds: string[] }).sounds = sounds;
    HTMLMediaElement.prototype.play = function () {
      const name = this.src.match(/\/(click|correct|wrong|victory)-[\w-]+\.mp3$/)?.[1];
      if (name) sounds.push(`${name} ${this.volume}`);
      return Promise.resolve();
    };
  });
}

/** The UI sounds played since the last call, by name; item audio is ignored. */
async function played(page: Page): Promise<string[]> {
  const sounds = await page.evaluate(() => (window as unknown as { sounds: string[] }).sounds.splice(0));
  for (const s of sounds) expect(s).toMatch(/ 0\.5$/);
  return sounds.map((s) => s.split(" ")[0]);
}

test("buttons click at half volume, a pass sounds correct once, and wrong answers or a reveal sound wrong", async ({ page }) => {
  await recordSounds(page);
  await signIn(page, "sounds1@example.com");
  await played(page);

  await page.locator(".qa-lesson-start").first().click();
  expect(await played(page)).toEqual(["click"]);

  // "caffè" with a slipped accent still passes; the Check button clicks first, then the result sounds.
  await page.locator(".qa-slot").first().fill("caffe");
  await page.locator(".qa-check").click();
  expect(await played(page)).toEqual(["click", "correct"]);
  // The right meaning after a passed dictation only clicks: "correct" already played.
  await page.locator(".qa-meaning-option").filter({ hasText: /^\dcoffee$/ }).click();
  expect(await played(page)).toEqual(["click"]);
  // Reporting a problem is silent.
  await page.locator(".qa-report-open").click();
  await page.locator(".qa-report-cancel").click();
  expect(await played(page)).toEqual([]);
  await page.locator(".qa-next").click();
  expect(await played(page)).toEqual(["click"]);

  // "vorrei": a misspelling sounds wrong, the fix sounds correct.
  await page.locator(".qa-slot").first().fill("vorei");
  await page.locator(".qa-slot").first().press("Enter");
  expect(await played(page)).toEqual(["wrong"]);
  await page.locator(".qa-slot").first().fill("vorrei");
  await page.locator(".qa-slot").first().press("Enter");
  expect(await played(page)).toEqual(["correct"]);
  await page.locator(".qa-meaning-option").filter({ hasNotText: /^\dI would like$/ }).first().click();
  expect(await played(page)).toEqual(["click", "wrong"]);
  await page.locator(".qa-next").click();

  // "un caffè": a hint only clicks; revealing sounds wrong.
  await page.locator(".qa-slot").first().focus();
  await played(page);
  await page.locator(".qa-hint").click();
  expect(await played(page)).toEqual(["click"]);
  await page.locator(".qa-reveal").click();
  expect(await played(page)).toEqual(["click", "wrong"]);
});

test("finishing a lesson plays the victory sound at half volume", async ({ page }) => {
  await recordSounds(page);
  await signIn(page, "sounds2@example.com");
  await page.locator(".qa-lesson-start").first().click();
  await expect(page.locator(".qa-exercise")).toBeVisible();
  while (await page.locator(".qa-exercise").count()) {
    await page.locator(".qa-reveal").click();
    await page.locator(".qa-meaning-option").first().click();
    await expect(page.locator(".qa-next")).toBeVisible();
    await played(page);
    await page.locator(".qa-next").click();
  }
  await expect(page.locator(".qa-session-done .qa-tada")).toBeVisible();
  expect(await played(page)).toEqual(["click", "victory"]);
});
