import { expect, test } from "@playwright/test";
import { setLearning, signIn } from "./helpers.ts";

test("a new learner's dashboard coaches the first lesson, and practicing shows on the streak, chart and stars", async ({ page }) => {
  await signIn(page, "dash1@example.com");
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-dash-title")).toHaveText("🇮🇹 Italian");
  await expect(page.locator(".qa-dash-coach-first")).toContainText("Un caffè, per favore");
  await expect(page.locator(".qa-dash-streak")).toHaveText("Practice today to start a streak");
  await expect(page.locator(".qa-dash-active-days")).toHaveText("Practiced 0 of the last 30 days");
  await expect(page.locator(".qa-dash-chart")).toBeVisible();
  await expect(page.locator(".qa-dash-stars-total")).toHaveText("0");
  await expect(page.locator(".qa-dash-stars-today")).toHaveCount(0);
  await expect(page.locator(".qa-dash-ladder-status")).toHaveText("0% of the way to A1");
  await expect(page.locator(".qa-dash-way")).toHaveCount(3);
  // Each card opens its activity's page, not a specific lesson, deck or conversation.
  for (const [activity, name] of [["type", "Type"], ["talk", "Talk"], ["quiz", "Quiz"]]) {
    await expect(page.locator(`.qa-dash-start-${activity}`)).toContainText(`Open ${name}`);
    await expect(page.locator(`.qa-dash-start-${activity}`)).toHaveAttribute("href", `/it/${activity}`);
  }

  await page.locator(".qa-dash-coach-go").click();
  await expect(page).toHaveURL(/\/it\/type\/lesson\/it-a1-bar-1$/);
  await page.locator(".qa-reveal").click();
  await page.locator(".qa-meaning-option").first().click();
  await expect(page.locator(".qa-next")).toBeVisible();

  await page.locator(".qa-nav-home").click();
  await expect(page).toHaveURL(/\/it$/);
  await expect(page.locator(".qa-dash-coach-first")).toHaveCount(0);
  await expect(page.locator(".qa-dash-streak")).toHaveText("🔥 1-day streak");
  await expect(page.locator(".qa-dash-active-days")).toHaveText("Practiced 1 of the last 30 days");
});

