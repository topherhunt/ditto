import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers.ts";

// playwright.config.ts makes admin@example.com the admin.
test("an admin finds a user, opens their details and their public profile; non-admins can't reach the page", async ({ page }) => {
  await signIn(page, "watched@example.com");
  await expect((await page.request.post("/api/reports", { data: { unitId: "it-a1-bar-1-u01", rev: 1, voice: 0, kind: "text", note: "e2e-admin-users" } })).status()).toBe(200);
  await page.locator(".qa-user").click();
  await expect(page.locator(".qa-nav-admin")).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page.locator(".alert-danger")).toContainText("Admins only");
  await page.goto("/");
  await signOut(page);

  await signIn(page, "admin@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-admin").click();
  await page.locator(".qa-nav-users").click();
  await expect(page.locator(".qa-admin-users-summary")).toBeVisible();
  await page.locator(".qa-admin-users-search").fill("watched@");
  await expect(page.locator(".qa-admin-user")).toHaveCount(1);
  await page.locator(".qa-admin-users-flag").selectOption("reports");
  await expect(page.locator(".qa-admin-user")).toHaveCount(1);
  await page.locator(".qa-admin-users-flag").selectOption("blocked");
  await expect(page.locator(".qa-admin-user")).toHaveCount(0);
  await page.locator(".qa-admin-users-flag").selectOption("all");

  await page.locator(".qa-admin-user-link").click();
  await expect(page.locator(".qa-admin-user-name")).toHaveText("watched");
  await expect(page.locator(".qa-admin-user-email")).toHaveText("watched@example.com");
  await expect(page.locator(".qa-admin-user-report")).toContainText("e2e-admin-users");

  // Back keeps the search in the query string.
  await page.goBack();
  await expect(page.locator(".qa-admin-users-search")).toHaveValue("watched@");
  await page.goForward();
  await page.locator(".qa-admin-crumb-home").click();
  await expect(page.locator(".qa-nav-users")).toBeVisible();
  await page.goBack();
  await page.locator(".qa-admin-user-profile").click();
  await expect(page.locator(".qa-profile-name")).toHaveText("watched");
});
