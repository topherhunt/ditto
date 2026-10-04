import { expect, type Page } from "@playwright/test";
import type { SampleIds } from "../route-samples.ts";

/**
 * Dev-logs in from the homepage, learning Italian, and lands on its dashboard. A new account answers the setup screen
 * with `level` and `username` (the email's local part by default).
 */
export async function signIn(page: Page, email: string, username = email.split("@")[0], level = "A2") {
  await page.goto("/");
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill(email);
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-user, .qa-choose-username")).toBeVisible();
  if (await page.locator(".qa-choose-username").isVisible()) {
    await page.locator(`.qa-level-${level}`).click();
    await page.locator(".qa-username").fill(username);
    await page.locator(".qa-username-save").click();
  }
  await expect(page.locator(".qa-user")).toHaveText(username);
}

/** Opens a course's typing catalog and expands its collapsed practice settings panel. */
export async function openPracticeSettings(page: Page, lang: string) {
  await page.goto(`/${lang}/type`);
  await page.locator(".qa-prefs-toggle").click();
  await expect(page.locator(".qa-prefs-form")).toBeVisible();
}

/** Sets the signed-in learner's courses, as the Settings switches do, and reloads so the nav picks them up. */
export async function setLearning(page: Page, languages: string[]) {
  expect((await page.request.put("/api/learning", { data: { languages } })).ok()).toBe(true);
  await page.reload();
}

export async function signOut(page: Page) {
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await expect(page.locator(".qa-dev-email")).toBeVisible();
}

/** Creates, as the signed-in operator, the records some routes need an ID for: a conversation, a quiz session and a user row. */
export async function createSampleIds(page: Page): Promise<SampleIds> {
  const post = async (url: string, data: object) => {
    const res = await page.request.post(url, { data });
    expect(res.ok(), `${url}: ${res.status()}`).toBe(true);
    return res.json();
  };
  const conversation = await post("/api/conversations", { language: "it", level: "A2", scenario: { starter: "cafe" }, hardMode: false });
  const quizSession = await post("/api/quiz/decks/it-a1-grammar-1/sessions", { mode: "spaced" });
  // A session's summary page only exists once it has an answer.
  await post(`/api/quiz/sessions/${quizSession.sessionId}/answers`, { questionId: quizSession.queue[0], rating: "good", responseMs: 1000 });
  const users = await (await page.request.get("/api/admin/users")).json();
  return { conversationId: String(conversation.id), quizSessionId: String(quizSession.sessionId), userId: users[0].id };
}

/** Master refuses to open until its lesson has been finished once; that error page still proves the route matched. */
const EXPECTED_ERRORS: [path: RegExp, message: RegExp][] = [[/\/lesson\/[^/]+\/master$/, /once before you try Master/]];

/** Opens `url` and fails if it lands on "Page not found" or on an error page the app doesn't deliberately show there. */
export async function expectPageOpens(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator(".qa-user, .qa-error").first()).toBeVisible();
  await expect(page.locator(".qa-not-found")).toHaveCount(0);
  if (await page.locator(".qa-error").count() === 0) return;
  const expected = EXPECTED_ERRORS.find(([path]) => path.test(new URL(url, "http://x").pathname));
  expect(expected, `${url} shows an error page`).toBeDefined();
  await expect(page.locator(".qa-error")).toContainText(expected![1]);
}
