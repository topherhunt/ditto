import { expect, test as base } from "@playwright/test";

export { devices, expect } from "@playwright/test";
export type { Page } from "@playwright/test";

type ReportNotFound = (url: string) => void;

/**
 * Playwright's `test` plus an automatic guard: any test that lands on the "Page not found" route, or throws an uncaught page
 * error, fails at the end, whatever it was checking. A link to a route that doesn't exist can't pass quietly.
 */
export const test = base.extend<{ routeGuard: void }>({
  routeGuard: [async ({ page }, use) => {
    const problems: string[] = [];
    await page.exposeFunction("__reportNotFound", ((url) => problems.push(`landed on "Page not found" at ${url}`)) satisfies ReportNotFound);
    await page.addInitScript(() => {
      const report = (window as unknown as { __reportNotFound: ReportNotFound }).__reportNotFound;
      new MutationObserver(() => {
        if (document.querySelector(".qa-not-found")) report(location.pathname + location.search);
      }).observe(document, { childList: true, subtree: true });
    });
    page.on("pageerror", (e) => problems.push(`uncaught page error: ${e.message}`));
    await use();
    expect([...new Set(problems)]).toEqual([]);
  }, { auto: true }],
});
