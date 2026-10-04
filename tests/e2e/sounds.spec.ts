import { expect, test, type Page } from "./fixtures.ts";
import { signIn } from "./helpers.ts";

/** Records each UI sound instead of playing it, as "name volume". */
async function recordSounds(page: Page) {
  await page.addInitScript(() => {
    const sounds: string[] = [];
    (window as unknown as { sounds: string[] }).sounds = sounds;
    HTMLMediaElement.prototype.play = function () {
      const name = this.src.match(/\/(click|correct|wrong|victory)-[\w-]+\.mp3$/)?.[1];
      if (name) sounds.push(`${name} ${this.volume} ${this.playbackRate}`);
      return Promise.resolve();
    };
  });
}

const VOLUMES: Record<string, number> = { click: 0.5, correct: 0.5, wrong: 0.5, victory: 0.25 };

/** The UI sounds played since the last call, by name, each checked against its volume and a rate within 0.1 of 1; item audio is ignored. */
async function played(page: Page): Promise<string[]> {
  const sounds = await page.evaluate(() => (window as unknown as { sounds: string[] }).sounds.splice(0));
  return sounds.map((s) => {
    const [name, volume, rate] = s.split(" ");
    expect(Number(volume), name).toBe(VOLUMES[name]);
    expect(Math.abs(Number(rate) - 1), name).toBeLessThanOrEqual(0.1);
    return name;
  });
}

