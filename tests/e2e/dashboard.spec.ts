import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("a new learner's dashboard coaches the first lesson, and practicing shows on the calendar and streak", async ({ page }) => {
  await signIn(page, "dash1@example.com");
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-dash-title")).toHaveText("🇮🇹 Italian");
  await expect(page.locator(".qa-dash-coach-first")).toContainText("Un caffè, per favore");
  await expect(page.locator(".qa-dash-streak")).toHaveText("Practice today to start a streak");
  await expect(page.locator(".qa-dash-active-days")).toHaveText("Practiced 0 of the last 30 days");
  await expect(page.locator(".qa-dash-day-active")).toHaveCount(0);
  await expect(page.locator(".qa-dash-ladder-type .qa-dash-ladder-status")).toHaveText("0% of the way to A1");
  await expect(page.locator(".qa-dash-way")).toHaveCount(3);
  // Each card invites to its own next step.
  await expect(page.locator(".qa-dash-start-type")).toHaveText("Start lesson: Un caffè, per favore");
  await expect(page.locator(".qa-dash-start-type")).toHaveAttribute("href", "/it/type/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-dash-start-talk")).toHaveText("Start your first conversation");
  await expect(page.locator(".qa-dash-start-talk")).toHaveAttribute("href", "/it/talk");
  await expect(page.locator(".qa-dash-start-quiz")).toHaveText(/^Study A1 /);
  await expect(page.locator(".qa-dash-start-quiz")).toHaveAttribute("href", /^\/it\/quiz\/it-a1-/);

  await page.locator(".qa-dash-coach-go").click();
  await expect(page).toHaveURL(/\/it\/type\/lesson\/it-a1-bar-1$/);
  await page.locator(".qa-reveal").click();
  await page.locator(".qa-meaning-option").first().click();
  await expect(page.locator(".qa-next")).toBeVisible();

  await page.locator(".qa-nav-home").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-dash-coach-first")).toHaveCount(0);
  await expect(page.locator(".qa-dash-start-type")).toHaveText("Continue lesson: Un caffè, per favore");
  await expect(page.locator(".qa-dash-day-active")).toHaveCount(1);
  await expect(page.locator(".qa-dash-streak")).toHaveText("🔥 1-day streak");
  await expect(page.locator(".qa-dash-active-days")).toHaveText("Practiced 1 of the last 30 days");
});

test("a B1 answer on the setup screen picks the chunks path and suggests testing out of A1, until the level is changed", async ({ page }) => {
  await signIn(page, "dash2@example.com", "dash2", "B1");
  const me = await (await page.request.get("/api/me")).json();
  expect(me.prefs.it).toMatchObject({ level: "B1", path: "chunks" });
  await expect(page.locator(".qa-dash-testout")).toContainText("A1");
  await expect(page.locator(".qa-dash-testout-go")).toHaveAttribute("href", "/it/type/test/A1");

  await page.locator(".qa-dash-level-change").click();
  await expect(page.locator(".qa-dash-level-question")).toBeVisible();
  await page.locator(".qa-dash-level-question .qa-level-A1").click();
  await expect(page.locator(".qa-dash-coach")).toContainText("Your level: A1.");
  await expect(page.locator(".qa-dash-testout")).toHaveCount(0);
});

test("the setup screen won't save without a level", async ({ page }) => {
  await page.goto("/");
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill("dash3@example.com");
  await page.locator(".qa-dev-submit").click();
  await page.locator(".qa-username").fill("dash3");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-choose-username")).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  expect(me.username).toBeNull();
});

test("an activity's help opens by itself on a first visit, stays closed once dismissed, and reopens from its button", async ({ page }) => {
  await signIn(page, "dash4@example.com");
  await page.locator(".qa-dash-way-link-type").click();
  await expect(page.locator(".qa-activity-title")).toHaveText("Listen and type");
  await expect(page.locator(".qa-help li")).toHaveCount(4);
  await page.locator(".qa-help-close").click();
  await expect(page.locator(".qa-help")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".qa-activity-title")).toBeVisible();
  await expect(page.locator(".qa-help")).toHaveCount(0);
  await page.locator(".qa-help-toggle").click();
  await expect(page.locator(".qa-help")).toBeVisible();

  // Each activity has its own first visit.
  await page.locator(".qa-nav-quiz").click();
  await expect(page.locator(".qa-activity-title")).toHaveText("Quiz");
  await expect(page.locator(".qa-help")).toBeVisible();
});

test("the dashboard's language menu starts another language, asks its level, and switches back", async ({ page }) => {
  await signIn(page, "dash5@example.com", "dash5", "A1");
  await page.locator(".qa-dash-lang").click();
  await expect(page.locator(".qa-dash-lang-it")).toHaveClass(/active/);
  await page.locator(".qa-dash-lang-nl").click();
  await expect(page).toHaveURL(/\/nl$/);
  await expect(page.locator(".qa-dash-level-question legend")).toHaveText("How much Dutch do you know?");
  await page.locator(".qa-level-A2").click();
  await expect(page.locator(".qa-dash-coach")).toContainText("Your level: A2.");
  const me = await (await page.request.get("/api/me")).json();
  expect(me.learning).toEqual(["it", "nl"]);
  expect(me.prefs.nl.level).toBe("A2");

  await page.locator(".qa-dash-lang").click();
  await page.locator(".qa-dash-lang-it").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-dash-coach")).toContainText("Your level: A1.");
});
