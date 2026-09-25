import type { Language } from "./content.ts";
import { canonicalize } from "./equivalents.ts";
import { baseKey, exactKey, tokenize } from "./tokenize.ts";

/** One letter of a wrong word's correction view. `ch` is the target letter for keep/insert, the typed letter for delete. */
export type LetterOp = { op: "keep" | "insert" | "delete"; ch: string; accent?: boolean };

/**
 * A typed punctuation character. `ok`: belongs there (canonical, or an optional comma/semicolon). `stray`: doesn't
 * belong but isn't penalized. `wrong`: a sentence end mark of the wrong kind (? on a statement, . or ! on a question).
 */
export type PunctMark = { ch: string; status: "ok" | "stray" | "wrong"; expected?: string };

/** `after`: the punctuation typed right after this word (always empty for a missing word). */
export type WordResult = { after: PunctMark[] } & (
  | { kind: "correct"; target: string; wordIndex: number }
  | { kind: "accent"; target: string; typed: string; wordIndex: number; accentPositions: number[] }
  | { kind: "wrong"; target: string; typed: string; wordIndex: number; ops: LetterOp[] }
  | { kind: "missing"; target: string; wordIndex: number }
  | { kind: "extra"; typed: string }
);

export type DeterministicCategory = "spelling" | "missing_word" | "extra_word" | "word_order" | "punctuation";

export type GradeResult = {
  passed: boolean;
  /** Which accepted answer was compared: the main text or a variant. */
  against: string;
  /** Punctuation typed before the first word. */
  leading: PunctMark[];
  words: WordResult[];
  accentSlips: number;
  categories: DeterministicCategory[];
};

/** Free text, or one slot per word of the main text. */
export type Answer = { mode: "free"; text: string } | { mode: "slots"; slots: string[] };

/** `commas`: word indices after which a comma or semicolon is optional (main text only). */
export type GradeTarget = { language: Language; text: string; variants?: string[]; commas?: number[] };

const END_MARKS = ".!?";
const COMMA_LIKE = ",;";

type TypedWord = { text: string; after: string[] };
type Parsed = { leading: string[]; words: TypedWord[] };

const marksIn = (s: string) => Array.from(s).filter((c) => !/\s/u.test(c));

/** Words plus the punctuation characters that follow each one. */
function parse(text: string): Parsed {
  const parsed: Parsed = { leading: [], words: [] };
  for (const t of tokenize(text)) {
    if (t.type === "word") parsed.words.push({ text: t.text, after: [] });
    else (parsed.words.length ? parsed.words[parsed.words.length - 1].after : parsed.leading).push(...marksIn(t.text));
  }
  return parsed;
}

/**
 * One word per slot: the slot's text from its first to its last word character, so punctuation inside
 * (caf,fè) is graded as spelling. Marks before that belong to the previous gap, marks after to this one.
 */
function parseSlots(slots: string[]): Parsed {
  const parsed: Parsed = { leading: [], words: [] };
  for (const slot of slots) {
    const tokens = tokenize(slot);
    const first = tokens.findIndex((t) => t.type === "word");
    const last = tokens.findLastIndex((t) => t.type === "word");
    const before = first < 0 ? [] : tokens.slice(0, first).flatMap((t) => marksIn(t.text));
    const after = tokens.slice(last + 1).flatMap((t) => marksIn(t.text));
    (parsed.words.length ? parsed.words[parsed.words.length - 1].after : parsed.leading).push(...before);
    parsed.words.push({ text: first < 0 ? "" : tokens.slice(first, last + 1).map((t) => t.text).join(""), after });
  }
  return parsed;
}

const chars = (s: string) => Array.from(s.normalize("NFC"));
const baseChar = (c: string) => baseKey(c);
const lowerChar = (c: string) => exactKey(c);

/** Letter-level diff on base letters (LCS), keeping the target's real (accented) letters for display. */
export function letterDiff(typed: string, target: string): LetterOp[] {
  const a = chars(typed);
  const b = chars(target);
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = baseChar(a[i]) === baseChar(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: LetterOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (baseChar(a[i]) === baseChar(b[j])) {
      ops.push({ op: "keep", ch: b[j], accent: lowerChar(a[i]) !== lowerChar(b[j]) });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ op: "delete", ch: a[i++] });
    } else {
      ops.push({ op: "insert", ch: b[j++] });
    }
  }
  while (i < n) ops.push({ op: "delete", ch: a[i++] });
  while (j < m) ops.push({ op: "insert", ch: b[j++] });
  return ops;
}

function gradeWord(typed: string, target: string, wordIndex: number, after: PunctMark[]): WordResult {
  if (exactKey(typed) === exactKey(target)) return { kind: "correct", target, wordIndex, after };
  if (baseKey(typed) === baseKey(target)) {
    const ops = letterDiff(typed, target);
    const accentPositions = ops.flatMap((o, k) => (o.accent ? [k] : []));
    return { kind: "accent", target, typed, wordIndex, accentPositions, after };
  }
  return { kind: "wrong", target, typed, wordIndex, ops: letterDiff(typed, target), after };
}

/** `.` and `!` are interchangeable wherever the canonical text has either. */
const sameMark = (a: string, b: string) => a === b || (".!".includes(a) && ".!".includes(b));

/**
 * Status of one typed mark. `gap`: the target word it follows (null after an extra word); `isEnd`: it follows the
 * last typed word. End marks are only judged when the canonical text itself ends with one.
 */
