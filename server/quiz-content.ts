import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES, type Language } from "../shared/content.ts";
import { QUIZ_KINDS, QUIZ_LEVELS, type QuizKind, type QuizLevel } from "../shared/api.ts";

/** One multiple-choice question. `id` hashes the question and its answer (many share a prompt like "Which sentence is correct?"), so reordering a deck keeps progress and rewording either resets it. */
export type QuizQuestion = { id: string; title: string; question: string; correct: string; wrong: string[]; explanation: string };
export type QuizDeck = { id: string; language: Language; level: QuizLevel; kind: QuizKind; num: number; hash: string; questions: QuizQuestion[] };

const HEADER = ["title", "question", "correct", "wrong1", "wrong2", "wrong3", "explanation"];
/** `a1plus-grammar-2.csv` is A1+ Grammar 2. */
const FILENAME = /^(a1|a1plus|a2|a2plus|b1|b1plus|b2|b2plus)-(grammar|vocab)-(\d+)\.csv$/;

/** RFC 4180: quoted fields may hold commas, newlines and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const endField = () => { row.push(field); field = ""; };
  const endRow = () => {
    endField();
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') quoted = false;
      else field += ch;
      i++;
    } else if (ch === '"' && field === "") { quoted = true; i++; }
    else if (ch === ",") { endField(); i++; }
    else if (ch === "\r" || ch === "\n") { endRow(); i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1; }
    else { field += ch; i++; }
  }
  if (quoted) throw new Error("unterminated quoted field");
  if (field !== "" || row.length) endRow();
  return rows;
}

/** Parses and checks one deck file's questions; throws with the row number on the first problem. */
export function parseDeck(text: string): QuizQuestion[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  if (!header || header.map((h) => h.trim().toLowerCase()).join(",") !== HEADER.join(","))
    throw new Error(`header must be ${HEADER.join(",")}`);
  if (!rows.length) throw new Error("no questions");
  const ids = new Set<string>();
  return rows.map((raw, i) => {
    const at = `row ${i + 2}`;
    if (raw.length !== HEADER.length) throw new Error(`${at}: ${raw.length} columns, expected ${HEADER.length}`);
    const [title, question, correct, w1, w2, w3, explanation] = raw.map((f) => f.trim());
    const wrong = [w1, w2, w3];
    raw.forEach((f, c) => { if (!f.trim()) throw new Error(`${at}: empty ${HEADER[c]}`); });
    const options = [correct, ...wrong];
    if (new Set(options).size !== options.length) throw new Error(`${at}: repeated answer option`);
    const id = createHash("sha1").update(`${question}\n${correct}`.normalize("NFC")).digest("hex").slice(0, 12);
    if (ids.has(id)) throw new Error(`${at}: repeats an earlier question`);
    ids.add(id);
    return { id, title, question, correct, wrong, explanation };
  });
}

/** The preset decks in `{contentDir}/quizzes/{language}/`, for app languages only; folders for other languages are kept for later. */
export function loadQuizzes(contentDir: string): QuizDeck[] {
  const decks: QuizDeck[] = [];
  for (const language of LANGUAGES) {
    const dir = join(contentDir, "quizzes", language);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      const path = join(dir, file);
      const m = FILENAME.exec(file);
      if (!m) throw new Error(`Invalid quiz deck ${path}: the name must look like a1plus-grammar-1.csv`);
      const text = readFileSync(path, "utf8");
      let questions;
      try {
        questions = parseDeck(text);
      } catch (e) {
        throw new Error(`Invalid quiz deck ${path}: ${(e as Error).message}`);
      }
      const level = m[1].toUpperCase().replace("PLUS", "+") as QuizLevel;
      if (!QUIZ_LEVELS.includes(level) || !QUIZ_KINDS.includes(m[2] as QuizKind)) throw new Error(`Invalid quiz deck ${path}: unknown level or kind`);
      decks.push({
        id: `${language}-${file.replace(/\.csv$/, "")}`, language, level, kind: m[2] as QuizKind, num: Number(m[3]),
        hash: createHash("sha1").update(text).digest("hex"), questions,
      });
    }
  }
  return decks;
}
