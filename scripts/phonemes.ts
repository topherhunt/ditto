// Compares what scripts/audio-phonemes.py heard with espeak's IPA for the text.

// The recognizer and espeak disagree on notation more than on sound; fold the differences that aren't errors.
const FOLD: [RegExp, string][] = [
  [/[ˈˌːˑ.,!?;:'"\-\s\d͡‿]/g, ""], [/ʧ/g, "tʃ"], [/ʤ/g, "dʒ"], [/[ʊ]/g, "u"], [/[ɪɨj]/g, "i"], [/ɛ/g, "e"], [/ɔ/g, "o"],
  [/[ɾɹʁ]/g, "r"], [/[ɑɐ]/g, "a"], [/ɡ/g, "g"],
];
const fold = (ipa: string) => FOLD.reduce((s, [re, to]) => s.replace(re, to), ipa.normalize("NFD").replace(/\p{M}/gu, ""));

function distance(a: string[], b: string[]): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) [prev, d[j]] = [d[j], Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))];
  }
  return d[b.length];
}

/** Phoneme error rate: edits between the folded strings, per expected phoneme. */
export function phonemeErrorRate(heard: string, want: string): number {
  const w = [...fold(want)];
  return distance([...fold(heard)], w) / Math.max(1, w.length);
}
