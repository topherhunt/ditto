import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../../server/content.ts";
import { buildPrompt } from "../../server/explain.ts";
import { grade } from "../../shared/grader.ts";

const root = join(import.meta.dirname, "../..");
const content = loadContent(join(root, "tests/fixtures/content"), join(root, "content/audio"), { audio: "skip" });

describe("explainer prompt", () => {
  it("asks for the explanation in the learner's interface language and shows the unit in their support language", () => {
    const unit = content.locales["es-419"].units.get("it-a1-bar-1-u06")!;
    const answer = "Vorrei un caffe per favor";
    const { instructions, input } = buildPrompt({ unit, grammarFocus: ["vorrei + sustantivo"], answer, grade: grade({ mode: "free", text: answer }, unit), locale: "es-419" });
    expect(instructions).toMatch(/recorded Italian sentence/);
    expect(instructions).toMatch(/Write in Latin American Spanish\.$/);
    expect(input).toContain("Meaning: Quisiera un café, por favor.");
    expect(input).toContain("Lesson grammar focus: vorrei + sustantivo");
  });
});
