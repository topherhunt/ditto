import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

// Chromium's fake microphone plays a tone, so recording works headless without a permission prompt.
test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

test("an admin records a correct and a mispronounced take with a note, then deletes one", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-admin").click();
  await page.locator(".qa-nav-poc").click();
  const sentence = page.locator(".qa-poc-it-anno");

  await sentence.locator(".qa-poc-record-correct").click();
  await expect(sentence.locator(".qa-poc-record-correct")).toHaveClass(/btn-danger/);
  await page.waitForTimeout(300);
  await sentence.locator(".qa-poc-record-correct").click();
  await expect(sentence.locator(".qa-poc-take")).toHaveCount(1);
  await expect(page.locator(".qa-poc-progress")).toContainText("1 / 10");

  await sentence.locator(".qa-poc-record-wrong").click();
  await expect(sentence.locator(".qa-poc-record-wrong")).toHaveClass(/btn-danger/);
  await page.waitForTimeout(300);
  await sentence.locator(".qa-poc-record-wrong").click();
  await expect(sentence.locator(".qa-poc-note")).toHaveCount(1);
  await sentence.locator(".qa-poc-note").fill("ano for anno");
  await sentence.locator(".qa-poc-note").blur();
  await expect.poll(async () => (await page.request.get("/api/admin/poc")).json().then((d) => d.takes.map((t: { note: string }) => t.note))).toEqual(["", "ano for anno"]);

  await page.reload();
  await expect(sentence.locator(".qa-poc-note")).toHaveValue("ano for anno");
  await sentence.locator(".qa-poc-take").filter({ has: page.locator(".qa-poc-note") }).locator(".qa-poc-delete").click();
  await expect(sentence.locator(".qa-poc-take")).toHaveCount(1);
});
