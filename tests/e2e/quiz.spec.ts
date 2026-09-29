import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("a learner misses a quiz question, gets it again at the end, and sees the session in the summary and stats", async ({ page }) => {
  await signIn(page, "quizzer@example.com");
  await page.goto("/it");
  await page.locator(".qa-nav-quiz").click();
  // A2 is locked, so folded.
  await expect(page.locator(".qa-quiz-deck")).toHaveCount(1);
  await page.locator(".qa-quiz-deck-it-a1-grammar-1").click();
  await expect(page.locator(".qa-quiz-count-fresh")).toHaveText("3");
  await page.locator(".qa-quiz-mode-spaced").click();

  await expect(page.locator(".qa-quiz-counter")).toContainText("Remaining: 3");
  await page.locator(".qa-quiz-option:not(.qa-quiz-option-correct)").first().click();
  await expect(page.locator(".qa-quiz-missed")).toBeVisible();
  await page.locator(".qa-quiz-continue").click();
  // The missed question joins the end of the queue.
  await expect(page.locator(".qa-quiz-counter")).toContainText("Remaining: 3");
  for (let left = 3; left > 0; left--) {
    await expect(page.locator(".qa-quiz-counter")).toContainText(`Remaining: ${left}`);
    await page.locator(".qa-quiz-option-correct").click();
    await expect(page.locator(".qa-quiz-right")).toBeVisible();
    await page.locator(".qa-quiz-rate-good").click();
  }

  await expect(page.locator(".qa-quiz-summary-answered")).toHaveText("4");
  await expect(page.locator(".qa-quiz-rated-again")).toContainText("1");
  await expect(page.locator(".qa-quiz-rated-good")).toContainText("3");
  await expect(page.locator(".qa-quiz-summary-new-started")).toHaveText("3");

  await page.locator(".qa-quiz-back-to-deck").click();
  await expect(page.locator(".qa-quiz-count-fresh")).toHaveText("0");
  await expect(page.locator(".qa-quiz-mastery-new")).toContainText("0");
  await page.locator(".qa-quiz-stats-link").click();
  await expect(page.locator(".qa-quiz-session")).toHaveCount(1);
  await page.locator(".qa-quiz-session").click();
  await expect(page.locator(".qa-quiz-answer-table tbody tr")).toHaveCount(4);
});

test("graduating A1's questions celebrates the level and unlocks A2, which starts locked and folded", async ({ page }) => {
  await signIn(page, "leveler@example.com");
  await page.goto("/it/quiz");
  const a2 = page.locator(".qa-quiz-level-A2");
  await expect(a2.locator(".qa-quiz-level-locked")).toBeVisible();
  await expect(a2).toHaveClass(/qa-quiz-level-folded/);
  await a2.locator(".qa-quiz-level-toggle").click();
  await expect(a2.locator(".qa-quiz-deck.disabled")).toHaveCount(1);

  await page.locator(".qa-quiz-deck-it-a1-grammar-1").click();
  await page.locator(".qa-quiz-mode-spaced").click();
  for (let left = 3; left > 0; left--) {
    await expect(page.locator(".qa-quiz-counter")).toContainText(`Remaining: ${left}`);
    await expect(page.locator(".qa-quiz-level-up")).toHaveCount(0);
    await page.locator(".qa-quiz-option-correct").click();
    await page.locator(".qa-quiz-rate-easy").click();
  }
  await expect(page.locator(".qa-quiz-level-up")).toContainText("A1 complete!");
  await expect(page.locator(".qa-quiz-level-up")).toContainText("A2 is unlocked.");
  await expect(page.locator(".qa-quiz-level-up .qa-tada-spark")).toHaveCount(10);

  await page.goto("/it/quiz");
  await expect(page.locator(".qa-quiz-level-A1")).toHaveClass(/qa-quiz-level-folded/);
  await expect(page.locator(".qa-quiz-level-A1 .qa-quiz-level-passed")).toHaveText("Complete");
  await expect(a2.locator(".qa-quiz-level-locked")).toHaveCount(0);
  await expect(a2.locator(".qa-quiz-deck:not(.disabled)")).toHaveCount(1);
});

test("a miss fails a level test; answering every question right tests out of A1, folds it and unlocks A2", async ({ page }) => {
  await signIn(page, "tester@example.com");
  await page.goto("/it/quiz");
  await page.locator(".qa-quiz-level-A1 .qa-quiz-level-test").click();
  await expect(page.locator(".qa-quiz-counter")).toHaveText("1 / 3");
  await page.locator(".qa-quiz-option:not(.qa-quiz-option-correct)").first().click();
  await page.locator(".qa-quiz-continue").click();
  await expect(page.locator(".qa-quiz-test-failed")).toBeVisible();

  await page.locator(".qa-quiz-test-retry").click();
  for (let i = 1; i <= 3; i++) {
    await expect(page.locator(".qa-quiz-counter")).toHaveText(`${i} / 3`);
    await page.locator(".qa-quiz-option-correct").click();
    await page.locator(".qa-quiz-continue").click();
  }
  await expect(page.locator(".qa-quiz-test-passed")).toHaveText("You tested out of A1!");
  await expect(page.locator(".qa-quiz-test-result .qa-tada")).toBeVisible();

  await page.locator(".qa-quiz-test-back").click();
  await expect(page.locator(".qa-quiz-level-A1")).toHaveClass(/qa-quiz-level-folded/);
  await expect(page.locator(".qa-quiz-level-A1 .qa-quiz-level-passed")).toHaveText("Tested out");
  await expect(page.locator(".qa-quiz-level-A1 .qa-quiz-level-test")).toHaveCount(0);
  await expect(page.locator(".qa-quiz-level-A2 .qa-quiz-deck:not(.disabled)")).toHaveCount(1);
  // A passed level unfolds on demand and stays usable.
  await page.locator(".qa-quiz-level-A1 .qa-quiz-level-toggle").click();
  await page.locator(".qa-quiz-deck-it-a1-grammar-1").click();
  await expect(page.locator(".qa-quiz-mode-spaced")).toBeVisible();
});

test("a play button shows an info spinner while its clip renders, then a stop button once it plays", async ({ page }) => {
  // 30 s of silence, so it is still playing when the test looks.
  const rate = 8000, data = 30 * rate * 2;
  const wav = Buffer.alloc(44 + data);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + data, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(data, 40);
  let release!: () => void;
  const rendered = new Promise<void>((r) => (release = r));
  await page.route("**/say?**", async (route) => {
    await rendered;
    await route.fulfill({ contentType: "audio/wav", body: wav });
  });
  await signIn(page, "listener@example.com");
  await page.goto("/it/quiz/it-a1-grammar-1/study/spaced");
  const say = page.locator(".qa-quiz-say-question");
  await say.click();
  await expect(say.locator(".qa-play-loading.text-info")).toBeVisible();
  release();
  await expect(say.locator(".qa-play-loading")).toHaveCount(0);
  await expect(say.locator(".bi-stop-circle")).toBeVisible();
});
