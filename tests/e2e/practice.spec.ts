import { expect, test, type Page } from "@playwright/test";
import type { AttemptBody, LessonOut } from "../../shared/api.ts";
import { signIn } from "./helpers.ts";


const slot = (page: Page, i: number) => page.locator(".qa-slot").nth(i);

/** Answers the meaning check with the option whose text is exactly `meaning` (after its key number). */
async function pickMeaning(page: Page, meaning: string) {
  const exact = new RegExp(`^\\d${meaning.replace(/[.?]/g, "\\$&")}$`);
  await page.locator(".qa-meaning-option").filter({ hasText: exact }).click();
}

test("learn a lesson: accent leniency, letter corrections, hints, reveal, notebook", async ({ page }) => {
  await signIn(page, "learner1@example.com");
  await expect(page).toHaveURL(/\/it$/);
  await page.locator(".qa-lesson-start").first().click();

  // caffè typed without its accent: accepted, and the fixed letter stays orange.
  await slot(page, 0).fill("caffe");
  await slot(page, 0).press("Enter");
  await expect(page.locator(".qa-answer .qa-letter-accent")).toHaveText("è");
  await expect(page.locator(".qa-next")).toHaveCount(0);
  await pickMeaning(page, "coffee");
  await expect(page.locator(".qa-meaning-right")).toContainText("coffee");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
  await page.locator(".qa-next").click();

  // vorrei misspelled: letter-level correction, then fixed by the learner.
  await slot(page, 0).fill("vorei");
  await slot(page, 0).press("Enter");
  await expect(page.locator(".qa-slots .qa-letter-insert")).toHaveText("r");
  await expect(page.locator(".qa-answer")).toHaveCount(0);
  await slot(page, 0).fill("vorrei");
  await slot(page, 0).press("Enter");
  await pickMeaning(page, "I would like");
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
  await pickMeaning(page, "a coffee");
  await expect(page.locator(".qa-outcome")).toContainText("hints");
  await page.locator(".qa-next").click();

  // "per favore": reveal.
  await page.locator(".qa-reveal").click();
  await expect(page.locator(".qa-answer")).toContainText("per favore");
  await pickMeaning(page, "please");
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

test("free-text mode: lenient commas, a wrong end mark converts to slots, a wrong meaning pick", async ({ page }) => {
  await signIn(page, "learner2@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page).toHaveURL(/\/settings$/);
  // Each course's settings start collapsed.
  const italian = page.locator(".qa-settings-lang-it");
  await expect(italian.locator(".qa-settings-path")).toBeHidden();
  await italian.locator("summary").click();
  await italian.locator(".qa-settings-path").selectOption("sentences");
  await expect(italian.locator(".qa-settings-status")).toHaveText("Saved");
  await italian.locator(".qa-settings-hints").selectOption("none");
  await expect(italian.locator(".qa-settings-status")).toHaveText("Saved");

  await page.goto("/it/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-position")).toHaveText("1 / 3");
  // "Vorrei un caffè, per favore.": a semicolon for the comma and ! for the period are fine.
  await page.locator(".qa-free-input").fill("vorrei un caffè; per favore!");
  await page.locator(".qa-free-input").press("Enter");
  await pickMeaning(page, "I'd like a coffee, please.");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
  await page.locator(".qa-next").click();

  // "Vorrei un caffè e un cornetto.": the stray comma is only flagged; the question mark is an error.
  await page.locator(".qa-free-input").fill("vorrei, un caffè e un cornetto?");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-slot")).toHaveCount(6);
  await expect(page.locator(".qa-slots .qa-punct-stray")).toHaveText(",");
  await expect(page.locator(".qa-slots .qa-punct-wrong")).toHaveText("?");
  await expect(page.locator(".qa-slots .qa-punct-expected")).toHaveText(".");
  await expect(slot(page, 5)).toBeFocused();
  await slot(page, 5).fill("cornetto.");
  await slot(page, 5).press("Enter");
  await expect(page.locator(".qa-answer .qa-punct-stray")).toHaveText(",");
  await pickMeaning(page, "I'd like a coffee and a croissant.");
  await expect(page.locator(".qa-outcome")).toContainText("Corrected");
  await page.locator(".qa-next").click();

  // "Per me, un'acqua frizzante, grazie.": a missing word converts to slots; then the wrong meaning.
  await page.locator(".qa-free-input").fill("per me un'acqua grazie");
  await page.locator(".qa-free-input").press("Enter");
  await expect(page.locator(".qa-word-missing")).toHaveText("frizzante");
  await expect(slot(page, 3)).toBeFocused();
  await slot(page, 3).fill("frizzante");
  await slot(page, 3).press("Enter");
  await pickMeaning(page, "For me, a coffee, thanks.");
  await expect(page.locator(".qa-meaning-wrong")).toContainText("For me, a coffee");
  await expect(page.locator(".qa-meaning-right")).toContainText("a sparkling water");
  await expect(page.locator(".qa-outcome")).toContainText("check the meaning");
});

/** Completes the lesson on the sentences path through the API, answering every item cleanly. */
async function completeLesson(page: Page, lessonId: string) {
  const lesson = (await (await page.request.get(`/api/lessons/${lessonId}?lang=it`)).json()) as LessonOut;
  for (const u of lesson.units.filter((x) => x.stage === "sentence")) {
    const data: AttemptBody = {
      unitId: u.id, rev: u.rev, mode: "learn", path: "sentences", hintsLevel: "letters", outcome: "clean", wrongSubmissions: 0, hintsUsed: 0,
      replays: 0, accentSlips: 0, submissions: [u.text], categories: [], meaningCorrect: u.distractors ? true : null, durationMs: 1000,
    };
    expect((await page.request.post("/api/attempts", { data })).ok()).toBe(true);
  }
}

test("a finished course folds to its title, and opens on click", async ({ page }) => {
  await signIn(page, "folds1@example.com");
  await completeLesson(page, "it-a1-bar-1");
  await completeLesson(page, "it-a1-bar-2");
  await page.reload();
  // Al bar is A1's only main-track course, so the level folds too.
  await page.locator(".qa-level-toggle").click();
  const bar = page.locator(".qa-course-it-a1-bar");
  await expect(bar).toHaveClass(/qa-course-folded/);
  await expect(bar.locator(".qa-lesson")).toHaveCount(0);
  await expect(page.locator(".qa-course-it-a1-tea .qa-lesson")).toHaveCount(1);

  await bar.locator(".qa-course-toggle").click();
  await expect(bar.locator(".qa-course-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(bar.locator(".qa-lesson")).toHaveCount(2);
});

test("later lessons and modules stay locked until the ones before are done", async ({ page }) => {
  await signIn(page, "learner6@example.com");
  await expect(page.locator(".qa-lesson-start")).toHaveCount(1);
  await expect(page.locator(".qa-lesson-locked")).toHaveCount(1);
  await expect(page.locator(".qa-course-locked")).toContainText("after Al bar");
  await expect(page.locator(".qa-course-locked .qa-course-optional")).toBeVisible();
  await page.goto("/it/lesson/it-a1-bar-2");
  await expect(page.locator(".alert-danger")).toContainText("locked");
});

test("report a problem with an item: pick a kind, add a note, send with Enter", async ({ page }) => {
  await signIn(page, "learner7@example.com");
  await page.locator(".qa-lesson-start").first().click();
  await page.locator(".qa-report-open").click();
  await expect(page.locator(".qa-report-send")).toBeDisabled();
  const note = page.locator(".qa-report-note");
  await note.fill("garbled");
  await note.press("Enter");
  await expect(page.locator(".qa-report")).toBeVisible();
  await page.locator(".qa-report-kind-audio").check();
  await note.press("Shift+Enter");
  await note.pressSequentially("noise");
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/reports"));
  await note.press("Enter");
  expect((await sent).postDataJSON()).toMatchObject({ kind: "audio", note: "garbled\nnoise" });
  await expect(page.locator(".qa-report-sent")).toBeVisible();

  // The item itself is unaffected, and the next item starts with a closed link.
  await slot(page, 0).fill("caffè");
  await slot(page, 0).press("Enter");
  await pickMeaning(page, "coffee");
  await page.locator(".qa-next").click();
  await expect(page.locator(".qa-report-open")).toBeVisible();
});

test("an answer graded wrong can be reported as one that should be accepted", async ({ page }) => {
  await signIn(page, "learner15@example.com");
  await page.locator(".qa-lesson-start").first().click();
  await page.locator(".qa-report-open").click();
  await expect(page.locator(".qa-report-kind-accept")).toHaveCount(0);
  await page.locator(".qa-report-cancel").click();

  await slot(page, 0).fill("cafe latte");
  await slot(page, 0).press("Enter");
  await page.locator(".qa-report-open").click();
  await expect(page.locator(".qa-report-answer")).toHaveText("cafe latte");
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/reports"));
  await page.locator(".qa-report-kind-accept").check();
  await page.locator(".qa-report-send").click();
  expect((await sent).postDataJSON()).toMatchObject({ kind: "accept", answer: "cafe latte" });
  await expect(page.locator(".qa-report-sent")).toBeVisible();
});

test("finishing a lesson celebrates, and Enter goes back to the lessons", async ({ page }) => {
  await signIn(page, "learner8@example.com");
  await page.locator(".qa-lesson-start").first().click();
  await expect(page.locator(".qa-exercise")).toBeVisible();
  while (await page.locator(".qa-exercise").count()) {
    await page.locator(".qa-reveal").click();
    await page.locator(".qa-meaning-option").first().click();
    await page.locator(".qa-next").click();
  }
  await expect(page.locator(".qa-session-done .qa-tada")).toBeVisible();
  await expect(page.locator(".qa-back")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".qa-lesson-start").first()).toBeVisible();
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
  await pickMeaning(page, "coffee");
  await expect(page.locator(".qa-outcome")).toContainText("Perfect");
});
