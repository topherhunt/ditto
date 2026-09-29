import { expect, test } from "@playwright/test";
import { signIn } from "./helpers.ts";

// Chromium's fake microphone plays a tone, so recording works headless; the server's scripted coach fails a first try and passes a retry.
test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

async function record(page: import("@playwright/test").Page) {
  await page.locator(".qa-record").click();
  await expect(page.locator(".qa-record")).toHaveClass(/btn-danger/);
  await page.waitForTimeout(300);
  await page.locator(".qa-record").click();
}

test("a learner starts a café conversation, fails a reply, retries the coach's sentence and gets an answer", async ({ page }) => {
  // Logs the source of every audio play() call.
  await page.addInitScript(() => {
    const w = window as unknown as { played: string[] };
    w.played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { w.played.push(this.src); return play.call(this); };
  });
  await signIn(page, "speaker@example.com");
  await page.locator(".qa-nav-speak").click();
  await expect(page).toHaveURL(/\/it\/talk$/);
  await page.locator(".qa-speak-starter-cafe").click();

  await expect(page.locator(".qa-conversation-title")).toHaveText("Al bar");
  // The opening line plays by itself.
  await expect.poll(() => page.evaluate(() => (window as unknown as { played: string[] }).played.at(-1))).toMatch(/\/audio\/[^/]+\.wav$/);
  const opening = page.locator(".qa-turn-partner").first();
  await expect(opening.locator(".qa-chunk")).toHaveText(["Buongiorno!", "Cosa prende?"]);
  await opening.locator(".qa-chunk").first().click();
  await expect(page.locator(".qa-gloss")).toHaveText("Good morning!");
  // Tapping a chunk speaks it.
  expect(decodeURIComponent(await page.evaluate(() => (window as unknown as { played: string[] }).played.at(-1)!))).toMatch(/\/say\?text=Buongiorno!$/);
  await opening.locator(".qa-chunk").nth(1).click();
  await expect(page.locator(".qa-gloss")).toHaveText("What will you have?");
  await page.locator(".qa-conversation-title").click();
  await expect(page.locator(".qa-gloss")).toHaveCount(0);
  await expect(page.locator(".qa-suggestion")).toHaveCount(3);

  // Hold the first reply's response so the checking state can be seen: a spinner and step instead of the record button.
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/attempts", async (route) => {
    await held;
    await route.continue();
  }, { times: 1 });
  await record(page);
  await expect(page.locator(".qa-checking-sending")).toBeVisible();
  await expect(page.locator(".qa-record")).toHaveCount(0);
  release();
  await expect(page.locator(".qa-retry-target")).toHaveText("Vorrei un caffè, per favore.");
  // A failed reply sounds a warning and is introduced in the interface language.
  await expect(page.locator(".qa-retry-good-try")).toHaveText("Good try! Here are some corrections:");
  expect(await page.evaluate(() => (window as unknown as { played: string[] }).played)).toContainEqual(expect.stringMatching(/\/marimba-warning-[\w-]+\.mp3$/));
  await expect(page.locator(".qa-checking")).toHaveCount(0);
  await expect(page.locator(".qa-retry-play-target")).toBeVisible();
  await expect(page.locator(".qa-retry-heard")).toContainText("Vorrei un caffè");
  await expect(page.locator(".qa-retry-fix")).toContainText("per favore");
  await expect(page.locator(".qa-retry-play-own")).toBeVisible();
  await expect(page.locator(".qa-move-on")).toHaveCount(0);

  await page.locator(".qa-retry-report-open").click();
  await page.locator(".qa-retry-report-note").fill("I held the f");
  await page.locator(".qa-retry-report-send").click();
  await expect(page.locator(".qa-retry-reported")).toBeVisible();

  // Space records and stops, even with a play button focused from a tap.
  await page.locator(".qa-retry-play-target").click();
  const plays = () => page.evaluate(() => (window as unknown as { played: string[] }).played.length);
  const before = await plays();
  await page.keyboard.press(" ");
  await expect(page.locator(".qa-record")).toHaveClass(/btn-danger/);
  expect(await plays()).toBe(before);
  await page.waitForTimeout(300);
  await page.keyboard.press(" ");
  await expect(page.locator(".qa-turn-learner .qa-chunk")).toHaveText(["Vorrei", "un", "caffè,", "per", "favore."]);
  expect(await page.evaluate(() => (window as unknown as { played: string[] }).played)).toContainEqual(expect.stringMatching(/\/correct-[\w-]+\.mp3$/));
  await page.locator(".qa-turn-learner .qa-chunk").first().click();
  await expect(page.locator(".qa-gloss")).toHaveText("(Vorrei)");
  await expect(page.locator(".qa-turn-learner .qa-turn-level")).toHaveText("A2");
  await expect(page.locator(".qa-turn-partner").nth(1).locator(".qa-chunk")).toHaveText(["Certo!", "Altro?"]);
  await expect(page.locator(".qa-retry")).toHaveCount(0);
  await expect(page.locator(".qa-replies")).toContainText("1");
  await expect(page.locator(".qa-hints")).toContainText("1");

  await page.locator(".qa-conversation-hard").check();
  await expect(page.locator(".qa-suggestion")).toHaveCount(0);
  await expect(page.locator(".qa-how-open")).toBeVisible();

  await page.goto("/it/talk");
  await expect(page.locator(".qa-speak-history")).toContainText("Al bar");
});

test("a playing line's play button turns into a stop button that stops it", async ({ page }) => {
  // 30 s of silence instead of the fake 0.1 s line, so it is still playing when the test looks.
  const rate = 8000, data = 30 * rate * 2;
  const wav = Buffer.alloc(44 + data);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + data, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(data, 40);
  await page.route("**/audio/*.wav", (route) => route.fulfill({ contentType: "audio/wav", body: wav }));
  await signIn(page, "stopper@example.com");
  await page.goto("/it/talk");
  await page.locator(".qa-speak-starter-cafe").click();

  // The opening line autoplays, so its button starts as a stop button.
  const button = page.locator(".qa-turn-play").first();
  await expect(button).toHaveText("■");
  await expect(button).toHaveClass(/btn-outline-orange/);
  await button.click();
  await expect(button).toHaveText("▶");
  await expect(button).toHaveClass(/btn-outline-primary/);
  await button.click();
  await expect(button).toHaveText("■");
});

test("an admin sees reported judgments and spend", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await page.goto("/it/talk");
  await page.locator(".qa-speak-starter-cafe").click();
  await record(page);
  await page.locator(".qa-retry-report-open").click();
  await page.locator(".qa-retry-report-note").fill("admin's own report");
  await page.locator(".qa-retry-report-send").click();
  await expect(page.locator(".qa-retry-reported")).toBeVisible();

  await page.locator(".qa-user").click();
  await page.locator(".qa-nav-speaking").click();
  const report = page.locator(".qa-admin-speak-report").filter({ hasText: "admin's own report" });
  await expect(report).toContainText("Buongiorno! Cosa prende?");
  await expect(report).toContainText("Vorrei un caffè");
  // Opening line and its gloss, transcription and coach, at the fake's $0.001 each.
  await expect(page.locator(".qa-admin-spend-user").filter({ hasText: "admin" })).toContainText("$0.004");
});
