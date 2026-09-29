import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadQuizzes, parseCsv, parseDeck } from "../../server/quiz-content.ts";

const HEADER = "title,question,correct,wrong1,wrong2,wrong3,explanation";
const row = (title: string, question: string, correct = "a") => `${title},${question},${correct},b,c,d,why`;

describe("quiz decks", () => {
  it("parses quoted fields with commas, doubled quotes, newlines and CRLF row ends", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n"x\ny",z,\n')).toEqual([["a", "b, c", 'say "hi"'], ["x\ny", "z", ""]]);
    expect(() => parseCsv('a,"b')).toThrow("unterminated quoted field");
  });

  it("keeps a question's id when its row moves, and gives questions sharing a prompt different ids", () => {
    const [a, b] = parseDeck([HEADER, row("T1", "Which is correct?", "one"), row("T2", "Which is correct?", "two")].join("\n"));
    const [b2, a2] = parseDeck([HEADER, row("T2", "Which is correct?", "two"), row("T1", "Which is correct?", "one")].join("\n"));
    expect(a.id).not.toBe(b.id);
    expect([a2.id, b2.id]).toEqual([a.id, b.id]);
    expect(a).toMatchObject({ title: "T1", correct: "one", wrong: ["b", "c", "d"], explanation: "why" });
  });

  it("rejects a bad header, a short row, an empty field, a repeated option and a repeated question, naming the row", () => {
    expect(() => parseDeck(`title,question\n${row("T", "Q")}`)).toThrow("header must be");
    expect(() => parseDeck(`${HEADER}\nT,Q,a,b,c,why`)).toThrow("row 2: 6 columns, expected 7");
    expect(() => parseDeck(`${HEADER}\nT,Q,a,b,c,d,`)).toThrow("row 2: empty explanation");
    expect(() => parseDeck(`${HEADER}\nT,Q,a,b,a,d,why`)).toThrow("row 2: repeated answer option");
    expect(() => parseDeck(`${HEADER}\n${row("T", "Q")}\n${row("U", "Q")}`)).toThrow("row 3: repeats an earlier question");
  });

  it("loads app languages only, naming a deck by its file and failing on a badly named one", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-quiz-"));
    for (const lang of ["it", "fr"]) mkdirSync(join(dir, "quizzes", lang), { recursive: true });
    const deck = [HEADER, row("T", "Q")].join("\n");
    writeFileSync(join(dir, "quizzes/it/a1plus-vocab-2.csv"), deck);
    writeFileSync(join(dir, "quizzes/fr/a1-grammar-1.csv"), deck);
    expect(loadQuizzes(dir).map((d) => [d.id, d.level, d.kind, d.num])).toEqual([["it-a1plus-vocab-2", "A1+", "vocab", 2]]);
    writeFileSync(join(dir, "quizzes/it/Italian A1 Grammar 1.csv"), deck);
    expect(() => loadQuizzes(dir)).toThrow("the name must look like a1plus-grammar-1.csv");
  });
});
