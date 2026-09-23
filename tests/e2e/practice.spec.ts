import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.locator(".qa-dev-email").fill(email);
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-user")).toHaveText(email);
}

const slot = (page: Page, i: number) => page.locator(".qa-slot").nth(i);

test("learn a lesson: accent leniency, letter corrections, hints, reveal, notebook", async ({ page }) => {
  await signIn(page, "learner1@example.com");
  await expect(page).toHaveURL(/\/it$/);
  await page.locator(".qa-lesson-start").first().click();

  // caffè typed without its accent: accepted, and the fixed letter stays orange.
  await slot(page, 0).fill("caffe");
  await slot(page, 0).press("Enter");
  await expect(page.locator(".qa-answer .qa-letter-accent")).toHaveText("è");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
  await page.locator(".qa-next").click();

  // vorrei misspelled: letter-level correction, then fixed by the learner.
  await slot(page, 0).fill("vorei");
  await slot(page, 0).press("Enter");
  await expect(page.locator(".qa-slots .qa-letter-insert")).toHaveText("r");
  await expect(page.locator(".qa-answer")).toHaveCount(0);
  await slot(page, 0).fill("vorrei");
  await slot(page, 0).press("Enter");
  await expect(page.locator(".qa-outcome")).toContainText("Corrected");
  // No OPENAI_API_KEY in E2E: the explainer reports it is not configured.
  await page.locator(".qa-why").click();
  await expect(page.locator(".qa-explain .alert-warning")).toContainText("not configured");
  await page.locator(".qa-next").click();

  // "un caffè": hint the first word, type the second.
  await slot(page, 0).focus();
  await page.locator(".qa-hint").click();
  await expect(slot(page, 0)).toHaveValue("un");
  await slot(page, 1).fill("caffè");
  await slot(page, 1).press("Enter");
  await expect(page.locator(".qa-outcome")).toContainText("hints");
  await page.locator(".qa-next").click();

  // "per favore": reveal.
  await page.locator(".qa-reveal").click();
  await expect(page.locator(".qa-answer")).toContainText("per favore");
  await expect(page.locator(".qa-outcome")).toContainText("Revealed");

  await page.locator(".qa-nav-notebook").click();
  await expect(page.locator(".qa-mistake-text")).toHaveText(["per favore", "vorrei"]);
  await expect(page.locator(".qa-mistake").filter({ hasText: "vorrei" }).locator(".qa-letter-insert")).toHaveText("r");

  await page.locator(".qa-mistake").filter({ hasText: "per favore" }).locator(".qa-mistake-remove").click();
  await expect(page.locator(".qa-mistake-text")).toHaveText(["vorrei"]);

  await page.locator(".qa-nav-learn").click();
  await expect(page.locator(".qa-lesson-progress").first()).toContainText("4 / 10");
  await expect(page.locator(".qa-mistakes-count")).toHaveText("1");
});

test("free-text mode on the sentences path: variants accepted, a miss converts to word slots", async ({ page }) => {
  await signIn(page, "learner2@example.com");
  await page.locator(".qa-nav-settings").click();
  await page.locator(".qa-settings-path").selectOption("sentences");
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  await page.locator(".qa-settings-hints").selectOption("none");
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");

  await page.goto("/it/lesson/it-a1-bar-2");
  await expect(page.locator(".qa-position")).toHaveText("1 / 5");
  await page.locator(".qa-free-input").fill("quanto costa");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
  await page.locator(".qa-next").click();

  await page.locator(".qa-free-input").fill("costa 2 euro");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
  await page.locator(".qa-next").click();

  await page.locator(".qa-free-input").fill("il conto favore");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-slot")).toHaveCount(4);
  await expect(page.locator(".qa-word-missing")).toHaveText("per");
  await expect(slot(page, 2)).toBeFocused();
  await slot(page, 2).fill("per");
  await slot(page, 2).press("Enter");
  await expect(page.locator(".qa-outcome")).toContainText("Corrected");
});

test("review is empty for a new learner", async ({ page }) => {
  await signIn(page, "learner3@example.com");
  await page.locator(".qa-review-link").click();
  await expect(page.locator(".qa-session-done")).toContainText("Nothing to practice");
});

test("dark by default with a persistent toggle; sign out from the account menu", async ({ page }) => {
  await signIn(page, "learner4@example.com");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-bs-theme", "dark");
  await page.locator(".qa-theme-toggle").click();
  await expect(html).toHaveAttribute("data-bs-theme", "light");
  await page.reload();
  await expect(html).toHaveAttribute("data-bs-theme", "light");

  await expect(page.locator(".qa-logout")).toBeHidden();
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await expect(page.locator(".qa-dev-email")).toBeVisible();
});

test("a slot shows its whole word plus trailing punctuation without scrolling", async ({ page }) => {
  await signIn(page, "learner5@example.com");
  await page.locator(".qa-lesson-start").first().click();
  await slot(page, 0).fill("caffè,");
  const overflow = await slot(page, 0).evaluate((el: HTMLInputElement) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await slot(page, 0).press("Enter");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
});