test("buttons click at half volume, a pass sounds correct once, and wrong answers or a reveal sound wrong", async ({ page }) => {
  await recordSounds(page);
  await signIn(page, "sounds1@example.com");
  await page.goto("/it/type");
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

test("finishing a lesson plays the victory sound at a quarter volume", async ({ page }) => {
  await recordSounds(page);
  await signIn(page, "sounds2@example.com");
  await page.goto("/it/type");
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

test("a quiz option sounds correct or wrong at half volume, in study and in a level test", async ({ page }) => {
  await recordSounds(page);
  await signIn(page, "sounds5@example.com");
  await page.goto("/it/quiz/it-a1-grammar-1");
  await page.locator(".qa-quiz-mode-spaced").click();
  await played(page);

  await page.locator(".qa-quiz-option:not(.qa-quiz-option-correct)").first().click();
  expect(await played(page)).toEqual(["click", "wrong"]);
  await page.locator(".qa-quiz-continue").click();
  await played(page);
  await page.locator(".qa-quiz-option-correct").click();
  expect(await played(page)).toEqual(["click", "correct"]);

  await page.goto("/it/quiz/test/A1");
  await played(page);
  await page.locator(".qa-quiz-option-correct").click();
  expect(await played(page)).toEqual(["click", "correct"]);
  await page.locator(".qa-quiz-continue").click();
  await played(page);
  await page.locator(".qa-quiz-option:not(.qa-quiz-option-correct)").first().click();
  expect(await played(page)).toEqual(["click", "wrong"]);
});

test("the navbar and the settings page are silent", async ({ page }) => {
  await recordSounds(page);
  await signIn(page, "sounds3@example.com");
  await played(page);

  await page.locator(".qa-notifications").click();
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await page.locator(".qa-settings-theme").click();
  await page.locator(".qa-settings-theme-light").click();
  await page.locator(".qa-username-save").click();
  await page.locator(".qa-nav-type").click();
  await expect(page).toHaveURL(/\/it\/type$/);
  expect(await played(page)).toEqual([]);

  // Buttons on the page itself still click.
  await page.locator(".qa-help-toggle").click();
  expect(await played(page)).toEqual(["click"]);
});

type Burst = { count: number; left: string; top: string };

/** Records each celebrate burst's emoji count and origin; they fade in 500 ms, so each burst is recorded as it is added rather than raced to be seen. */
async function recordBurstOrigins(page: Page): Promise<() => Promise<Burst[]>> {
  await page.addInitScript(() => {
    const bursts: Burst[] = [];
    (window as unknown as { bursts: Burst[] }).bursts = bursts;
    new MutationObserver((records) => {
      const added = records.flatMap((r) => [...r.addedNodes]).filter((n): n is HTMLElement => n instanceof HTMLElement && n.matches(".qa-celebrate-emoji"));
      if (added.length) bursts.push({ count: added.length, left: added[0].style.left, top: added[0].style.top });
    }).observe(document, { childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { bursts: Burst[] }).bursts.splice(0));
}

/** The emoji count of each celebrate burst. */
async function recordBursts(page: Page) {
  const bursts = await recordBurstOrigins(page);
  return async () => (await bursts()).map((b) => b.count);
}

test("a pass bursts one emoji per pass in a row, and a wrong answer starts the count over", async ({ page }) => {
  const bursts = await recordBursts(page);
  await signIn(page, "sounds4@example.com");
  await page.goto("/it/type");
  await page.locator(".qa-lesson-start").first().click();

  await page.locator(".qa-slot").first().fill("caffè");
  await page.locator(".qa-slot").first().press("Enter");
  expect(await bursts()).toEqual([1]);
  await page.locator(".qa-meaning-option").filter({ hasText: /^\dcoffee$/ }).click();
  await page.locator(".qa-next").click();

  await page.locator(".qa-slot").first().fill("vorrei");
  await page.locator(".qa-slot").first().press("Enter");
  expect(await bursts()).toEqual([2]);
  await page.locator(".qa-meaning-option").filter({ hasText: /^\dI would like$/ }).click();
  await page.locator(".qa-next").click();

  await page.locator(".qa-slot").first().fill("uno");
  await page.locator(".qa-slot").first().press("Enter");
  await page.locator(".qa-slot").first().fill("un");
  await page.locator(".qa-slot").nth(1).fill("caffè");
  await page.locator(".qa-slot").nth(1).press("Enter");
  expect(await bursts()).toEqual([1]);
});

test("a right quiz pick bursts one emoji per right pick in a row, and a wrong pick bursts none and starts the count over", async ({ page }) => {
  const bursts = await recordBursts(page);
  await signIn(page, "sounds6@example.com");
  await page.goto("/it/quiz/it-a1-grammar-1");
  await page.locator(".qa-quiz-mode-spaced").click();

  await page.locator(".qa-quiz-option-correct").click();
  expect(await bursts()).toEqual([1]);
  await page.locator(".qa-quiz-rate-good").click();
  await page.locator(".qa-quiz-option-correct").click();
  expect(await bursts()).toEqual([2]);
  await page.locator(".qa-quiz-rate-good").click();
  await page.locator(".qa-quiz-option:not(.qa-quiz-option-correct)").first().click();
  await expect(page.locator(".qa-quiz-missed")).toBeVisible();
  expect(await bursts()).toEqual([]);
  await page.locator(".qa-quiz-continue").click();
  // The missed question comes back at the end.
  await page.locator(".qa-quiz-option-correct").click();
  expect(await bursts()).toEqual([1]);

  await page.goto("/it/quiz/test/A1");
  await page.locator(".qa-quiz-option-correct").click();
  expect(await bursts()).toEqual([1]);
});

test("a typing burst starts from the center of the exercise card, and a quiz burst from the center of the options", async ({ page }) => {
  const recorded = await recordBurstOrigins(page);
  // The browser rounds style pixels to 3 decimals, so origins compare as numbers, to within half a pixel.
  const bursts = async () => (await recorded()).map((b) => ({ count: b.count, left: parseFloat(b.left), top: parseFloat(b.top) }));
  const center = async (selector: string) => {
    const box = (await page.locator(selector).boundingBox())!;
    return { left: expect.closeTo(box.x + box.width / 2, 0), top: expect.closeTo(box.y + box.height / 2, 0) };
  };
  await signIn(page, "sounds7@example.com");
  await page.goto("/it/type");
  await page.locator(".qa-lesson-start").first().click();
  await page.locator(".qa-slot").first().fill("caffè");
  // Measured before the pass, which reshapes the card to show the finished answer.
  const card = await center(".qa-exercise");
  await page.locator(".qa-slot").first().press("Enter");
  expect(await bursts()).toEqual([{ count: 1, ...card }]);

  await page.goto("/it/quiz/it-a1-grammar-1");
  await page.locator(".qa-quiz-mode-spaced").click();
  const options = await center(".qa-quiz-options");
  await page.locator(".qa-quiz-option-correct").click();
  expect(await bursts()).toEqual([{ count: 1, ...options }]);
});
