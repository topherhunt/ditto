import { expect, test, type Page } from "./fixtures.ts";
import type { AttemptBody, LessonOut, Prefs } from "../../shared/api.ts";
import { routes } from "../../web/src/routes.ts";
import { openPracticeSettings, signIn } from "./helpers.ts";

/** Answers every item of the lesson on `path` through the API. Full-path answers with hints off earn three stars. */
async function completeLesson(page: Page, lessonId: string, path: "full" | "sentences", hintsLevel: AttemptBody["hintsLevel"], outcome: AttemptBody["outcome"] = "clean") {
  const lesson = (await (await page.request.get(`/api/lessons/${lessonId}?lang=it`)).json()) as LessonOut;
  const units = path === "full" ? lesson.units : lesson.units.filter((x) => x.stage === "sentence");
  for (const u of units) {
    const data: AttemptBody = {
      unitId: u.id, rev: u.rev, mode: "learn", path, hintsLevel, outcome, wrongSubmissions: outcome === "clean" ? 0 : 1, hintsUsed: 0,
      replays: 0, accentSlips: 0, submissions: [u.text], categories: [], meaningCorrect: u.distractors ? true : null, durationMs: 1000, studied: false, master: false,
    };
    expect((await page.request.post("/api/attempts", { data })).ok()).toBe(true);
  }
}

async function setPrefs(page: Page, patch: Partial<Prefs>) {
  const me = await (await page.request.get("/api/me")).json();
  expect((await page.request.put("/api/prefs", { data: { language: "it", prefs: { ...me.prefs.it, ...patch } } })).ok()).toBe(true);
}

test("a beginner starts with study first on, and a new item shows its sound and meaning before the input", async ({ page }) => {
  await signIn(page, "study1@example.com", "study1", "A1");
  expect((await (await page.request.get("/api/me")).json()).prefs.it.studyFirst).toBe(true);
  await page.goto("/it/type/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-study-translation")).toHaveText("coffee");
  await expect(page.locator(".qa-slot")).toHaveCount(0);
  // A single word isn't broken into tappable words.
  await expect(page.locator(".qa-study-word")).toHaveCount(0);
  await page.locator(".qa-study-done").click();
  await expect(page.locator(".qa-slot").first()).toBeVisible();
  await expect(page.locator(".qa-study-done")).toHaveCount(0);
});

test("a wrong answer after the study screen still counts as wrong", async ({ page }) => {
  await signIn(page, "study2@example.com", "study2", "A1");
  await page.goto("/it/type/lesson/it-a1-bar-1");
  await page.locator(".qa-study-done").click();
  await page.locator(".qa-slot").first().fill("xyzzy");
  await page.locator(".qa-slot").first().press("Enter");
  await expect(page.locator(".qa-retry")).toBeVisible();
});

test("a phrase of three or more words has tappable words on its study screen", async ({ page }) => {
  await signIn(page, "study3@example.com", "study3", "A1");
  await setPrefs(page, { path: "sentences" });
  await page.goto("/it/type/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-study-word").first()).toBeVisible();
  await page.locator(".qa-study-word").first().click();
  await expect(page.locator(".qa-word-info")).toBeVisible();
});

test("a learner with study first off goes straight to the input", async ({ page }) => {
  await signIn(page, "study4@example.com", "study4", "A2");
  expect((await (await page.request.get("/api/me")).json()).prefs.it.studyFirst).toBe(false);
  await page.goto("/it/type/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-slot").first()).toBeVisible();
  await expect(page.locator(".qa-study-done")).toHaveCount(0);
});

test("the practice settings switch study first on, and the catalog's summary follows", async ({ page }) => {
  await signIn(page, "study5@example.com", "study5", "A2");
  await openPracticeSettings(page, "it");
  await expect(page.locator(".qa-settings-studyFirst")).not.toBeChecked();
  await page.locator(".qa-settings-studyFirst").check();
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  expect((await (await page.request.get("/api/me")).json()).prefs.it.studyFirst).toBe(true);
  await page.locator(".qa-prefs-toggle").click();
  await expect(page.locator(".qa-prefs-summary-studyFirst")).toContainText("Study first");
});

test("a completed lesson shows its stars with a Practice button and a locked Master", async ({ page }) => {
  await signIn(page, "stars1@example.com", "stars1", "A2");
  await completeLesson(page, "it-a1-bar-1", "sentences", "letters", "corrected");
  await page.goto("/it/type");
  const stars = page.locator(".qa-lesson-stars").first();
  await expect(stars.locator(".qa-star-on")).toHaveCount(1);
  await expect(stars.locator(".qa-star-off")).toHaveCount(2);
  await expect(page.locator(".qa-lesson-start").first()).toHaveText("Practice");
  await expect(page.locator(".qa-lesson-start").first()).toHaveClass(/btn-success/);
  await expect(page.locator(".qa-lesson-master-locked").first()).toBeVisible();
  await expect(page.locator(".qa-lesson-master")).toHaveCount(0);
});

