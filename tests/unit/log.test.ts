import { describe, expect, it } from "vitest";
import { priorityTagged } from "../../server/log.ts";

describe("priorityTagged", () => {
  it("tags a warning with journal priority 4", () => {
    expect(priorityTagged("warn", ["Slow request:", 3])).toBe("<4>Slow request: 3");
  });

  it("tags every line of an error's stack, so journalctl -p keeps the whole trace", () => {
    const out = priorityTagged("error", [new Error("boom")]);
    const lines = out.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.startsWith("<3>"))).toBe(true);
    expect(lines[0]).toBe("<3>Error: boom");
  });
});
