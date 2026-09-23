import { For, Match, Show, Switch } from "solid-js";
import type { GradeResult, PunctMark, WordResult } from "../../../shared/grader.ts";

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
      <For each={props.word.after}>{(m) => <PunctDiff mark={m} />}</For>
    </span>
  );
}

/** Typed punctuation: plain if it belongs, orange strikethrough if stray, red strikethrough plus the right mark if wrong. */
export function PunctDiff(props: { mark: PunctMark }) {
  return (
    <Switch>
      <Match when={props.mark.status === "ok"}><span>{props.mark.ch}</span></Match>
      <Match when={props.mark.status === "stray"}><span class="letter-stray qa-punct-stray">{props.mark.ch}</span></Match>
      <Match when={props.mark.status === "wrong"}>
        <span class="letter-delete qa-punct-wrong">{props.mark.ch}</span>
        <span class="letter-insert qa-punct-expected">{props.mark.expected}</span>
      </Match>
    </Switch>
  );
}

export function SentenceDiff(props: { result: GradeResult }) {
  return (
    <span class="d-inline-flex flex-wrap gap-2">
      <Show when={props.result.leading.length}>
        <span class="font-mono"><For each={props.result.leading}>{(m) => <PunctDiff mark={m} />}</For></span>
      </Show>
      <For each={props.result.words}>{(w) => <WordDiff word={w} />}</For>
    </span>
  );
}