test("a lesson with stars hides its progress count, and a lesson without any shows it", async ({ page }) => {
  await signIn(page, "stars4@example.com", "stars4", "A2");
  await completeLesson(page, "it-a1-bar-1", "sentences", "letters", "corrected");
  await page.goto("/it/type");
  await expect(page.locator(".qa-lesson").first().locator(".qa-lesson-stars")).toBeVisible();
  await expect(page.locator(".qa-lesson").first().locator(".qa-lesson-progress")).toHaveCount(0);
  await expect(page.locator(".qa-lesson").nth(1).locator(".qa-lesson-progress")).toBeVisible();
});

test("a three-star lesson has no Master button and a quieter Practice button", async ({ page }) => {
  await signIn(page, "stars2@example.com", "stars2", "A2");
  await completeLesson(page, "it-a1-bar-1", "full", "none");
  await page.goto("/it/type");
  await expect(page.locator(".qa-lesson-stars").first().locator(".qa-star-on")).toHaveCount(3);
  await expect(page.locator(".qa-lesson-master, .qa-lesson-master-locked")).toHaveCount(0);
  await expect(page.locator(".qa-lesson-start").first()).toHaveClass(/btn-outline-success/);
});

test("finishing a run shows the stars it earned", async ({ page }) => {
  await signIn(page, "stars3@example.com", "stars3", "A2");
  await setPrefs(page, { path: "sentences", hints: "none" });
  await page.goto("/it/type/lesson/it-a1-bar-1");
  const lesson = (await (await page.request.get("/api/lessons/it-a1-bar-1?lang=it")).json()) as LessonOut;
  const sentences = lesson.units.filter((u) => u.stage === "sentence");
  for (const [i, u] of sentences.entries()) {
    await page.locator(".qa-free-input").fill(u.text);
    await page.locator(".qa-free-input").press("Enter");
    if (u.distractors) await page.locator(".qa-meaning-option").filter({ hasText: u.translation }).click();
    await page.locator(".qa-next").click();
    if (i < sentences.length - 1) await expect(page.locator(".qa-free-input")).toBeVisible();
  }
  // The sentences path is capped at two stars.
  await expect(page.locator(".qa-earned .qa-star-on")).toHaveCount(2);
});

test("the hourglass explains that Master is closed because the lesson was just practiced", async ({ page }) => {
  await signIn(page, "stars5@example.com", "stars5", "A2");
  await completeLesson(page, "it-a1-bar-1", "sentences", "letters", "corrected");
  await page.goto("/it/type");
  const row = page.locator(".qa-lesson").first();
  await expect(row.locator(".qa-cooldown-popup")).toBeHidden();
  await row.locator(".qa-lesson-master-locked").click();
  await expect(row.locator(".qa-cooldown-popup")).toBeVisible();
  await row.locator(".qa-cooldown-ok").click();
  await expect(row.locator(".qa-cooldown-popup")).toBeHidden();
});

test("Master asks for confirmation first, offering the test or more practice", async ({ page }) => {
  await signIn(page, "stars6@example.com", "stars6", "A2");
  await completeLesson(page, "it-a1-bar-1", "sentences", "letters", "corrected");
  // The wait is measured on the page's clock, so a clock a day ahead opens Master without waiting.
  await page.clock.install({ time: new Date(Date.now() + 24 * 3_600_000) });
  await page.goto("/it/type");
  const row = page.locator(".qa-lesson").first();
  await expect(row.locator(".qa-lesson-master-locked")).toHaveCount(0);
  await row.locator(".qa-lesson-master").click();
  await expect(row.locator(".qa-master-popup")).toBeVisible();
  const at = { lang: "it", lessonId: "it-a1-bar-1" };
  await row.locator(".qa-master-more").click();
  await expect(page).toHaveURL(routes.typeLesson(at));
  await expect(page.locator(".qa-lesson-back")).toBeVisible();
  await page.goto(routes.type({ lang: "it" }));
  await row.locator(".qa-lesson-master").click();
  await row.locator(".qa-master-ready").click();
  await expect(page).toHaveURL(routes.typeMaster(at));
  await expect(page.locator(".qa-lesson-back")).toBeVisible();
  await expect(page.locator(".qa-error")).toHaveCount(0);
});

test("a catalog of lessons without stars renders every lesson row without a page error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page, "stars7@example.com", "stars7", "A2");
  await page.goto("/it/type");
  await expect(page.locator(".qa-lesson").nth(1)).toBeVisible();
  await expect(page.locator(".qa-lesson-stars")).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 800, 1200]) {
  test(`at ${width}px the stars and buttons of a lesson stay on one line`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, `stars-w${width}@example.com`, `starsw${width}`, "A2");
    await completeLesson(page, "it-a1-bar-1", "sentences", "letters", "corrected");
    await page.clock.install({ time: new Date(Date.now() + 24 * 3_600_000) });
    await page.goto("/it/type");
    const parts = page.locator(".qa-lesson").first().locator(".qa-lesson-actions > *");
    await expect(parts).toHaveCount(3);
    const tops = await parts.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2)));
    expect(new Set(tops.map((y) => Math.round(y / 4))).size).toBe(1);
    const box = await page.locator(".qa-lesson").first().locator(".qa-lesson-actions").boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });
}
