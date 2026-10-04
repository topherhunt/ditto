import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routes } from "../../web/src/routes.ts";
import { ROUTE_SAMPLES } from "../route-samples.ts";

const helpers = Object.entries(routes);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
}

describe("route helpers", () => {
  it("fill params, encode them and append only the query values that are set", () => {
    expect(routes.typeLesson({ lang: "it", lessonId: "it-a1-bar-1" })).toBe("/it/type/lesson/it-a1-bar-1");
    expect(routes.quizTest({ lang: "it", level: "A 1/2" })).toBe("/it/quiz/test/A%201%2F2");
    expect(routes.feedback()).toBe("/feedback");
    expect(routes.feedback({ from: "/it/type", id: undefined })).toBe("/feedback?from=%2Fit%2Ftype");
  });

  it("throw on a missing or empty param instead of building a broken URL", () => {
    expect(() => routes.person({ id: "" })).toThrow("missing :id");
    expect(() => routes.typeLesson({ lang: "it" } as never)).toThrow("missing :lessonId");
  });

  it("have a distinct pattern each", () => {
    const patterns = helpers.map(([, r]) => r.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("each have a sample URL for the e2e visit test, and no sample is left over", () => {
    expect(Object.keys(ROUTE_SAMPLES).sort()).toEqual(helpers.map(([name]) => name).sort());
  });

  it("each build a sample URL that fits its own pattern", () => {
    const ids = { conversationId: "7", quizSessionId: "9", userId: "abcdefghij" };
    for (const [name, route] of helpers) {
      const regex = new RegExp(`^${route.pattern.replace(/:\w+/g, "[^/?]+")}$`);
      expect(ROUTE_SAMPLES[name as keyof typeof routes](ids).split("?")[0], name).toMatch(regex);
    }
  });
});

describe("the app's use of routes", () => {
  const main = readFileSync("web/src/main.tsx", "utf8");

  it("registers every helper's pattern with the router, and nothing else but the catch-all", () => {
    const registered = [...main.matchAll(/<Route path=\{?(?:"([^"]*)"|routes\.(\w+)\.pattern)\}?/g)];
    expect(registered.filter((m) => m[1] !== undefined && m[1] !== "*").map((m) => m[1]), "hand-written route paths in main.tsx").toEqual([]);
    expect(registered.flatMap((m) => (m[2] ? [m[2]] : [])).sort()).toEqual(helpers.map(([name]) => name).sort());
  });

  it("builds no in-app URL by hand in a link or navigate call", () => {
    const handBuilt = /(href=\{?|navigate\()\s*["'`]\/(?!\/)/;
    const offenders = sourceFiles("web/src")
      .filter((f) => !f.endsWith("routes.ts") && !f.includes("/i18n/"))
      .flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((line, i) => (handBuilt.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])));
    expect(offenders, "use routes.* from web/src/routes.ts").toEqual([]);
  });
});
