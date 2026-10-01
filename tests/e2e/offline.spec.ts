import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("a failed notifications poll leaves the navbar and page in place", async ({ page }) => {
  await signIn(page, "offline-poll@example.com");
  await page.route("**/api/notifications", (route) => route.abort("internetdisconnected"));
  await page.locator(".qa-nav-type").click();
  await expect(page).toHaveURL(/\/type$/);
  await expect(page.locator(".qa-user")).toBeVisible();
  await expect(page.locator(".qa-notifications")).toBeVisible();
  await expect(page.locator(".qa-error")).toHaveCount(0);
});

test("a page load with no connection shows a retry that recovers once the connection is back", async ({ page }) => {
  await signIn(page, "offline-load@example.com");
  await page.route("**/api/me", (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.locator(".qa-error")).toContainText("Can't reach Ditto");
  await expect(page.locator(".qa-error")).not.toContainText("TypeError");

  await page.unroute("**/api/me");
  await page.locator(".qa-error-retry").click();
  await expect(page.locator(".qa-error")).toHaveCount(0);
  await expect(page.locator(".qa-user")).toHaveText("offline-load");
});
