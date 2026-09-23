import { createSignal, For, Index, onCleanup, onMount, Show } from "solid-js";
import type { AttemptBody, ExplanationOut, Mode, Prefs } from "../../../shared/api.ts";
import type { ServedUnit, ServedWord } from "../../../shared/content.ts";
import { grade, type Answer, type DeterministicCategory, type GradeResult, type PunctMark, type WordResult } from "../../../shared/grader.ts";
import { tokenize, words } from "../../../shared/tokenize.ts";
import { api } from "../api.ts";
import { hasFeedback, mergeCategories, outcomeOf, placeholder, slotsAfter, type Outcome, type SlotState } from "../practice.ts";
import { PunctDiff, SentenceDiff, WordDiff } from "./WordDiff.tsx";

type SlotFeedback = { state: SlotState | "hinted"; word?: WordResult };

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One dictation item. Mount it keyed by unit; it records the attempt when finished and calls onNext after. */
export function Exercise(props: { unit: ServedUnit; prefs: Prefs; mode: Mode; onFinished: (o: Outcome) => void; onNext: () => void }) {
  const unit = props.unit;
  const target = words(unit.text);
  const [free, setFree] = createSignal(props.prefs.hints === "none");
  const [freeText, setFreeText] = createSignal("");
  const [slots, setSlots] = createSignal<string[]>(target.map(() => ""));
  const [feedback, setFeedback] = createSignal<SlotFeedback[]>(target.map(() => ({ state: "open" })));
  const [freeResult, setFreeResult] = createSignal<GradeResult | null>(null);
  const [wrongSubmissions, setWrongSubmissions] = createSignal(0);
  const [hintsUsed, setHintsUsed] = createSignal(0);
  const [done, setDone] = createSignal(false);
  const [revealed, setRevealed] = createSignal(false);
  const [autoplayBlocked, setAutoplayBlocked] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [selectedWord, setSelectedWord] = createSignal<ServedWord | null>(null);
  const [explanation, setExplanation] = createSignal<ExplanationOut | null>(null);
  const [explainState, setExplainState] = createSignal<"idle" | "loading" | string>("idle");
  const submissions: string[] = [];
  /** Word index -> letter positions whose accent was fixed, kept orange in the finished answer. */
  const accentWords = new Map<number, number[]>();
  /** Word index -> punctuation typed after it that doesn't belong, shown struck through in the finished answer. */
  const strayAfter = new Map<number, PunctMark[]>();
  let categories: DeterministicCategory[] = [];
  let replays = 0;
  let focused = 0;
  const started = Date.now();
  const inputs: HTMLInputElement[] = [];
  let freeInput: HTMLTextAreaElement | undefined;
  /** The meaning check: the translation plus its distractors, shuffled. Null when the unit has no translation. */
  const meaningOptions = unit.distractors ? shuffle([unit.translation!, ...unit.distractors]) : null;
  const [meaningPick, setMeaningPick] = createSignal<string | null>(null);
  let dictation: Omit<AttemptBody, "meaningCorrect"> | null = null;

  /** One voice per item, so replays and word taps sound like the sentence. */
  const voice = Math.floor(Math.random() * unit.audio.length);
  const audio = new Audio(unit.audio[voice]);
  let autoplaysLeft = props.prefs.autoplay;
  const play = (rate = props.prefs.rate) => {
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = rate;
    audio.play().then(() => setAutoplayBlocked(false), () => setAutoplayBlocked(true));
  };
  const onEnded = () => {
    if (--autoplaysLeft > 0) setTimeout(() => play(), 700);
  };
  audio.addEventListener("ended", onEnded);
  onMount(() => {
    if (autoplaysLeft > 0) play();
    focusFirstOpen();
  });
  onCleanup(() => {
    audio.removeEventListener("ended", onEnded);
    audio.pause();
  });
  const replay = (rate?: number) => {
    autoplaysLeft = 0;
    replays++;
    play(rate);
  };

  function focusFirstOpen() {
    if (free()) return freeInput?.focus();
    const i = feedback().findIndex((f) => f.state === "open");
    inputs[i >= 0 ? i : 0]?.focus();
  }

  function applySlots(result: GradeResult) {
    const s = slotsAfter(result, target.length);
    const byIndex = new Map(result.words.flatMap((w) => (w.kind === "extra" ? [] : [[w.wordIndex, w] as const])));
    const old = feedback();
    setSlots(s.values);
    setFeedback(s.states.map((state, i) => (old[i]?.state === "hinted" ? old[i] : { state, word: byIndex.get(i) })));
  }

  function submit() {
    if (done()) return settled() ? props.onNext() : undefined;
    const answer: Answer = free() ? { mode: "free", text: freeText() } : { mode: "slots", slots: slots() };
    if ((free() ? [freeText()] : slots()).every((t) => t.trim() === "")) return;
    submissions.push(free() ? freeText().trim() : slots().join(" "));
    const r = grade(answer, unit);
    if (r.against === unit.text) for (const w of r.words) if (w.kind === "accent") accentWords.set(w.wordIndex, w.accentPositions);
    if (r.passed) {
      if (r.against === unit.text) {
        for (const w of r.words) {
          const stray = w.after.filter((m) => m.status === "stray");
          if (w.kind !== "extra" && stray.length) strayAfter.set(w.wordIndex, stray);
        }
      }
      if (r.against === unit.text && !free()) applySlots(r);
      else setFreeResult(r);
      return finish(Math.max(accentWords.size, r.accentSlips));
    }
    setWrongSubmissions((n) => n + 1);
    categories = mergeCategories(categories, r.categories);
    if (r.against === unit.text) {
      applySlots(r);
      setFree(false);
      setFreeResult(null);
    } else {
      setFreeResult(r);
    }
    queueMicrotask(focusFirstOpen);
  }

  function hint() {
    if (done()) return;
    if (free()) {
      setFree(false);
      setSlots(target.map(() => ""));
    }
    const fb = feedback();
    const i = fb[focused]?.state === "open" ? focused : fb.findIndex((f) => f.state === "open");
    if (i < 0) return;
    setHintsUsed((n) => n + 1);
    setSlots((s) => s.map((v, k) => (k === i ? target[i] : v)));
    setFeedback((f) => f.map((v, k) => (k === i ? { state: "hinted" } : v)));
    queueMicrotask(focusFirstOpen);
  }

  function reveal() {
    setRevealed(true);
    finish(accentWords.size);
  }

  /** The dictation is over; the attempt is recorded once the meaning check (if any) is answered too. */
  function finish(accentSlips: number) {
    setDone(true);
    dictation = {
      unitId: unit.id, rev: unit.rev, mode: props.mode, path: props.prefs.path, hintsLevel: props.prefs.hints,
      outcome: outcomeOf({ revealed: revealed(), wrongSubmissions: wrongSubmissions(), hintsUsed: hintsUsed() }),
      wrongSubmissions: wrongSubmissions(), hintsUsed: hintsUsed(), replays, accentSlips, submissions, categories,
      durationMs: Date.now() - started,
    };
    if (!meaningOptions) record(null);
  }

  function pickMeaning(option: string) {
    if (meaningPick() !== null) return;
    setMeaningPick(option);
    record(option === unit.translation);
  }

  function record(meaningCorrect: boolean | null) {
    const body: AttemptBody = { ...dictation!, meaningCorrect };
    props.onFinished(meaningCorrect === false && ["clean", "hinted"].includes(body.outcome) ? "corrected" : body.outcome);
    api.post("/api/attempts", body).catch((e: Error) => setSaveError(e.message));
  }

  /** Next is available once nothing is left to answer. */
  const settled = () => done() && (!meaningOptions || meaningPick() !== null);

  async function explain() {
    setExplainState("loading");
    try {
      setExplanation(await api.post<ExplanationOut>("/api/explain", { unitId: unit.id, answer: submissions[0] }));
      setExplainState("idle");
    } catch (e) {
      setExplainState((e as Error).message);
    }
  }

  function onSlotKey(e: KeyboardEvent, i: number) {
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === " " && i < target.length - 1) {
      e.preventDefault();
      inputs.slice(i + 1).find((el) => !el.readOnly)?.focus();
    } else if (e.key === "Backspace" && input.value === "" && i > 0) {
      e.preventDefault();
      inputs.slice(0, i).reverse().find((el) => !el.readOnly)?.focus();
    } else if (e.key === "Escape") {
      replay();
    }
  }

  const locked = (i: number) => done() || feedback()[i].state !== "open";

  return (
    <div class="qa-exercise card shadow-sm">
      <div class="card-body d-flex flex-column gap-3">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button type="button" class="qa-play btn btn-primary" onClick={() => replay()} title="Replay (Esc)">▶ Play</button>
          <button type="button" class="qa-play-slow btn btn-outline-primary" onClick={() => replay(0.75)}>Slow</button>
          <Show when={autoplayBlocked()}><span class="small text-body-secondary">Press play to listen</span></Show>
          <span class="ms-auto badge text-bg-light text-uppercase">{unit.stage}</span>
        </div>

        <Show
          when={!done()}
          fallback={
            <div class="d-flex flex-column gap-2">
              <div class="qa-answer fs-4">
                <For each={tokenize(unit.text)}>
                  {(t) =>
                    t.type === "punct" ? (
                      <span>{t.text}</span>
                    ) : (
                      <>
                        <button type="button" class="qa-answer-word btn btn-link p-0 fs-4 text-decoration-none align-baseline"
                          onClick={() => {
                            const w = unit.words[t.wordIndex];
                            setSelectedWord(w);
                            new Audio(w.audio[voice]).play().catch(() => setAutoplayBlocked(true));
                          }}>
                          <For each={Array.from(t.text)}>
                            {(ch, k) => <span classList={{ "letter-accent qa-letter-accent": !!accentWords.get(t.wordIndex)?.includes(k()) }}>{ch}</span>}
                          </For>
                        </button>
                        <For each={strayAfter.get(t.wordIndex) ?? []}>{(m) => <PunctDiff mark={m} />}</For>
                      </>
                    )
                  }
                </For>
              </div>
              <Show when={selectedWord()}>
                {(w) => (
                  <div class="qa-word-info small">
                    <strong>{w().text}</strong> <span class="text-body-secondary">({w().lemma}, {w().pos})</span> -- {w().gloss}
                  </div>
                )}
              </Show>
              <Show when={freeResult() && !freeResult()!.passed}>
                <div class="small">Your answer: <SentenceDiff result={freeResult()!} /></div>
              </Show>
            </div>
          }
        >
          <Show
            when={free()}
            fallback={
              <div class="qa-slots d-flex flex-wrap gap-2 align-items-start fs-5">
                <Index each={target}>
                  {(word, i) => (
                    <div class="d-flex flex-column align-items-center">
                      <input
                        ref={(el) => (inputs[i] = el)}
                        class="qa-slot slot form-control form-control-lg px-2"
                        classList={{ "border-warning": feedback()[i].state === "accent", "border-danger": !!feedback()[i].word && feedback()[i].state === "open" }}
                        style={{ "--len": word().length }}
                        value={slots()[i]}
                        placeholder={placeholder(word(), props.prefs.hints)}
                        readOnly={locked(i)}
                        autocomplete="off" autocapitalize="off" spellcheck={false}
                        onFocus={() => (focused = i)}
                        onInput={(e) => setSlots((s) => s.map((v, k) => (k === i ? e.currentTarget.value : v)))}
                        onKeyDown={(e) => onSlotKey(e, i)}
                      />
                      <Show when={feedback()[i].word && hasFeedback(feedback()[i].word!) && feedback()[i].word}>
                        {(w) => <small class="mt-1"><WordDiff word={w()} /></small>}
                      </Show>
                    </div>
                  )}
                </Index>
              </div>
            }
          >
            <textarea
              ref={freeInput}
              class="qa-free-input form-control form-control-lg font-mono"
              rows="2"
              value={freeText()}
              placeholder="Type what you hear"
              autocomplete="off" autocapitalize="off" spellcheck={false}
              onInput={(e) => setFreeText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") replay();
              }}
            />
          </Show>
          <Show when={freeResult()}>
            {(r) => <div class="qa-free-diff small">Closest accepted answer: <SentenceDiff result={r()} /></div>}
          </Show>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="qa-check btn btn-success" onClick={submit}>Check</button>
            <button type="button" class="qa-hint btn btn-outline-secondary" onClick={hint}>Hint</button>
            <button type="button" class="qa-reveal btn btn-outline-danger ms-auto" onClick={reveal}>Show answer</button>
          </div>
          <div class="small text-body-secondary">Enter checks, Space moves to the next word, Esc replays.</div>
        </Show>

        <Show when={done()}>
          <Show when={saveError()}>{(err) => <div class="alert alert-danger mb-0">Could not save progress: {err()}</div>}</Show>
          <Show when={submissions.length > 0 && (wrongSubmissions() > 0 || revealed())}>
            <div class="qa-explain">
              <Show when={explanation()} fallback={
                <button type="button" class="qa-why btn btn-sm btn-outline-info" disabled={explainState() === "loading"} onClick={explain}>
                  {explainState() === "loading" ? "Thinking…" : `Why was "${submissions[0]}" wrong?`}
                </button>
              }>
                {(ex) => (
                  <div class="qa-explanation alert alert-info mb-0">
                    <div class="d-flex flex-wrap gap-1 mb-1">
                      <For each={ex().categories}>{(c) => <span class="badge text-bg-info">{c.replaceAll("_", " ")}</span>}</For>
                    </div>
                    <strong>{ex().summary}</strong>
                    <div>{ex().details}</div>
                  </div>
                )}
              </Show>
              <Show when={!["idle", "loading"].includes(explainState())}>
                <div class="alert alert-warning mt-2 mb-0">{explainState()}</div>
              </Show>
            </div>
          </Show>
          <Show when={meaningOptions}>
            {(options) => (
              <div class="qa-meaning d-flex flex-column gap-2">
                <div class="fw-semibold">What does it mean?</div>
                {/* The group takes focus, not an option, so a reflexive Enter can't pick one. */}
                <div class="d-flex flex-column gap-2" tabIndex={-1} ref={(el) => queueMicrotask(() => el.focus())} onKeyDown={(e) => {
                  const k = Number(e.key);
                  if (k >= 1 && k <= options().length) pickMeaning(options()[k - 1]);
                  else if (e.key === "Escape") replay();
                }}>
                  <For each={options()}>
                    {(option, i) => {
                      const right = option === unit.translation;
                      return (
                        <button type="button" class="qa-meaning-option btn text-start"
                          classList={{
                            "btn-outline-secondary": meaningPick() === null || (!right && option !== meaningPick()),
                            "btn-success qa-meaning-right": meaningPick() !== null && right,
                            "btn-danger qa-meaning-wrong": meaningPick() === option && !right,
                          }}
                          disabled={meaningPick() !== null}
                          onClick={() => pickMeaning(option)}>
                          <span class="text-body-secondary me-2">{i() + 1}</span>{option}
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            )}
          </Show>
          <Show when={settled()}>
            <div class="d-flex align-items-center gap-2">
              <span class="qa-outcome text-body-secondary small">
                {revealed() ? "Revealed" : wrongSubmissions() > 0 ? "Corrected" : hintsUsed() > 0 ? "Done with hints" : "Perfect"}
                {accentWords.size > 0 ? " -- watch the accents" : ""}
                {meaningPick() !== null && meaningPick() !== unit.translation ? " -- check the meaning" : ""}
              </span>
              <button type="button" class="qa-next btn btn-primary ms-auto" ref={(el) => queueMicrotask(() => el.focus())} onClick={() => props.onNext()}>
                Next
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
