import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

test("the About page shows usage tips in two columns, then the credits with links to GitHub and ABAIR", async ({ page }) => {
  await signIn(page, "about@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-about").click();
  await expect(page).toHaveURL(/\/about$/);

  await expect(page.locator(".qa-about-tips")).toHaveCount(2);
  await expect(page.locator(".qa-about-tips li")).toHaveCount(13);
  await expect(page.locator(".qa-about-made-by")).toHaveText("Made with 💙 by Topher Hunt");
  await expect(page.locator(".qa-about-github")).toHaveAttribute("href", "https://github.com/topherhunt/ditto");
  await expect(page.locator(".qa-about-abair a")).toHaveAttribute("href", "https://abair.ie");
});
