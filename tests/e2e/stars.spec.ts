import { expect, test, type Page } from "@playwright/test";
import type { AttemptBody, LessonOut, Prefs } from "../../shared/api.ts";
import { signIn } from "./helpers.ts";

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
  await page.goto("/it/lesson/it-a1-bar-1");
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
  await page.goto("/it/lesson/it-a1-bar-1");
  await page.locator(".qa-study-done").click();
  await page.locator(".qa-slot").first().fill("xyzzy");
  await page.locator(".qa-slot").first().press("Enter");
  await expect(page.locator(".qa-retry")).toBeVisible();
});

test("a phrase of three or more words has tappable words on its study screen", async ({ page }) => {
  await signIn(page, "study3@example.com", "study3", "A1");
  await setPrefs(page, { path: "sentences" });
  await page.goto("/it/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-study-word").first()).toBeVisible();
  await page.locator(".qa-study-word").first().click();
  await expect(page.locator(".qa-word-info")).toBeVisible();
});

test("a learner with study first off goes straight to the input", async ({ page }) => {
  await signIn(page, "study4@example.com", "study4", "A2");
  expect((await (await page.request.get("/api/me")).json()).prefs.it.studyFirst).toBe(false);
  await page.goto("/it/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-slot").first()).toBeVisible();
  await expect(page.locator(".qa-study-done")).toHaveCount(0);
});

test("the practice settings switch study first on, and the catalog's summary follows", async ({ page }) => {
  await signIn(page, "study5@example.com", "study5", "A2");
  await page.goto("/it/settings");
  await expect(page.locator(".qa-settings-studyFirst")).not.toBeChecked();
  await page.locator(".qa-settings-studyFirst").check();
  await expect(page.locator(".qa-settings-status")).toHaveText("Saved");
  expect((await (await page.request.get("/api/me")).json()).prefs.it.studyFirst).toBe(true);
  await page.goto("/it/type");
  await expect(page.locator(".qa-prefs-summary-studyFirst")).toContainText("On");
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
  await expect(page.locator(".qa-lesson-master-locked").first()).toBeDisabled();
  await expect(page.locator(".qa-lesson-master")).toHaveCount(0);
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
  await page.goto("/it/lesson/it-a1-bar-1");
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