test("the dashboard's top row opens friends, the leaderboard and settings, and its bottom row opens the guide and the feedback form", async ({ page }) => {
  await signIn(page, "dash8@example.com");
  await expect(page.locator(".qa-dash-friends-count")).toHaveText("0");
  await expect(page.locator(".qa-dash-rank")).toHaveCount(0);
  await expect(page.locator(".qa-dash-feedback-go")).toHaveAttribute("href", /^https:\/\/docs\.google\.com\/forms\//);
  for (const [button, path] of [["friends", "/friends"], ["leaderboard", "/leaderboard"], ["settings", "/settings"], ["about-go", "/about"]]) {
    await page.locator(`.qa-dash-${button}`).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await page.goBack();
    await expect(page.locator(".qa-dashboard")).toBeVisible();
  }
});

test("the leaderboard button's badge shows your rank among friends in gold, silver, bronze or gray, and the friends button their count", async ({ page }) => {
  await signIn(page, "dash9@example.com");
  for (const [rank, color] of [[1, "rank-1"], [2, "rank-2"], [3, "rank-3"], [4, "text-bg-secondary"]] as const) {
    await page.route("**/api/social-summary", (route) => route.fulfill({ json: { friends: 5, weekRank: rank } }));
    await page.reload();
    await expect(page.locator(".qa-dash-friends-count")).toHaveText("5");
    await expect(page.locator(".qa-dash-rank")).toHaveText(String(rank));
    await expect(page.locator(".qa-dash-rank")).toHaveClass(new RegExp(`\\b${color}\\b`));
  }
});

test("finishing a lesson adds its stars to the dashboard's total and today's count", async ({ page }) => {
  await signIn(page, "dash11@example.com");
  await page.goto("/it/type/lesson/it-a1-bar-1");
  await expect(page.locator(".qa-exercise")).toBeVisible();
  while (await page.locator(".qa-exercise").count()) {
    await page.locator(".qa-reveal").click();
    await page.locator(".qa-meaning-option").first().click();
    await page.locator(".qa-next").click();
  }
  await expect(page.locator(".qa-session-done .qa-tada")).toBeVisible();
  const stars = (await (await page.request.get("/api/catalog?lang=it")).json()).stars["it-a1-bar-1"].stars as number;
  await page.goto("/it");
  await expect(page.locator(".qa-dash-stars-total")).toHaveText(String(stars));
  await expect(page.locator(".qa-dash-stars-today")).toHaveText(`+${stars} today`);
});

test("a B1 answer on the setup screen picks the chunks path and suggests testing out of A1, until the level is changed", async ({ page }) => {
  await signIn(page, "dash2@example.com", "dash2", "B1");
  const me = await (await page.request.get("/api/me")).json();
  expect(me.prefs.it).toMatchObject({ level: "B1", path: "chunks" });
  await expect(page.locator(".qa-dash-testout")).toContainText("A1");
  await page.locator(".qa-dash-testout-go").click();
  await expect(page.locator(".qa-testout-popup .qa-testout-go")).toHaveAttribute("href", "/it/type/test/A1");
  await page.locator(".qa-testout-popup .qa-popup-close").click();

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

test("dismissing an activity's help is saved per course, so a new course shows it again", async ({ page }) => {
  await signIn(page, "dash6@example.com");
  await setLearning(page, ["it", "nl"]);
  await page.goto("/it/type");
  await expect(page.locator(".qa-help")).toBeVisible();
  await page.locator(".qa-help-close").click();
  await expect(page.locator(".qa-help")).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await page.goto("/it/type");
  await expect(page.locator(".qa-activity-title")).toBeVisible();
  await expect(page.locator(".qa-help")).toHaveCount(0);
  const me = await (await page.request.get("/api/me")).json();
  expect(me.prefs.it.helpSeen).toEqual(["type"]);
  expect(me.prefs.nl.helpSeen).toEqual([]);

  await page.goto("/nl/type");
  await expect(page.locator(".qa-help")).toBeVisible();
});

test("a course in another alphabet adds a keyboard tip to the typing help, with steps for each device in a popup", async ({ page }) => {
  await signIn(page, "dash7@example.com");
  await setLearning(page, ["it", "el"]);
  await page.goto("/it/type");
  await expect(page.locator(".qa-help li")).toHaveCount(4);
  await expect(page.locator(".qa-keyboard-help")).toHaveCount(0);

  await page.goto("/el/type");
  await expect(page.locator(".qa-help li")).toHaveCount(5);
  await expect(page.locator(".qa-keyboard-help")).toContainText("Different alphabet?");
  await expect(page.locator(".qa-keyboard-help")).toContainText("keyboard viewer");
  await page.locator(".qa-keyboard-help-open").click();
  await expect(page.locator(".qa-keyboard-popup")).toBeVisible();
  for (const device of ["ios", "android", "mac", "windows"]) await expect(page.locator(`.qa-keyboard-${device}`)).toContainText("Greek");
  // The computer's own steps lead, in a border, and the computers come before the phones.
  await expect(page.locator(".qa-keyboard-step").first()).toHaveClass(/qa-keyboard-yours/);
  await expect(page.locator(".qa-keyboard-step").first()).toHaveClass(/qa-keyboard-(mac|windows)/);
  await expect(page.locator(".qa-keyboard-step").nth(2)).toHaveClass(/qa-keyboard-ios/);
  await expect(page.locator(".qa-keyboard-step").nth(3)).toHaveClass(/qa-keyboard-android/);
  await page.locator(".qa-keyboard-popup-close").click();
  await expect(page.locator(".qa-keyboard-popup")).toBeHidden();

  // Every popup has an X in its corner, which doesn't take focus on open.
  await page.locator(".qa-keyboard-help-open").click();
  await expect(page.locator(".qa-keyboard-popup")).toBeVisible();
  await expect(page.locator(".qa-keyboard-popup")).toBeFocused();
  await expect(page.locator(".qa-keyboard-popup .qa-popup-close")).not.toBeFocused();
  await page.locator(".qa-keyboard-popup .qa-popup-close").click();
  await expect(page.locator(".qa-keyboard-popup")).toBeHidden();
});

test("a popup taller than the screen opens scrolled to its top, even when the page behind it is scrolled", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 320 });
  await signIn(page, "dash9@example.com");
  await setLearning(page, ["it", "el"]);
  await page.goto("/el/type");
  await page.locator(".qa-keyboard-help-open").scrollIntoViewIfNeeded();
  await page.locator(".qa-keyboard-help-open").click();
  await expect(page.locator(".qa-keyboard-popup")).toBeVisible();
  expect(await page.locator(".qa-keyboard-popup").evaluate((d) => d.scrollHeight > d.clientHeight)).toBe(true);
  expect(await page.locator(".qa-keyboard-popup").evaluate((d) => d.scrollTop)).toBe(0);
  await page.locator(".qa-keyboard-popup-close").click();
  await page.locator(".qa-keyboard-help-open").click();
  expect(await page.locator(".qa-keyboard-popup").evaluate((d) => d.scrollTop)).toBe(0);
});

test.describe("on a phone", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });

  test("the keyboard tip says to switch keyboards in settings, and the iPhone steps come first", async ({ page }) => {
    await signIn(page, "dash8@example.com");
    await setLearning(page, ["it", "el"]);
    await page.goto("/el/type");
    await expect(page.locator(".qa-keyboard-help")).toContainText("in your phone's settings");
    await expect(page.locator(".qa-keyboard-help")).not.toContainText("keyboard viewer");
    await page.locator(".qa-keyboard-help-open").click();
    await expect(page.locator(".qa-keyboard-step")).toHaveCount(4);
    await expect(page.locator(".qa-keyboard-step").first()).toHaveClass(/qa-keyboard-ios qa-keyboard-yours/);
    await expect(page.locator(".qa-keyboard-yours")).toHaveCount(1);
    await expect(page.locator(".qa-keyboard-step").nth(1)).toHaveClass(/qa-keyboard-android/);
    await expect(page.locator(".qa-keyboard-step").nth(2)).toHaveClass(/qa-keyboard-mac/);
  });
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
