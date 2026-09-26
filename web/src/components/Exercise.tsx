import { createSignal, For, Index, onCleanup, onMount, Show } from "solid-js";
import { REPORT_KINDS, type AttemptBody, type ExplanationOut, type Prefs, type ReportBody } from "../../../shared/api.ts";
import type { ServedUnit, ServedWord } from "../../../shared/content.ts";
import { grade, type Answer, type DeterministicCategory, type GradeResult, type PunctMark, type WordResult } from "../../../shared/grader.ts";
import { tokenize, words } from "../../../shared/tokenize.ts";
import { api } from "../api.ts";
import { categoryName, t } from "../i18n/index.ts";
import { hasFeedback, mergeCategories, outcomeOf, placeholder, slotsAfter, type Outcome, type SessionMode, type SlotState } from "../practice.ts";
import { playResult } from "../sounds.ts";
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

/**
 * One dictation item, plus a "Report a problem" link under it. Mount it keyed by unit, in a flex column;
 * it records the attempt when finished, passing onFinished the pending save, and calls onNext after.
 * In a level test there are no hints, the first wrong answer ends the item, and nothing is recorded.
 * Accent slips pass, shown in orange, as in every mode.
 */
export function Exercise(props: {
  unit: ServedUnit; prefs: Prefs; mode: SessionMode; onFinished: (o: Outcome, saved: Promise<unknown>) => void; onNext: () => void;
}) {
  const unit = props.unit;
  const target = words(unit.text);
  const test = props.mode === "test";
  const [free, setFree] = createSignal(test || props.prefs.hints === "none");
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
  let dictation: Omit<AttemptBody, "meaningCorrect" | "mode"> | null = null;

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
    if ((free() ? [freeText()] : slots()).every((s) => s.trim() === "")) return;
    submissions.push(free() ? freeText().trim() : slots().join(" "));
    const r = grade(answer, unit);
    playResult(r.passed);
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
    if (test) {
      setFreeResult(r);
      return finish(accentWords.size);
    }
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
    playResult(false);
    setRevealed(true);
    finish(accentWords.size);
  }

  /** The dictation is over; the attempt is recorded once the meaning check (if any) is answered too. */
  function finish(accentSlips: number) {
    setDone(true);
    dictation = {
      unitId: unit.id, rev: unit.rev, path: props.prefs.path, hintsLevel: props.prefs.hints,
      outcome: outcomeOf({ revealed: revealed(), wrongSubmissions: wrongSubmissions(), hintsUsed: hintsUsed() }),
      wrongSubmissions: wrongSubmissions(), hintsUsed: hintsUsed(), replays, accentSlips, submissions, categories,
      durationMs: Date.now() - started,
    };
    if (!meaningOptions) record(null);
  }

  function pickMeaning(option: string) {
    if (meaningPick() !== null) return;
    setMeaningPick(option);
    // A right pick stays quiet: the dictation already played its sound.
    if (option !== unit.translation) playResult(false);
    record(option === unit.translation);
  }

  function record(meaningCorrect: boolean | null) {
    const d = dictation!;
    const mode = props.mode;
    const saved = mode === "test" ? Promise.resolve() : api.post("/api/attempts", { ...d, mode, meaningCorrect } satisfies AttemptBody);
    saved.catch((e: Error) => setSaveError(e.message));
    const missed = meaningCorrect === false;
    props.onFinished(missed && ["clean", "hinted"].includes(d.outcome) ? "corrected" : d.outcome, saved);
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

  const [reportOpen, setReportOpen] = createSignal(false);
  const [reportKind, setReportKind] = createSignal<ReportBody["kind"] | null>(null);
  const [reportNote, setReportNote] = createSignal("");
  const [reportState, setReportState] = createSignal<"idle" | "sending" | "sent" | string>("idle");
  const sendDisabled = () => !reportKind() || reportState() === "sending";

  async function sendReport(e: SubmitEvent) {
    e.preventDefault();
    setReportState("sending");
    try {
      const kind = reportKind()!;
      const answer = kind === "accept" ? submissions[0] : undefined;
      await api.post("/api/reports", { unitId: unit.id, rev: unit.rev, voice, kind, answer, note: reportNote() } satisfies ReportBody);
      setReportState("sent");
    } catch (err) {
      setReportState((err as Error).message);
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
    <>
    <div class="qa-exercise card shadow-sm">
      <div class="card-body d-flex flex-column gap-3">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button type="button" class="qa-play btn btn-primary" onClick={() => replay()} title={t("exercise.replayTitle")}>{t("exercise.play")}</button>
          <button type="button" class="qa-play-slow btn btn-outline-primary" onClick={() => replay(0.75)}>{t("exercise.slow")}</button>
          <Show when={autoplayBlocked()}><span class="small text-body-secondary">{t("exercise.pressPlay")}</span></Show>
          <span class="ms-auto badge text-bg-light text-uppercase">{t(`stage.${unit.stage}`)}</span>
        </div>

        <Show
          when={!done()}
          fallback={
            <div class="d-flex flex-column gap-2">
              <div class="qa-answer fs-4">
                <For each={tokenize(unit.text)}>
                  {(tok) =>
                    tok.type === "punct" ? (
                      <span>{tok.text}</span>
                    ) : (
                      <>
                        <button type="button" class="qa-answer-word btn btn-link p-0 fs-4 text-decoration-none align-baseline"
                          onClick={() => {
                            const w = unit.words[tok.wordIndex];
                            setSelectedWord(w);
                            new Audio(w.audio[voice]).play().catch(() => setAutoplayBlocked(true));
                          }}>
                          <For each={Array.from(tok.text)}>
                            {(ch, k) => <span classList={{ "letter-accent qa-letter-accent": !!accentWords.get(tok.wordIndex)?.includes(k()) }}>{ch}</span>}
                          </For>
                        </button>
                        <For each={strayAfter.get(tok.wordIndex) ?? []}>{(m) => <PunctDiff mark={m} />}</For>
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
                <div class="small">{t("exercise.yourAnswer")} <SentenceDiff result={freeResult()!} /></div>
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
              placeholder={t("exercise.typeHere")}
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
            {(r) => <div class="qa-free-diff small">{t("exercise.closest")} <SentenceDiff result={r()} /></div>}
          </Show>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="qa-check btn btn-success" onClick={submit}>{t("exercise.check")}</button>
            <Show when={!test}><button type="button" class="qa-hint btn btn-outline-secondary" onClick={hint}>{t("exercise.hint")}</button></Show>
            <button type="button" class="qa-reveal btn btn-outline-danger ms-auto" onClick={reveal}>{t("exercise.reveal")}</button>
          </div>
          <div class="small text-body-secondary">{t("exercise.keys")}</div>
        </Show>

        <Show when={done()}>
          <Show when={saveError()}>{(err) => <div class="alert alert-danger mb-0">{t("exercise.saveFailed", { error: err() })}</div>}</Show>
          <Show when={submissions.length > 0 && (wrongSubmissions() > 0 || revealed())}>
            <div class="qa-explain">
              <Show when={explanation()} fallback={
                <button type="button" class="qa-why btn btn-sm btn-outline-info" disabled={explainState() === "loading"} onClick={explain}>
                  {explainState() === "loading" ? t("exercise.thinking") : t("exercise.whyWrong", { answer: submissions[0] })}
                </button>
              }>
                {(ex) => (
                  <div class="qa-explanation alert alert-info mb-0">
                    <div class="d-flex flex-wrap gap-1 mb-1">
                      <For each={ex().categories}>{(c) => <span class="badge text-bg-info">{categoryName(c)}</span>}</For>
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
                <div class="fw-semibold">{t("exercise.meaning")}</div>
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
                {t(revealed() ? "exercise.revealed" : wrongSubmissions() > 0 ? "exercise.corrected" : hintsUsed() > 0 ? "exercise.hinted" : "exercise.perfect")}
                {accentWords.size > 0 ? ` -- ${t("exercise.watchAccents")}` : ""}
                {meaningPick() !== null && meaningPick() !== unit.translation ? ` -- ${t("exercise.checkMeaning")}` : ""}
              </span>
              <button type="button" class="qa-next btn btn-primary ms-auto" ref={(el) => queueMicrotask(() => el.focus())} onClick={() => props.onNext()}>
                {t("exercise.next")}
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
    <Show
      when={reportOpen()}
      fallback={
        <button type="button" data-silent class="qa-report-open btn btn-link btn-sm p-0 ms-auto text-body-secondary" onClick={() => setReportOpen(true)}>
          {t("report.open")}
        </button>
      }
    >
      <Show when={reportState() !== "sent"} fallback={<div class="qa-report-sent small text-body-secondary ms-auto">{t("report.sent")}</div>}>
        <form data-silent class="qa-report d-flex flex-column gap-2 small ms-auto" onSubmit={sendReport}>
          {/* The first submission is the one graded wrong: a pass ends the dictation. */}
          <For each={REPORT_KINDS.filter((k) => k !== "accept" || wrongSubmissions() > 0)}>
            {(kind) => (
              <label class="form-check mb-0">
                <input type="radio" name="report-kind" class={`qa-report-kind-${kind} form-check-input`} checked={reportKind() === kind} onChange={() => setReportKind(kind)} />
                <span class="form-check-label">
                  {t(`report.${kind}`)}
                  <Show when={kind === "accept"}> <q class="qa-report-answer">{submissions[0]}</q></Show>
                </span>
              </label>
            )}
          </For>
          <textarea class="qa-report-note form-control form-control-sm" rows="2" maxLength={1000} placeholder={t("report.note")}
            value={reportNote()} onInput={(e) => setReportNote(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              e.preventDefault();
              // requestSubmit() ignores the send button's disabled state, so check it here.
              if (!sendDisabled()) e.currentTarget.form!.requestSubmit();
            }} />
          <Show when={!["idle", "sending"].includes(reportState())}>
            <div class="alert alert-danger py-1 mb-0">{reportState()}</div>
          </Show>
          <div class="d-flex gap-2 justify-content-end">
            <button type="button" class="qa-report-cancel btn btn-sm btn-outline-secondary" onClick={() => setReportOpen(false)}>{t("report.cancel")}</button>
            <button type="submit" class="qa-report-send btn btn-sm btn-primary" disabled={sendDisabled()}>{t("report.send")}</button>
          </div>
        </form>
      </Show>
    </Show>
    </>
  );
}
