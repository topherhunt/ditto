import { baseKey, exactKey, words } from "./tokenize.ts";

/** One letter of a wrong word's correction view. `ch` is the target letter for keep/insert, the typed letter for delete. */
export type LetterOp = { op: "keep" | "insert" | "delete"; ch: string; accent?: boolean };

export type WordResult =
  | { kind: "correct"; target: string; wordIndex: number }
  | { kind: "accent"; target: string; typed: string; wordIndex: number; accentPositions: number[] }
  | { kind: "wrong"; target: string; typed: string; wordIndex: number; ops: LetterOp[] }
  | { kind: "missing"; target: string; wordIndex: number }
  | { kind: "extra"; typed: string };

export type DeterministicCategory = "spelling" | "missing_word" | "extra_word" | "word_order";

export type GradeResult = {
  passed: boolean;
  /** Which accepted answer was compared: the main text or a variant. */
  against: string;
  words: WordResult[];
  accentSlips: number;
  categories: DeterministicCategory[];
};

export type GradeMode = "slots" | "free";

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

function gradeWord(typed: string, target: string, wordIndex: number): WordResult {
  if (exactKey(typed) === exactKey(target)) return { kind: "correct", target, wordIndex };
  if (baseKey(typed) === baseKey(target)) {
    const ops = letterDiff(typed, target);
    const accentPositions = ops.flatMap((o, k) => (o.accent ? [k] : []));
    return { kind: "accent", target, typed, wordIndex, accentPositions };
  }
  return { kind: "wrong", target, typed, wordIndex, ops: letterDiff(typed, target) };
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

type Aligned = { typed?: string; target?: string; targetIndex?: number };

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
      out.push({ typed: typed[i - 1], target: target[j - 1], targetIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      out.push({ target: target[j - 1], targetIndex: j - 1 });
      j--;
    } else {
      out.push({ typed: typed[i - 1] });
      i--;
    }
  }
  return out.reverse();
}

function gradeAgainst(typed: string[], answer: string, mode: GradeMode): GradeResult {
  const target = words(answer);
  let aligned: Aligned[];
  if (mode === "slots") {
    if (typed.length !== target.length)
      throw new Error(`slots mode expects ${target.length} entries, got ${typed.length}`);
    // Punctuation is never graded, so strip what the learner typed around the word.
    aligned = target.map((t, k) => ({ typed: words(typed[k]).join(" "), target: t, targetIndex: k }));
  } else {
    aligned = alignFree(typed, target);
  }

  const results: WordResult[] = aligned.map((p) => {
    if (p.target === undefined) return { kind: "extra", typed: p.typed! };
    if (p.typed === undefined) return { kind: "missing", target: p.target, wordIndex: p.targetIndex! };
    return gradeWord(p.typed, p.target, p.targetIndex!);
  });

  const categories = new Set<DeterministicCategory>();
  const missing = results.flatMap((r) => (r.kind === "missing" ? [baseKey(r.target)] : []));
  const extra = results.flatMap((r) => (r.kind === "extra" ? [baseKey(r.typed)] : []));
  const moved = missing.filter((w) => extra.includes(w));
  if (moved.length) categories.add("word_order");
  if (missing.some((w) => !moved.includes(w))) categories.add("missing_word");
  if (extra.some((w) => !moved.includes(w))) categories.add("extra_word");
  if (results.some((r) => r.kind === "wrong")) categories.add("spelling");

  return {
    passed: results.every((r) => r.kind === "correct" || r.kind === "accent"),
    against: answer,
    words: results,
    accentSlips: results.filter((r) => r.kind === "accent").length,
    categories: [...categories],
  };
}

function errorWeight(r: GradeResult): number {
  return r.words.reduce(
    (sum, w) =>
      sum + (w.kind === "wrong" ? w.ops.filter((o) => o.op !== "keep").length : w.kind === "missing" || w.kind === "extra" ? 5 : 0),
    0,
  );
}

/**
 * Grade typed words against the main text and its accepted variants.
 * `slots` mode: one entry per word of the main text. Variants are then compared as free text.
 * Returns the first passing comparison, else the one with the fewest errors.
 */
export function grade(typed: string[], text: string, variants: string[] = [], mode: GradeMode = "free"): GradeResult {
  const main = gradeAgainst(typed, text, mode);
  if (main.passed) return main;
  const typedWords = mode === "slots" ? words(typed.join(" ")) : typed;
  let best = main;
  for (const v of variants) {
    const r = gradeAgainst(typedWords, v, "free");
    if (r.passed) return r;
    if (errorWeight(r) < errorWeight(best)) best = r;
  }
  return best;
}
