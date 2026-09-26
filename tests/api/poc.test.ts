import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

const audio = (s: string) => Buffer.from(s).toString("base64");

async function admin() {
  const dir = mkdtempSync(join(tmpdir(), "lp-poc-"));
  const t = setup({ pocDir: dir });
  await t.login("admin@example.com");
  const clips = () => JSON.parse(readFileSync(join(dir, "clips.json"), "utf8"));
  return { ...t, dir, clips };
}

describe("pronunciation POC recorder", () => {
  it("is off without a POC dir and refuses non-admins", async () => {
    const off = setup();
    await off.login("admin@example.com");
    expect((await off.req("GET", "/api/config")).json.poc).toBe(false);
    expect((await off.req("GET", "/api/admin/poc")).status).toBe(404);

    const t = setup({ pocDir: mkdtempSync(join(tmpdir(), "lp-poc-")) });
    expect((await t.req("GET", "/api/config")).json.poc).toBe(true);
    await t.login("learner@example.com");
    expect((await t.req("GET", "/api/admin/poc")).status).toBe(403);
  });

  it("saves a correct take, replaces it on re-record, and lists it in clips.json", async () => {
    const t = await admin();
    expect((await t.req("GET", "/api/admin/poc")).json.sentences.map((s: { id: string }) => s.id)).toContain("it-anno");

    const first = (await t.req("POST", "/api/admin/poc/takes", { sentence: "it-anno", expect: "pass", mime: "audio/webm", note: "", audio: audio("one") })).json;
    expect(first.file).toBe("it-anno-correct.webm");
    const again = await t.req("POST", "/api/admin/poc/takes", { sentence: "it-anno", expect: "pass", mime: "audio/mp4", note: "", audio: audio("two") });
    expect(again.json.file).toBe("it-anno-correct.m4a");
    expect(existsSync(join(t.dir, "it-anno-correct.webm"))).toBe(false);

    const res = await t.req("GET", "/api/admin/poc/audio/it-anno-correct.m4a");
    expect(res.headers.get("content-type")).toBe("audio/mp4");
    expect(res.json).toBe("two");
    expect((await t.req("GET", "/api/admin/poc")).json.takes).toEqual([{ file: "it-anno-correct.m4a", sentence: "it-anno", expect: "pass", mime: "audio/mp4", note: "" }]);
    expect(t.clips().filter((c: { file?: string }) => c.file)).toEqual([
      { file: "it-anno-correct.m4a", lang: "it", text: "Faccio l'architetto e lavoro qui da un anno.", expect: "pass" },
    ]);
  });

  it("keeps every mispronounced take with its note, and deletes one", async () => {
    const t = await admin();
    const a = (await t.req("POST", "/api/admin/poc/takes", { sentence: "nl-kaas", expect: "fail", mime: "audio/webm", note: "", audio: audio("a") })).json;
    await new Promise((r) => setTimeout(r, 2));
    const b = (await t.req("POST", "/api/admin/poc/takes", { sentence: "nl-kaas", expect: "fail", mime: "audio/webm", note: "  kas  ", audio: audio("b") })).json;
    expect(a.file).not.toBe(b.file);

    expect((await t.req("PUT", `/api/admin/poc/takes/${a.file}`, { note: "short a in kaas" })).status).toBe(200);
    expect(t.clips().filter((c: { file?: string }) => c.file).map((c: { note?: string }) => c.note)).toEqual(["short a in kaas", "kas"]);

    expect((await t.req("DELETE", `/api/admin/poc/takes/${a.file}`)).status).toBe(200);
    expect(existsSync(join(t.dir, a.file))).toBe(false);
    expect((await t.req("GET", "/api/admin/poc")).json.takes.map((x: { file: string }) => x.file)).toEqual([b.file]);
  });

  it("serves only files it recorded and refuses unknown sentences", async () => {
    const t = await admin();
    expect((await t.req("GET", "/api/admin/poc/audio/takes.json")).status).toBe(404);
    expect((await t.req("GET", `/api/admin/poc/audio/${encodeURIComponent("../../package.json")}`)).status).toBe(404);
    expect((await t.req("POST", "/api/admin/poc/takes", { sentence: "nope", expect: "pass", mime: "audio/webm", note: "", audio: audio("x") })).status).toBe(404);
  });
});
