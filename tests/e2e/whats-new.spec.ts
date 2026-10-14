import { DatabaseSync } from "node:sqlite";
import { WHATS_NEW, WHATS_NEW_COUNT } from "../../shared/whats-new.ts";
import { expect, test } from "./fixtures.ts";
import { signIn } from "./helpers.ts";

test("the account menu badges What's new items added since the learner last looked, and opening the page clears the badge", async ({ page }) => {
  await signIn(page, "whatsnew@example.com");
  await expect(page.locator(".qa-user-unseen")).toHaveCount(0);

  // A new learner has seen everything, so mark two items unseen as if they shipped since.
  const db = new DatabaseSync("test-results/e2e-db/app.db");
  db.prepare("UPDATE users SET misc = json_set(misc, '$.whatsNewSeen', ?) WHERE email = ?").run(WHATS_NEW_COUNT - 2, "whatsnew@example.com");
  db.close();
  await page.reload();
  await expect(page.locator(".qa-user-unseen")).toBeVisible();
  await page.locator(".qa-user").click();
  await expect(page.locator(".qa-whats-new-count")).toHaveText("2");

  await page.locator(".qa-nav-whats-new").click();
  await expect(page).toHaveURL(/\/whats-new$/);
  await expect(page.locator(".qa-whats-new-day")).toHaveCount(WHATS_NEW.length);
  await expect(page.locator(".qa-whats-new-item")).toHaveCount(WHATS_NEW_COUNT);
  await expect(page.locator(".qa-whats-new-item").first()).toHaveText(WHATS_NEW[0].items[0].en);
  await expect(page.locator(".qa-user-unseen")).toHaveCount(0);

  await page.reload();
  await expect(page.locator(".qa-whats-new-item").first()).toBeVisible();
  await page.locator(".qa-user").click();
  await expect(page.locator(".qa-nav-whats-new")).toBeVisible();
  await expect(page.locator(".qa-whats-new-count")).toHaveCount(0);
});
