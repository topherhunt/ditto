import { expect, type ConsoleMessage, type Page, type Response } from "@playwright/test";
import type { SampleIds } from "../route-samples.ts";

/**
 * Dev-logs in from the homepage, learning Italian, and lands on its dashboard. A new account answers the setup screen
 * with `level` and `username` (the email's local part by default).
 */
export async function signIn(page: Page, email: string, username = email.split("@")[0], level = "A2") {
  await page.goto("/");
  await page.locator(".qa-learn-it").click();
  await page.locator(".qa-dev-email").fill(email);
  await page.locator(".qa-dev-submit").click();
  await expect(page.locator(".qa-user, .qa-choose-username")).toBeVisible();
  if (await page.locator(".qa-choose-username").isVisible()) {
    await page.locator(`.qa-level-${level}`).click();
    await page.locator(".qa-username").fill(username);
    await page.locator(".qa-username-save").click();
  }
  await expect(page.locator(".qa-user")).toHaveText(username);
}

/** Opens a course's typing catalog and expands its collapsed practice settings panel. */
export async function openPracticeSettings(page: Page, lang: string) {
  await page.goto(`/${lang}/type`);
  await page.locator(".qa-prefs-toggle").click();
  await expect(page.locator(".qa-prefs-form")).toBeVisible();
}

/** Sets the signed-in learner's courses, as the Settings switches do, and reloads so the nav picks them up. */
export async function setLearning(page: Page, languages: string[]) {
  expect((await page.request.put("/api/learning", { data: { languages } })).ok()).toBe(true);
  await page.reload();
}

export async function signOut(page: Page) {
  await page.locator(".qa-user").click();
  await page.locator(".qa-logout").click();
  await expect(page.locator(".qa-dev-email")).toBeVisible();
}

/** Creates, as the signed-in operator, the records some routes need an ID for: a conversation, a quiz session and a user row. */
export async function createSampleIds(page: Page): Promise<SampleIds> {
  const post = async (url: string, data: object) => {
    const res = await page.request.post(url, { data });
    expect(res.ok(), `${url}: ${res.status()}`).toBe(true);
    return res.json();
  };
  const conversation = await post("/api/conversations", { language: "it", level: "A2", scenario: { starter: "cafe" }, hardMode: false });
  const quizSession = await post("/api/quiz/decks/it-a1-grammar-1/sessions", { mode: "spaced" });
  // A session's summary page only exists once it has an answer.
  await post(`/api/quiz/sessions/${quizSession.sessionId}/answers`, { questionId: quizSession.queue[0], rating: "good", responseMs: 1000 });
  const users = await (await page.request.get("/api/admin/users")).json();
  return { conversationId: String(conversation.id), quizSessionId: String(quizSession.sessionId), userId: users[0].id };
}

/** Master refuses to open until its lesson has been finished once; that error page still proves the route matched. */
const EXPECTED_ERRORS: [path: RegExp, message: RegExp][] = [[/\/lesson\/[^/]+\/master$/, /once before you try Master/]];

/**
 * Opens `url` and fails if it lands on "Page not found", on an error page the app doesn't deliberately show there, or, when
 * `marker` is given, if the page never renders it. A spinner that never goes away, a failed `/api` call or a console error
 * during the visit fails it too.
 */
export async function expectPageOpens(page: Page, url: string, marker?: string) {
  const problems: string[] = [];
  const onResponse = (res: Response) => {
    if (res.url().includes("/api/") && res.status() >= 400) problems.push(`${res.request().method()} ${new URL(res.url()).pathname} -> ${res.status()}`);
  };
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) problems.push(`console.error: ${msg.text()}`);
  };
  page.on("response", onResponse);
  page.on("console", onConsole);
  try {
    await page.goto(url);
    await expect(page.locator(".qa-user, .qa-error").first()).toBeVisible();
    await expect(page.locator(".qa-not-found")).toHaveCount(0);
    await expect(page.locator(".qa-loading"), `${url} is still loading`).toHaveCount(0);
    if (await page.locator(".qa-error").count() > 0) {
      const expected = EXPECTED_ERRORS.find(([path]) => path.test(new URL(url, "http://x").pathname));
      expect(expected, `${url} shows an error page`).toBeDefined();
      await expect(page.locator(".qa-error")).toContainText(expected![1]);
    } else if (marker) {
      await expect(page.locator(marker).first(), `${url} never rendered its content (${marker})`).toBeVisible();
    }
  } finally {
    page.off("response", onResponse);
    page.off("console", onConsole);
  }
  expect(problems, `${url} had failing requests or console errors`).toEqual([]);
}

/** One audio play: the URL its audio was fetched from (or its own src, such as a recording's blob URL), volume, rate, and whether it played from memory (a blob URL or a decoded buffer). */
export type Played = { src: string; volume: number; rate: number; fromMemory: boolean };

/**
 * Logs every audio play to `window.played`, from audio elements and Web Audio alike. Clips play from blob URLs and decoded
 * buffers, so each is traced back to the URL whose response it was made from.
 */
export async function recordPlays(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { played: Played[]; decoded: number };
    w.played = [];
    w.decoded = 0;
    const origin = new WeakMap<object, string>();
    const blobUrls = new Map<string, string>();
    const { blob, arrayBuffer } = Response.prototype;
    Response.prototype.blob = async function () { const b = await blob.call(this); origin.set(b, this.url); return b; };
    Response.prototype.arrayBuffer = async function () { const b = await arrayBuffer.call(this); origin.set(b, this.url); return b; };
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = (o) => { const u = createObjectURL(o); if (origin.has(o)) blobUrls.set(u, origin.get(o)!); return u; };
    const decode = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = async function (b: ArrayBuffer) { const d = await decode.call(this, b); origin.set(d, origin.get(b)!); w.decoded++; return d; };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      w.played.push({ src: blobUrls.get(this.src) ?? this.src, volume: this.volume, rate: this.playbackRate, fromMemory: this.src.startsWith("blob:") });
      return play.call(this);
    };
    const volumes = new WeakMap<AudioNode, number>();
    const connect = AudioNode.prototype.connect as (this: AudioNode, d: AudioNode) => AudioNode;
    AudioNode.prototype.connect = function (this: AudioNode, d: AudioNode) { if (d instanceof GainNode) volumes.set(this, d.gain.value); return connect.call(this, d); } as typeof AudioNode.prototype.connect;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      w.played.push({ src: origin.get(this.buffer!)!, volume: volumes.get(this)!, rate: this.playbackRate.value, fromMemory: true });
      return start.apply(this, args);
    };
  });
}

/** Waits for the page's six UI sounds to decode: one played sooner is skipped. */
export const soundsReady = (page: Page) => page.waitForFunction(() => (window as unknown as { decoded: number }).decoded >= 6);
