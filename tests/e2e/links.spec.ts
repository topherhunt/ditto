import { routes } from "../../web/src/routes.ts";
import { ROUTE_SAMPLES } from "../route-samples.ts";
import { expect, test, type Page } from "./fixtures.ts";
import { createSampleIds, expectPageOpens, signIn } from "./helpers.ts";

/** One link: open `from`, click the element matching `qa` (after opening the account menu if `menu`), expect to land on `to`. */
type Link = { qa: string; to: string; menu?: boolean };

async function clickEachLink(page: Page, from: string, links: Link[]) {
  for (const { qa, to, menu } of links) {
    await test.step(`${from} -> ${qa}`, async () => {
      await page.goto(from);
      if (menu) await page.locator(".qa-user").click();
      await page.locator(qa).first().click();
      await expect(page).toHaveURL(to);
      await expect(page.locator(".qa-not-found")).toHaveCount(0);
    });
  }
}

const dashboard = routes.dashboard({ lang: "it" });

test("the nav bar, account menu and footer links open the pages they name", async ({ page }) => {
  await signIn(page, "links1@example.com");
  await clickEachLink(page, dashboard, [
    { qa: ".qa-nav-home", to: dashboard },
    { qa: ".qa-nav-type", to: routes.type({ lang: "it" }) },
    { qa: ".qa-nav-speak", to: routes.talk({ lang: "it" }) },
    { qa: ".qa-nav-quiz", to: routes.quiz({ lang: "it" }) },
    { qa: ".qa-nav-profile", to: routes.person({ id: "me" }), menu: true },
    { qa: ".qa-nav-friends", to: routes.friends(), menu: true },
    { qa: ".qa-nav-leaderboard", to: routes.leaderboard(), menu: true },
    { qa: ".qa-nav-settings", to: routes.settings(), menu: true },
    { qa: ".qa-nav-about", to: routes.about(), menu: true },
    { qa: ".qa-footer-home", to: routes.welcome() },
    { qa: ".qa-footer-about", to: routes.about() },
    { qa: ".qa-footer-privacy", to: routes.privacy() },
    { qa: ".qa-footer-terms", to: routes.terms() },
    { qa: ".qa-feedback-link", to: routes.feedback({ from: dashboard }) },
  ]);
});

test("the dashboard's buttons and cards open the pages they name", async ({ page }) => {
  await signIn(page, "links2@example.com");
  await clickEachLink(page, dashboard, [
    { qa: ".qa-dash-friends", to: routes.friends() },
    { qa: ".qa-dash-leaderboard", to: routes.leaderboard() },
    { qa: ".qa-dash-settings", to: routes.settings() },
    { qa: ".qa-dash-about-go", to: routes.about() },
    { qa: ".qa-dash-feedback-go", to: routes.feedback({ from: dashboard }) },
    { qa: ".qa-dash-start-type", to: routes.type({ lang: "it" }) },
    { qa: ".qa-dash-start-talk", to: routes.talk({ lang: "it" }) },
    { qa: ".qa-dash-start-quiz", to: routes.quiz({ lang: "it" }) },
    { qa: ".qa-dash-coach-go", to: routes.typeLesson({ lang: "it", lessonId: "it-a1-bar-1" }) },
  ]);
});

test("the typing catalog and a lesson link to lessons, level tests and back", async ({ page }) => {
  await signIn(page, "links3@example.com");
  const lesson = routes.typeLesson({ lang: "it", lessonId: "it-a1-bar-1" });
  await clickEachLink(page, routes.type({ lang: "it" }), [
    { qa: ".qa-next-lesson", to: lesson },
    { qa: ".qa-lesson-start", to: lesson },
  ]);
  await page.goto(routes.type({ lang: "it" }));
  await page.locator(".qa-level-test").first().click();
  await page.locator(".qa-testout-go").click();
  await expect(page).toHaveURL(routes.typeTest({ lang: "it", level: "A1" }));
  await clickEachLink(page, lesson, [{ qa: ".qa-lesson-back", to: routes.type({ lang: "it" }) }]);
});

test("the quiz pages link from the deck list to a deck, its modes, browse and stats, and back", async ({ page }) => {
  await signIn(page, "links4@example.com");
  const deck = { lang: "it", deckId: "it-a1-grammar-1" };
  await clickEachLink(page, routes.quiz({ lang: "it" }), [{ qa: ".qa-quiz-deck-it-a1-grammar-1", to: routes.quizDeck(deck) }]);
  await clickEachLink(page, routes.quizDeck(deck), [
    { qa: ".qa-quiz-mode-spaced", to: routes.quizStudy({ ...deck, mode: "spaced" }) },
    { qa: ".qa-quiz-mode-random", to: routes.quizStudy({ ...deck, mode: "random" }) },
    { qa: ".qa-quiz-browse", to: routes.quizBrowse(deck) },
    { qa: ".qa-quiz-stats-link", to: routes.quizStats(deck) },
    { qa: ".qa-quiz-back", to: routes.quiz({ lang: "it" }) },
  ]);
  await clickEachLink(page, routes.quizBrowse(deck), [{ qa: ".qa-quiz-back", to: routes.quizDeck(deck) }]);
});

test("the operator index links to every admin page", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await clickEachLink(page, routes.admin(), [
    { qa: ".qa-nav-users", to: routes.adminUsers() },
    { qa: ".qa-nav-metrics", to: routes.adminMetrics() },
    { qa: ".qa-nav-reports", to: routes.adminReports() },
    { qa: ".qa-nav-user-reports", to: routes.adminUserReports() },
    { qa: ".qa-nav-feedback", to: routes.adminFeedback() },
    { qa: ".qa-nav-poc", to: routes.adminPronunciation() },
    { qa: ".qa-nav-speaking", to: routes.adminSpeaking() },
  ]);
  await clickEachLink(page, routes.admin(), [{ qa: ".qa-nav-admin", to: routes.admin(), menu: true }]);
});

test("every internal link on every page opens a page instead of 'Page not found'", async ({ page }) => {
  await signIn(page, "operator2@example.com");
  const ids = await createSampleIds(page);
  const linkedFrom = new Map<string, string>();
  for (const sample of Object.values(ROUTE_SAMPLES)) {
    const from = sample(ids);
    await expectPageOpens(page, from);
    for (const href of await page.locator("a[href^='/']:visible").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      if (!linkedFrom.has(href)) linkedFrom.set(href, from);
    }
  }
  const internal = [...linkedFrom.keys()].filter((h) => !h.startsWith("/api/"));
  expect(internal.length, "the crawl should find links").toBeGreaterThan(40);
  for (const href of internal) {
    await test.step(`${href} (linked from ${linkedFrom.get(href)})`, () => expectPageOpens(page, href));
  }
});
