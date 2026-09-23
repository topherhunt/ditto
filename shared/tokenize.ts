export type Token =
  | { type: "word"; text: string; wordIndex: number }
  | { type: "punct"; text: string };

// Content must not use single quotes as quotation marks: every apostrophe is part of a word
// (l'uomo, un po', 's avonds, I'll). Apostrophe variants are normalized to ASCII.
const APOSTROPHES = /[’‘ʼ`]/g;
const WORD = /'?[\p{L}\p{N}\p{M}]+(?:['\-][\p{L}\p{N}\p{M}]+)*'?%?/gu;

export function normalizeApostrophes(s: string): string {
  return s.replace(APOSTROPHES, "'");
}

export function tokenize(text: string): Token[] {
  const s = normalizeApostrophes(text.normalize("NFC"));
  const tokens: Token[] = [];
  let last = 0;
  let wordIndex = 0;
  for (const m of s.matchAll(WORD)) {
    if (m.index > last) tokens.push({ type: "punct", text: s.slice(last, m.index) });
    tokens.push({ type: "word", text: m[0], wordIndex: wordIndex++ });
    last = m.index + m[0].length;
  }
  if (last < s.length) tokens.push({ type: "punct", text: s.slice(last) });
  return tokens;
}

export function words(text: string): string[] {
  return tokenize(text).flatMap((t) => (t.type === "word" ? [t.text] : []));
}

/** Case-insensitive, accent-sensitive. */
export function exactKey(w: string): string {
  return normalizeApostrophes(w.normalize("NFC")).toLowerCase();
}

/** Base letters only: case- and accent-insensitive. */
export function baseKey(w: string): string {
  return normalizeApostrophes(w.normalize("NFD").replace(/\p{M}/gu, "")).toLowerCase();
}
