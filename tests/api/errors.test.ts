import { afterEach, describe, expect, it, vi } from "vitest";
import { reportError } from "../../server/healthcheck.ts";
import { setup } from "./helpers.ts";

vi.mock("../../server/healthcheck.ts", () => ({ reportError: vi.fn() }));

/** A request whose body fails the way Node's server fails one when the client closes the socket mid-upload. */
const droppedRequest = () => {
  const aborted = Object.assign(new Error("aborted"), { code: "ECONNRESET" });
  const body = new ReadableStream({ pull: (ctrl) => ctrl.error(aborted) });
  return new Request("http://app.test/api/metrics/engaged", {
    method: "POST",
    headers: { host: "app.test", origin: "http://app.test", "content-type": "application/json" },
    body,
    duplex: "half",
  } as RequestInit);
};

describe("error handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs a dropped client connection as a warning without raising an alert", async () => {
    const t = setup();
    const res = await t.login();
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const req = droppedRequest();
    req.headers.set("cookie", cookie);
    await t.app.request(req);
    expect(warn.mock.calls.map((c) => c[0])).toContain("Client disconnected: POST /api/metrics/engaged");
    expect(error).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });
});
