import { expect, test, type Page } from "@playwright/test";
import { signIn, signOut } from "./helpers.ts";


async function openFriends(page: Page) {
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-friends").click();
  await expect(page).toHaveURL(/\/friends$/);
}

/** Reveals every remaining item of the open lesson, then waits for the done screen. */
async function finishLesson(page: Page) {
  await expect(page.locator(".qa-exercise")).toBeVisible();
  while (await page.locator(".qa-exercise").count()) {
    await page.locator(".qa-reveal").click();
    await page.locator(".qa-meaning-option").first().click();
    await page.locator(".qa-next").click();
  }
  await expect(page.locator(".qa-session-done .qa-tada")).toBeVisible();
}

test("befriend through the bell, see a friend's profile, play their locked lesson and compare", async ({ page }) => {
  const ana = "learner9@example.com";
  const bo = "learner10@example.com";

  // Ana finishes the first lesson and starts the second, which stays locked for Bo.
  await signIn(page, ana);
  await page.goto("/it/lesson/it-a1-bar-1");
  await finishLesson(page);
  await page.goto("/it/lesson/it-a1-bar-2");
  await page.locator(".qa-reveal").click();
  await page.locator(".qa-meaning-option").first().click();
  await expect(page.locator(".qa-next")).toBeVisible();
  await signOut(page);

  await signIn(page, bo);
  await expect(page.locator(".qa-lesson-friend")).toHaveCount(0);
  await openFriends(page);
  await page.locator(".qa-friend-email").fill("nobody@example.com");
  await page.locator(".qa-friend-search").click();
  await expect(page.locator(".qa-friend-result")).toContainText("No account");
  await page.locator(".qa-friend-email").fill(ana);
  await page.locator(".qa-friend-search").click();
  await page.locator(".qa-friend-add").click();
  await expect(page.locator(".qa-friend-result")).toContainText("sent");
  await expect(page.locator(".qa-outgoing")).toContainText(ana.split("@")[0]);
  await signOut(page);

  await signIn(page, ana);
  await expect(page.locator(".qa-notifications-count")).toHaveText("1");
  await page.locator(".qa-notifications").click();
  await expect(page.locator(".qa-notifications-count")).toHaveCount(0);
  await page.locator(".qa-notification").filter({ hasText: "wants to be friends" }).click();
  await expect(page).toHaveURL(/\/friends$/);
  await page.locator(".qa-incoming .qa-accept").click();
  await expect(page.locator(".qa-friend")).toHaveCount(1);
  await expect(page.locator(".qa-incoming")).toHaveCount(0);
  await signOut(page);

  // Bo follows the acceptance to Ana's profile.
  await signIn(page, bo);
  await page.locator(".qa-notifications").click();
  await page.locator(".qa-notification").filter({ hasText: "accepted your friend request" }).click();
  await expect(page).toHaveURL(/\/people\/\d+$/);
  await expect(page.locator(".qa-activity")).toContainText("Last completed a lesson");
  await expect(page.locator(".qa-level")).toContainText("Module 1 of");
  await expect(page.locator(".qa-graph")).toBeVisible();
  await expect(page.locator(".qa-recent")).toHaveCount(2);

  // Ana's second lesson is now playable for Bo from the lesson list, and the done screen compares them.
  await page.goto("/it");
  await expect(page.locator(".qa-lesson-friend")).toHaveCount(1);
  await page.locator(".qa-lesson-friend").click();
  await expect(page).toHaveURL(/\/it\/lesson\/it-a1-bar-2$/);
  await finishLesson(page);
  await expect(page.locator(".qa-compare-row")).toHaveCount(2);
});

test("a race invite shows in the bell and starts once accepted", async ({ page }) => {
  const cy = "learner11@example.com";
  const di = "learner12@example.com";
  await signIn(page, di);
  await signOut(page);
  await signIn(page, cy);
  expect((await page.request.post("/api/friends/requests", { data: { email: di } })).ok()).toBe(true);
  await signOut(page);
  await signIn(page, di);
  expect((await page.request.post("/api/friends/requests", { data: { email: cy } })).ok()).toBe(true);

  await openFriends(page);
  await page.locator(".qa-friend .qa-race-open").click();
  await page.locator(".qa-race-kind").selectOption("first_to");
  await expect(page.locator(".qa-race-target")).toHaveValue("20");
  await page.locator(".qa-race-send").click();
  await expect(page.locator(".qa-race .qa-race-status")).toContainText("Waiting for");
  await expect(page.locator(".qa-race-cancel")).toBeVisible();
  await expect(page.locator(".qa-race-open")).toHaveCount(0);
  await signOut(page);

  await signIn(page, cy);
  await page.locator(".qa-notifications").click();
  await page.locator(".qa-notification").filter({ hasText: "challenged you to a race: first to 20 lessons" }).click();
  await expect(page).toHaveURL(/\/friends$/);
  await page.locator(".qa-race-accept").click();
  await expect(page.locator(".qa-race .qa-race-status")).toContainText("0 to 0");
  await expect(page.locator(".qa-race .qa-race-status")).toContainText("30 days left");

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-leaderboard").click();
  await page.locator(".qa-board-scope-friends").click();
  await expect(page.locator(".qa-leader")).toHaveCount(2);
});

test("a new account picks a username, finds a stranger on the leaderboard, sees only their counts, asks to be friends, and renames itself", async ({ page }) => {
  const stranger = "learner13@example.com";
  await signIn(page, stranger);
  await page.goto("/it/lesson/it-a1-bar-1");
  await finishLesson(page);
  await signOut(page);

  await page.locator(".qa-dev-email").fill("learner14@example.com");
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-choose-username")).toBeVisible();
  await expect(page.locator(".qa-user")).toHaveCount(0);
  await page.locator(".qa-username").fill("LEARNER13");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-username-error")).toBeVisible();
  await page.locator(".qa-username").fill("wren");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-user")).toHaveText("wren");

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-leaderboard").click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  const row = page.locator(".qa-leader").filter({ hasText: "learner13" });
  await expect(row.locator(".qa-leader-lessons")).toHaveText("1 lesson");
  await row.locator(".qa-leader-link").click();
  await expect(page).toHaveURL(/\/people\/\d+$/);
  await expect(page.locator(".qa-profile-name")).toHaveText("learner13");
  await expect(page.locator(".qa-profile-lessons-week")).toHaveText("1");
  await expect(page.locator(".qa-profile-private")).toBeVisible();
  await expect(page.locator(".qa-profile-language")).toHaveCount(0);
  await expect(page.locator(".qa-accuracy")).toHaveCount(0);
  await page.locator(".qa-profile-befriend").click();
  await expect(page.locator(".qa-profile-sent")).toBeVisible();

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-settings").click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator(".qa-username")).toHaveValue("wren");
  await page.locator(".qa-username").fill("wren.b");
  await page.locator(".qa-username-save").click();
  await expect(page.locator(".qa-settings-general .qa-settings-status")).toHaveText("Saved");
  await expect(page.locator(".qa-user")).toHaveText("wren.b");
});