function markStatus(ch: string, gap: number | null, isEnd: boolean, canon: Parsed, commas: Set<number>): PunctMark {
  const canonEnd = canon.words[canon.words.length - 1].after.findLast((c) => END_MARKS.includes(c));
  if (isEnd && canonEnd && END_MARKS.includes(ch)) {
    return (ch === "?") === (canonEnd === "?") ? { ch, status: "ok" } : { ch, status: "wrong", expected: canonEnd };
  }
  if (gap === null) return { ch, status: "stray" };
  const here = canon.words[gap].after;
  const lastGap = gap === canon.words.length - 1;
  if (here.some((c) => sameMark(c, ch))) return { ch, status: "ok" };
  if (COMMA_LIKE.includes(ch) && !lastGap && (commas.has(gap) || here.some((c) => COMMA_LIKE.includes(c)))) return { ch, status: "ok" };
  return { ch, status: "stray" };
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Substitution cost in [0, 2]: twice the normalized letter distance. Insert/delete cost 1 each, so an
 * unrelated word costs the same as extra + missing, and only a near-miss is paired as a misspelling.
 */
function subCost(typed: string, target: string): number {
  const a = baseKey(typed);
  const b = baseKey(target);
  return a === b ? 0 : (2 * levenshtein(a, b)) / Math.max(a.length, b.length);
}

type Aligned = { typedIndex?: number; targetIndex?: number };

function alignFree(typed: string[], target: string[]): Aligned[] {
  const n = typed.length;
  const m = target.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + subCost(typed[i - 1], target[j - 1]));
  const out: Aligned[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + subCost(typed[i - 1], target[j - 1])) {
      out.push({ typedIndex: i - 1, targetIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      out.push({ targetIndex: j - 1 });
      j--;
    } else {
      out.push({ typedIndex: i - 1 });
      i--;
    }
  }
  return out.reverse();
}

function gradeAgainst(typed: Parsed, answer: string, commas: Set<number>, aligned: Aligned[]): GradeResult {
  const canon = parse(answer);
  const lastTyped = typed.words.length - 1;
  const results: WordResult[] = aligned.map(({ typedIndex: ti, targetIndex: gi }) => {
    if (ti === undefined) return { kind: "missing", target: canon.words[gi!].text, wordIndex: gi!, after: [] };
    const tw = typed.words[ti];
    const after = tw.after.map((ch) => markStatus(ch, gi ?? null, ti === lastTyped, canon, commas));
    if (gi === undefined) return { kind: "extra", typed: tw.text, after };
    return gradeWord(tw.text, canon.words[gi].text, gi, after);
  });
  const leading = typed.leading.map((ch): PunctMark => ({ ch, status: canon.leading.includes(ch) ? "ok" : "stray" }));
  const wrongMarks = results.some((r) => r.after.some((m) => m.status === "wrong"));

  const categories = new Set<DeterministicCategory>();
  const missing = results.flatMap((r) => (r.kind === "missing" ? [baseKey(r.target)] : []));
  const extra = results.flatMap((r) => (r.kind === "extra" ? [baseKey(r.typed)] : []));
  const moved = missing.filter((w) => extra.includes(w));
  if (moved.length) categories.add("word_order");
  if (missing.some((w) => !moved.includes(w))) categories.add("missing_word");
  if (extra.some((w) => !moved.includes(w))) categories.add("extra_word");
  if (results.some((r) => r.kind === "wrong")) categories.add("spelling");
  if (wrongMarks) categories.add("punctuation");

  return {
    passed: !wrongMarks && results.every((r) => r.kind === "correct" || r.kind === "accent"),
    against: answer,
    leading,
    words: results,
    accentSlips: results.filter((r) => r.kind === "accent").length,
    categories: [...categories],
  };
}

function gradeFree(typed: Parsed, answer: string, commas: Set<number>): GradeResult {
  const aligned = alignFree(typed.words.map((w) => w.text), parse(answer).words.map((w) => w.text));
  return gradeAgainst(typed, answer, commas, aligned);
}

function errorWeight(r: GradeResult): number {
  return r.words.reduce(
    (sum, w) =>
      sum +
      w.after.filter((m) => m.status === "wrong").length +
      (w.kind === "wrong" ? w.ops.filter((o) => o.op !== "keep").length : w.kind === "missing" || w.kind === "extra" ? 5 : 0),
    0,
  );
}

/**
 * Grade an answer against the main text and its accepted variants, then against their canonical forms.
 * Slots: one per word of the main text; variants are then compared against the slots joined as free text.
 * Returns the first passing comparison, else the one with the fewest errors.
 */
export function grade(answer: Answer, target: GradeTarget): GradeResult {
  const commas = new Set(target.commas ?? []);
  let main: GradeResult;
  if (answer.mode === "slots") {
    const count = parse(target.text).words.length;
    if (answer.slots.length !== count) throw new Error(`slots mode expects ${count} entries, got ${answer.slots.length}`);
    main = gradeAgainst(parseSlots(answer.slots), target.text, commas, answer.slots.map((_, k) => ({ typedIndex: k, targetIndex: k })));
  } else {
    main = gradeFree(parse(answer.text), target.text, commas);
  }
  if (main.passed) return main;
  const text = answer.mode === "slots" ? answer.slots.join(" ") : answer.text;
  const typed = parse(text);
  let best = main;
  for (const v of target.variants ?? []) {
    const r = gradeFree(typed, v, new Set());
    if (r.passed) return r;
    if (errorWeight(r) < errorWeight(best)) best = r;
  }
  // Equivalent spellings (I'd / I would, $100 / 100 dollars): compared in canonical form, which `against` then holds.
  const canonTyped = canonicalize(text, target.language);
  for (const accepted of [target.text, ...(target.variants ?? [])]) {
    const canon = canonicalize(accepted, target.language);
    if (canon === accepted && canonTyped === text) continue;
    const r = gradeFree(parse(canonTyped), canon, new Set());
    if (r.passed) return r;
    if (errorWeight(r) < errorWeight(best)) best = r;
  }
  return best;
}
