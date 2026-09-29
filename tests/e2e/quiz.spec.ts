import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("a learner misses a quiz question, gets it again at the end, and sees the session in the summary and stats", async ({ page }) => {
  await signIn(page, "quizzer@example.com");
  await page.goto("/it");
  await page.locator(".qa-nav-quiz").click();
  await expect(page.locator(".qa-quiz-deck")).toHaveCount(2);
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
