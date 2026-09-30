import { describe, expect, it } from "vitest";
import { MASTER_WAIT_MS } from "../../shared/api.ts";
import { setup } from "./helpers.ts";

const SENTENCES = ["it-a1-bar-1-u06", "it-a1-bar-1-u08", "it-a1-bar-1-u10"];
const ALL = Array.from({ length: 10 }, (_, i) => `it-a1-bar-1-u${String(i + 1).padStart(2, "0")}`);
type Over = Parameters<ReturnType<typeof setup>["attempt"]>[1];

/** Answers every item of the lesson's full path (or, for a Master or sentences-path run, its sentences) and returns the last response. */
async function finish(t: ReturnType<typeof setup>, over: Over = {}) {
  let last;
  const sentencesOnly = over?.master || over?.path === "sentences";
  for (const u of sentencesOnly ? SENTENCES : ALL) last = await t.attempt(u, { path: sentencesOnly ? "sentences" : "full", ...over });
  return last!;
}

const stars = async (t: ReturnType<typeof setup>) => (await t.req("GET", "/api/catalog?lang=it")).json.stars["it-a1-bar-1"];

describe("lesson stars", () => {
  it("reports the earned and best stars when the last item finishes the run", async () => {
    const t = setup();
    await t.login();
    const res = await finish(t, { hintsLevel: "none" });
    expect(res.json).toEqual({ ok: true, stars: { earned: 3, best: 3 } });
    expect(await stars(t)).toEqual({ stars: 3, practicedAt: t.clock.now.toISOString() });
  });

  it("reports no stars while the run is unfinished", async () => {
    const t = setup();
    await t.login();
    expect((await t.attempt(ALL[0], { hintsLevel: "none" })).json).toEqual({ ok: true, stars: null });
  });

  it("keeps the best stars when a later run earns fewer", async () => {
    const t = setup();
    await t.login();
    await finish(t, { hintsLevel: "none" });
    t.clock.now = new Date(t.clock.now.getTime() + 1000);
    const res = await finish(t, { outcome: "corrected", wrongSubmissions: 1, hintsLevel: "letters" });
    expect(res.json.stars).toEqual({ earned: 1, best: 3 });
    expect((await stars(t)).stars).toBe(3);
    expect((await stars(t)).practicedAt).toBe(t.clock.now.toISOString());
  });

  it("takes a star for a run that used the study screen", async () => {
    const t = setup();
    await t.login();
    const res = await finish(t, { hintsLevel: "none", studied: true });
    expect(res.json.stars.earned).toBe(2);
  });

  it("caps a sentences-path run at two stars", async () => {
    const t = setup();
    await t.login();
    const res = await finish(t, { hintsLevel: "none", path: "sentences" });
    expect(res.json.stars.earned).toBe(2);
  });

  it("returns the items already attempted as seen", async () => {
    const t = setup();
    await t.login();
    await t.attempt(SENTENCES[0], { path: "sentences" });
    const lesson = (await t.req("GET", "/api/lessons/it-a1-bar-1?lang=it")).json;
    expect(lesson.seen).toEqual([SENTENCES[0]]);
    expect(lesson.stars).toBeNull();
  });
});

describe("Master", () => {
  it("refuses a Master attempt before the lesson has been completed", async () => {
    const t = setup();
    await t.login();
    expect((await t.attempt(SENTENCES[0], { master: true, hintsLevel: "none", path: "sentences" })).status).toBe(403);
  });

  it("refuses a Master attempt until 6 hours after the last practice", async () => {
    const t = setup();
    await t.login();
    await finish(t);
    t.clock.now = new Date(t.clock.now.getTime() + MASTER_WAIT_MS - 1);
    expect((await t.attempt(SENTENCES[0], { master: true, hintsLevel: "none", path: "sentences" })).status).toBe(403);
    t.clock.now = new Date(t.clock.now.getTime() + 1);
    expect((await t.attempt(SENTENCES[0], { master: true, hintsLevel: "none", path: "sentences" })).status).toBe(200);
  });

  it("restarts the wait when the lesson is practiced again, even without finishing the run", async () => {
    const t = setup();
    await t.login();
    await finish(t);
    t.clock.now = new Date(t.clock.now.getTime() + MASTER_WAIT_MS);
    await t.attempt(ALL[0], { hintsLevel: "none" });
    expect((await t.attempt(SENTENCES[0], { master: true, hintsLevel: "none", path: "sentences" })).status).toBe(403);
    expect((await stars(t)).practicedAt).toBe(t.clock.now.toISOString());
  });

  it("refuses a Master attempt on a word or chunk", async () => {
    const t = setup();
    await t.login();
    await finish(t);
    t.clock.now = new Date(t.clock.now.getTime() + MASTER_WAIT_MS);
    expect((await t.attempt("it-a1-bar-1-u01", { master: true, hintsLevel: "none" })).status).toBe(400);
  });

  it("refuses the master and studied flags outside learn mode", async () => {
    const t = setup();
    await t.login();
    expect((await t.attempt(SENTENCES[0], { mode: "review", master: true })).status).toBe(400);
    expect((await t.attempt(SENTENCES[0], { mode: "review", studied: true })).status).toBe(400);
  });

  it("raises a one-star lesson to three with a clean Master run", async () => {
    const t = setup();
    await t.login();
    await finish(t, { outcome: "corrected", wrongSubmissions: 1 });
    expect((await stars(t)).stars).toBe(1);
    t.clock.now = new Date(t.clock.now.getTime() + MASTER_WAIT_MS);
    const res = await finish(t, { master: true, hintsLevel: "none" });
    expect(res.json.stars).toEqual({ earned: 3, best: 3 });
  });

  it("earns two stars for a Master run with a mistake, and leaves lesson progress alone", async () => {
    const t = setup();
    await t.login();
    await finish(t, { outcome: "corrected", wrongSubmissions: 1 });
    t.clock.now = new Date(t.clock.now.getTime() + MASTER_WAIT_MS);
    const before = (await t.req("GET", "/api/catalog?lang=it")).json.progress;
    const res = await finish(t, { master: true, hintsLevel: "none", outcome: "corrected", wrongSubmissions: 1 });
    expect(res.json.stars.earned).toBe(2);
    expect((await t.req("GET", "/api/catalog?lang=it")).json.progress).toEqual(before);
  });
});
