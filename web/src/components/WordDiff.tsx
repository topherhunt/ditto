import { For, Match, Switch } from "solid-js";
import type { WordResult } from "../../../shared/grader.ts";

/** One graded word: red strikethrough = delete, green underline = insert, orange = accent fixed for you. */
export function WordDiff(props: { word: WordResult }) {
  return (
    <span class="qa-word-diff font-mono">
      <Switch>
        <Match when={props.word.kind === "correct" && props.word}>{(w) => <span>{w().target}</span>}</Match>
        <Match when={props.word.kind === "accent" && props.word}>
          {(w) => (
            <For each={Array.from(w().target)}>
              {(ch, i) => <span classList={{ "letter-accent qa-letter-accent": w().accentPositions.includes(i()) }}>{ch}</span>}
            </For>
          )}
        </Match>
        <Match when={props.word.kind === "wrong" && props.word}>
          {(w) => (
            <For each={w().ops}>
              {(o) => (
                <span
                  classList={{
                    "letter-delete qa-letter-delete": o.op === "delete",
                    "letter-insert qa-letter-insert": o.op === "insert",
                    "letter-accent qa-letter-accent": o.op === "keep" && !!o.accent,
                  }}
                >
                  {o.ch}
                </span>
              )}
            </For>
          )}
        </Match>
        <Match when={props.word.kind === "missing" && props.word}>
          {(w) => <span class="letter-insert qa-letter-insert qa-word-missing">{w().target}</span>}
        </Match>
        <Match when={props.word.kind === "extra" && props.word}>
          {(w) => <span class="letter-delete qa-letter-delete qa-word-extra">{w().typed}</span>}
        </Match>
      </Switch>
    </span>
  );
}

export function SentenceDiff(props: { words: WordResult[] }) {
  return (
    <span class="d-inline-flex flex-wrap gap-2">
      <For each={props.words}>{(w) => <WordDiff word={w} />}</For>
    </span>
  );
}
