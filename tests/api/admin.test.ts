import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

type T = ReturnType<typeof setup>;
const UNIT = "it-a1-bar-1-u01";

async function report(t: T, over: Record<string, unknown> = {}) {
  await t.login("learner@example.com");
  expect((await t.req("POST", "/api/reports", { unitId: UNIT, rev: 1, voice: 2, kind: "audio", note: "mumbled", ...over })).status).toBe(200);
  await t.login("admin@example.com");
}
const list = async (t: T, status: string) => (await t.req("GET", `/api/admin/reports?status=${status}`)).json;

describe("admin access", () => {
  it("flags admins in /api/me and refuses admin endpoints to everyone else", async () => {
    const t = setup();
    await t.login("learner@example.com");
    expect((await t.req("GET", "/api/me")).json.admin).toBe(false);
    expect((await t.req("GET", "/api/admin/reports?status=new")).status).toBe(403);
    await t.login("Admin@Example.com");
    expect((await t.req("GET", "/api/me")).json.admin).toBe(true);
    expect((await t.req("GET", "/api/admin/reports?status=new")).status).toBe(200);
  });
});

describe("report triage", () => {
  it("lists a new report with its reporter, the clip that played, and the unit as it is now", async () => {
    const t = setup();
    await report(t);
    const unit = t.deps.content.locales.en.units.get(UNIT)!;
    const [r] = await list(t, "new");
    expect(r).toMatchObject({
      status: "new", reporter: { email: "learner@example.com" }, kind: "audio", note: "mumbled", unitId: UNIT, unitRev: 1,
      text: unit.text, voice: "kokoro:if_sara", audioUrl: unit.audio[2], decision: null,
      current: { rev: unit.rev, text: unit.text, translation: unit.translation, audioUrl: unit.audio[2] },
    });
  });

  it("moves a report to triaged with a decision and an optional note", async () => {
    const t = setup();
    await report(t);
    const [{ id }] = await list(t, "new");
    expect((await t.req("PUT", `/api/admin/reports/${id}/triage`, { decision: "fix_audio", note: " " })).json).toMatchObject({ status: "triaged", adminNote: null });
    const res = await t.req("PUT", `/api/admin/reports/${id}/triage`, { decision: "fix_audio", note: " stress on the wrong syllable " });
    expect(res.json).toMatchObject({ status: "triaged", decision: "fix_audio", adminNote: "stress on the wrong syllable", triagedAt: "2026-09-01T10:00:00.000Z" });
    expect(await list(t, "new")).toEqual([]);
    expect((await list(t, "triaged")).map((r: { id: number }) => r.id)).toEqual([id]);
  });

  it("closes a dismissed report, and reopening it makes it new again", async () => {
    const t = setup();
    await report(t);
    const [{ id }] = await list(t, "new");
    expect((await t.req("PUT", `/api/admin/reports/${id}/triage`, { decision: "dismiss", note: "" })).json)
      .toMatchObject({ status: "closed", resolution: "dismissed", adminNote: null });
    expect((await t.req("PUT", `/api/admin/reports/${id}/triage`, { decision: "discuss", note: "hm" })).status).toBe(409);
    expect((await t.req("POST", `/api/admin/reports/${id}/reopen`, {})).json).toMatchObject({ status: "new", decision: null, resolution: null });
  });

  it("records a review of a proposed fix on a triaged report, needing a note to reject", async () => {
    const t = setup();
    await report(t);
    const [{ id }] = await list(t, "new");
    expect((await t.req("PUT", `/api/admin/reports/${id}/review`, { review: "approved", note: "" })).status).toBe(409);
    await t.req("PUT", `/api/admin/reports/${id}/triage`, { decision: "fix_audio", note: "mumbled" });
    expect((await t.req("PUT", `/api/admin/reports/${id}/review`, { review: "rejected", note: "" })).status).toBe(400);
    expect((await t.req("PUT", `/api/admin/reports/${id}/review`, { review: "rejected", note: "still mumbled" })).json)
      .toMatchObject({ status: "triaged", review: "rejected", reviewNote: "still mumbled" });
  });
});
