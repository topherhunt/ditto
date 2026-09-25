import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.locator(".qa-dev-email").fill(email);
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-user")).toHaveText(email);
}

async function signOut(page: Page) {
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await expect(page.locator(".qa-dev-email")).toBeVisible();
}

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
  await expect(page.locator(".qa-leader")).toHaveCount(2);
});
