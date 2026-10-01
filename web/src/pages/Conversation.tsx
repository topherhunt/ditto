import { A, useLocation, useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import {
  MOVE_ON_AFTER, type CheckStep, type Chunk, type ConversationOut, type HowOut, type MoveOnResult, type PartnerRetryResult, type SpeakAttemptOut, type SpeakAttemptResult,
  type TurnOut,
} from "../../../shared/api.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { playRecordStart, playRecordStop, playResult, playWarning } from "../sounds.ts";
import { PlayButton } from "../components/PlayButton.tsx";
import { ScrollUpButton, scrollFabClass, scrollFabStyle, scrollToY } from "../components/ScrollButtons.tsx";
import { autoplay, loading, playing } from "./player.ts";
import { keepRecording, recordingUrl } from "../recordings.ts";

/** Tappable chunks; the tapped one is spoken and shows its gloss in a tooltip below it. Bootstrap's tooltip classes, positioned without its JS. */
function ChunkLine(props: { chunks: Chunk[]; id: string; active: string | null; preparing: boolean; onTap: (key: string, text: string) => void; class?: string; classList?: Record<string, boolean> }) {
  const key = (i: number) => `${props.id}-${i}`;
  return (
    <div class={props.class} classList={props.classList}>
      <For each={props.chunks}>
        {(c, i) => (
          <>
            <span class="qa-chunk chunk position-relative" classList={{ active: props.active === key(i()) }} onClick={() => props.onTap(key(i()), c.text)}>
              {c.text}
              <Show when={props.active === key(i())}>
                <span class="qa-gloss tooltip bs-tooltip-bottom show position-absolute top-100 start-50 translate-middle-x" role="tooltip">
                  <span class="tooltip-arrow" style={{ left: "calc(50% - var(--bs-tooltip-arrow-width) / 2)" }} />
                  <span class="tooltip-inner d-block text-nowrap">
                    <Show when={props.preparing}><span class="qa-gloss-spinner spinner-border spinner-border-sm me-2" role="status" aria-label={t("speak.preparingAudio")} /></Show>
                    {c.gloss}
                  </span>
                </span>
              </Show>
            </span>{" "}
          </>
        )}
      </For>
    </div>
  );
}

/** The CEFR grade of a line, straddling the bottom border of its (positioned) bubble: at the left for the partner, the right for the learner. Absent on a line without one. Ignores taps so it never blocks the content it brushes. */
function LevelBadge(props: { level: string | null; side: "start" | "end" }) {
  return (
    <Show when={props.level}>
      {(l) => (
        <span class={`qa-turn-level badge text-bg-secondary pe-none position-absolute top-100 translate-middle-y ${props.side === "start" ? "start-0 ms-1" : "end-0 me-1"}`} style={{ "font-size": ".65rem" }}>{l()}</span>
      )}
    </Show>
  );
}

/** `latest` is the conversation's last turn, set larger so the line to answer stands out. */
function Turn(props: { turn: TurnOut; latest: boolean; active: string | null; preparing: boolean; onTap: (key: string, text: string) => void }) {
  const turn = () => props.turn;
  /** The learner's replies replay from this browser; the server never stores them. */
  const [kept] = createResource(() => turn().role === "learner" && turn().id, recordingUrl);
  return (
    <Show when={turn().role === "partner"} fallback={
      <div class="qa-turn qa-turn-learner align-self-end text-end" style={{ "max-width": "85%" }}>
        <div class="d-inline-flex align-items-center gap-2 p-2 rounded border bubble-learner bg-primary-subtle position-relative">
          <Show when={turn().chunks} fallback={<span class="qa-turn-text">{turn().text}</span>}>
            {(chunks) => <ChunkLine class="qa-turn-text" chunks={chunks()} id={`t${turn().id}`} active={props.active} preparing={props.preparing} onTap={props.onTap} />}
          </Show>
          <LevelBadge level={turn().level} side="end" />
          <Show when={kept()}>{(u) => <PlayButton url={u()} class="qa-turn-play-own btn-link p-0" />}</Show>
        </div>
        {/* A suggested or typed reply needs no label; only a skipped one is worth flagging. */}
        <Show when={turn().source === "how" || turn().source === "moved_on"}>
          <div class="small text-body-secondary">{t(`speak.source.${turn().source as "how" | "moved_on"}`)}</div>
        </Show>
      </div>
    }>
      <div class="qa-turn qa-turn-partner d-flex align-items-start gap-2 p-2 rounded border bubble-partner bg-body-secondary position-relative" style={{ "max-width": "85%" }}>
        <PlayButton url={turn().audioUrl!} class="qa-turn-play" color="btn-outline-primary" />
        <Show when={turn().chunks} fallback={<span class="qa-turn-text" classList={{ "fs-5": props.latest }}>{turn().text}</span>}>
          {(chunks) => <ChunkLine class="qa-turn-text" classList={{ "fs-5": props.latest }} chunks={chunks()} id={`t${turn().id}`} active={props.active} preparing={props.preparing} onTap={props.onTap} />}
        </Show>
        <LevelBadge level={turn().level} side="start" />
      </div>
    </Show>
  );
}

/** The down button hides once the end of the conversation is within this many px below the viewport. */
const SCROLL_DOWN_UNTIL = 200;

/** Floating round buttons: down while the end of the conversation (`end`, its last row) is more than SCROLL_DOWN_UNTIL below the viewport, scrolling it to the viewport's bottom edge and no further, plus the shared up button. */
function ScrollButtons(props: { end: () => HTMLElement }) {
  const [canDown, setCanDown] = createSignal(false);
  const update = () => setCanDown(props.end().getBoundingClientRect().bottom > window.innerHeight + SCROLL_DOWN_UNTIL);
  onMount(() => {
    update();
    // The page grows as replies, retries and glosses arrive, with no scroll event.
    const resize = new ResizeObserver(update);
    resize.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    onCleanup(() => {
      resize.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    });
  });
  return (
    <>
      <ScrollUpButton />
      <button type="button" data-silent class={`qa-scroll-down ${scrollFabClass} bottom-0`} classList={{ show: canDown() }} style={scrollFabStyle} aria-label={t("speak.scrollDown")}
        onClick={() => scrollToY(window.scrollY + props.end().getBoundingClientRect().bottom - window.innerHeight)}><i class="bi bi-arrow-down" aria-hidden="true" /></button>
    </>
  );
}

type RecState = "idle" | "starting" | "recording" | "checking";

export function Conversation() {
  const lang = useLang();
  const params = useParams();
  const [conv, { mutate, refetch }] = createResource(() => params.id, (id) => api.get<ConversationOut>(`/api/conversations/${id}`));
  /** Set by the Speak page when it has just started this conversation, whose opening line then plays once. */
  let opening = (useLocation().state as { opened?: boolean } | undefined)?.opened === true;
  createEffect(() => {
    if (!opening || !conv()) return;
    opening = false;
    autoplay(conv()!.turns[0].audioUrl!);
  });
  /** Chunks tapped since the learner's last turn; their count is sent as `taps`. */
  const [revealed, setRevealed] = createSignal(new Set<string>());
  const [recState, setRecState] = createSignal<RecState>("idle");
  /** Where the server is in checking a reply; "sending" until its first step arrives. */
  const [step, setStep] = createSignal<CheckStep | "sending">("sending");
  const [attempt, setAttempt] = createSignal<SpeakAttemptOut | null>(null);
  /** The failed attempt's recording, from this browser. */
  const [ownUrl, setOwnUrl] = createSignal("");
  let end: HTMLDivElement | undefined;
  const [how, setHow] = createSignal<HowOut | null>(null);
  const [howText, setHowText] = createSignal("");
  const [howOpen, setHowOpen] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let recorder: MediaRecorder | null = null;

  const c = () => conv()!;
  const last = () => c().turns[c().turns.length - 1];
  /** The chunk whose gloss tooltip is open; tapping it again or anywhere else closes it. */
  const [activeChunk, setActiveChunk] = createSignal<string | null>(null);
  const [activeUrl, setActiveUrl] = createSignal<string | null>(null);
  /** True while the tapped chunk's audio is being prepared, until it starts playing. */
  const preparing = () => loading() && activeUrl() !== null && playing() === activeUrl();
  const tap = (key: string, text: string) => {
    if (activeChunk() === key) return setActiveChunk(null);
    setActiveChunk(key);
    const url = `/api/conversations/${c().id}/say?text=${encodeURIComponent(text)}`;
    setActiveUrl(url);
    autoplay(url);
    setRevealed((s) => new Set(s).add(key));
  };
  const closeTooltip = (e: MouseEvent) => {
    if (!(e.target as Element).closest(".chunk")) setActiveChunk(null);
  };
  document.addEventListener("click", closeTooltip);
  onCleanup(() => document.removeEventListener("click", closeTooltip));
  /** `turns` are new, or replace the turn with their id (a learner turn gets its chunks with the partner's answer). */
  const update = (patch: Partial<ConversationOut>, turns: TurnOut[] = []) =>
    mutate({ ...c(), ...patch, turns: [...c().turns.filter((x) => !turns.some((n) => n.id === x.id)), ...turns] });
  /** A new turn clears the reply in progress and speaks the partner's answer. */
  const advance = (turns: TurnOut[], patch: Partial<ConversationOut>) => {
    update(patch, turns);
    setAttempt(null);
    setHow(null);
    setHowText("");
    setHowOpen(false);
    setRevealed(new Set<string>());
    const partner = turns.find((x) => x.role === "partner");
    if (partner) autoplay(partner.audioUrl!);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      // A reply can pass and then have the partner's answer fail; reload to show where things stand.
      refetch();
    } finally {
      setBusy(false);
    }
  };

  const send = (recording: Blob, audio: string, mime: "audio/webm" | "audio/mp4") => run(async () => {
    setRecState("checking");
    setStep("sending");
    try {
      const res = await api.postStream<SpeakAttemptResult, { step: CheckStep }>(`/api/conversations/${c().id}/attempts`, {
        audio, mime, target: attempt()?.target ?? null, usedHow: how() !== null, taps: revealed().size,
      }, (e) => setStep(e.step));
      if (res.attempt.passed) {
        playResult(true);
        const mine = res.turns.find((x) => x.role === "learner");
        if (mine) keepRecording(mine.id, recording);
        advance(res.turns, { reliance: res.reliance, spend: res.spend });
      } else {
        playWarning();
        update({ spend: res.spend });
        setOwnUrl(URL.createObjectURL(recording));
        setAttempt(res.attempt);
      }
    } finally {
      setRecState("idle");
    }
  });

  const record = async () => {
    setRecState("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Chrome and Firefox record WebM, Safari only MP4.
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const chunks: Blob[] = [];
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        playRecordStop();
        stream.getTracks().forEach((track) => track.stop());
        const recording = new Blob(chunks, { type: mime });
        const reader = new FileReader();
        reader.onload = () => void send(recording, (reader.result as string).split(",")[1], mime);
        reader.readAsDataURL(recording);
      };
      recorder.start();
      playRecordStart();
      setRecState("recording");
    } catch (e) {
      setRecState("idle");
      setError(t("speak.micError", { error: (e as Error).message }));
    }
  };

  const toggleRecord = () => (recState() === "recording" ? recorder!.stop() : void record());
  const canRecord = () => conv() !== undefined && last().role === "partner" && !busy() && (recState() === "idle" || recState() === "recording");
  // Space works the record button except while typing. A focused button or checkbox is blurred first, or space would
  // also click it on keyup (replaying a line after its ▶ was tapped).
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== " " || e.repeat || !canRecord()) return;
    if ((e.target as Element).closest("textarea, select, [contenteditable], input:not([type=checkbox], [type=radio])")) return;
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    toggleRecord();
  };
  document.addEventListener("keydown", onKey);
  onCleanup(() => document.removeEventListener("keydown", onKey));

  const askHow = () => run(async () => {
    const res = await api.post<HowOut>(`/api/conversations/${c().id}/how`, { text: howText() });
    setHow(res);
    update({ spend: res.spend });
  });
  const moveOn = () => run(async () => {
    const res = await api.post<MoveOnResult>(`/api/conversations/${c().id}/move-on`, { target: attempt()!.target, taps: revealed().size });
    advance(res.turns, { reliance: res.reliance, spend: res.spend });
  });
  const partnerRetry = () => run(async () => {
    const res = await api.post<PartnerRetryResult>(`/api/conversations/${c().id}/partner`);
    advance(res.turns, { spend: res.spend });
  });

  return (
    <Show when={conv()}>
      <div class="d-flex flex-column gap-3">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <A end href={`/${lang()}/talk`} class="btn btn-sm btn-outline-secondary" aria-label={t("speak.history")}><i class="bi bi-arrow-left" aria-hidden="true" /></A>
          <h1 class="qa-conversation-title h4 mb-0 me-auto">{c().title}</h1>
        </div>
        <div class="small text-body-secondary">{t("speak.tapHint")}</div>

        <div class="d-flex flex-column gap-3">
          <For each={c().turns}>{(turn, i) => <Turn turn={turn} latest={i() === c().turns.length - 1} active={activeChunk()} preparing={preparing()} onTap={tap} />}</For>
        </div>

        <Show when={last().role === "learner"}>
          <Show when={busy()} fallback={
            <button type="button" class="qa-partner-retry btn btn-outline-primary align-self-start" onClick={partnerRetry}>{t("speak.partnerRetry")}</button>
          }>
            <div class="qa-partner-loading d-flex align-items-center gap-2 text-body-secondary" role="status">
              <span class="spinner-border spinner-border-sm" aria-hidden="true" />
              <span>{t("app.loading")}</span>
            </div>
          </Show>
        </Show>

        <Show when={last().role === "partner"}>
          <div class="qa-reply d-flex flex-column gap-3 border-top pt-3">
            {/* Keyed, so each attempt gets a fresh report form. */}
            <Show when={attempt()} keyed>
              {(a) => <Retry attempt={a} ownUrl={ownUrl()} conversationId={c().id} onElse={() => setAttempt(null)} onMoveOn={moveOn} busy={busy()} />}
            </Show>

            <Show when={recState() === "checking"} fallback={
              <button type="button" data-silent class="qa-record btn btn-lg align-self-center" classList={{ "btn-danger": recState() === "recording", "btn-outline-danger": recState() !== "recording" }}
                disabled={!canRecord()} onClick={toggleRecord}>
                <i class={`bi ${recState() === "recording" ? "bi-stop-fill" : "bi-mic-fill"} me-1`} aria-hidden="true" />
                {recState() === "recording" ? t("speak.stop") : attempt() ? t("speak.recordAgain") : t("speak.record")}
              </button>
            }>
              <div class="qa-checking d-flex align-items-center gap-2 text-body-secondary" role="status">
                <span class="spinner-border spinner-border-sm" aria-hidden="true" />
                <span class={`qa-checking-${step()}`}>{t(`speak.step.${step()}`)}</span>
              </div>
            </Show>

            <Show when={!attempt()}>
            <div>
              <Show when={!c().hardMode}><div class="small fw-semibold mb-1">{t("speak.suggestions")}</div></Show>
              {/* The suggestions, then "How do I say...?" as the last option; hard mode leaves only that. */}
              <ul class="mb-0">
                <Show when={!c().hardMode && last().suggestions}>
                  {(suggestions) => (
                    <For each={suggestions()}>
                      {(s, j) => (
                        <li class="qa-suggestion d-flex align-items-start gap-2 mb-1">
                          <ChunkLine chunks={s} id={`t${last().id}-s${j()}`} active={activeChunk()} preparing={preparing()} onTap={tap} />
                          <PlayButton url={`/api/conversations/${c().id}/say?text=${encodeURIComponent(s.map((x) => x.text).join(" "))}`} class="qa-suggestion-play btn-link p-0" />
                        </li>
                      )}
                    </For>
                  )}
                </Show>
                <li>
                  <button type="button" class="qa-how-open btn btn-link p-0 align-baseline" onClick={() => setHowOpen(!howOpen())}>{t("speak.how")}</button>
                  <Show when={howOpen()}>
                    <form class="d-flex gap-2 mt-1" onSubmit={(e) => { e.preventDefault(); void askHow(); }}>
                      <input ref={(el) => queueMicrotask(() => el.focus())} class="qa-how-text form-control form-control-sm" placeholder={t("speak.howPlaceholder")} value={howText()} onInput={(e) => setHowText(e.currentTarget.value)} />
                      <button type="submit" class="qa-how-go btn btn-sm btn-outline-primary" disabled={busy() || !howText().trim()}>{t("speak.howGo")}</button>
                    </form>
                  </Show>
                  <Show when={how()}>
                    {(h) => (
                      <div class="qa-how-result mt-2">
                        <span class="small text-body-secondary me-1">{t("speak.howResult")}</span>
                        <span class="fs-5 fw-semibold">{h().sentence}</span>
                        <div class="small text-body-secondary">{h().chunks.map((x) => `${x.text} = ${x.gloss}`).join(" · ")}</div>
                      </div>
                    )}
                  </Show>
                </li>
              </ul>
            </div>
            </Show>
          </div>
        </Show>

        <Show when={error()}>{(m) => <div class="qa-conversation-error alert alert-danger mb-0">{m()}</div>}</Show>

        <div ref={end} class="d-flex flex-wrap gap-3 small text-body-secondary border-top pt-2">
          <span class="qa-replies">{t(c().reliance.of === 1 ? "speak.replies.one" : "speak.replies.other", { n: c().reliance.of })}</span>
          <span class="qa-hints">{t(c().reliance.leaned === 1 ? "speak.hints.one" : "speak.hints.other", { n: c().reliance.leaned })}</span>
        </div>
        <ScrollButtons end={() => end!} />
      </div>
    </Show>
  );
}

/** A failed reply: the sentence to say, what went wrong, and the ways out. */
function Retry(props: { attempt: SpeakAttemptOut; ownUrl: string; conversationId: number; onElse: () => void; onMoveOn: () => void; busy: boolean }) {
  const a = () => props.attempt;
  const [note, setNote] = createSignal("");
  const [reported, setReported] = createSignal(false);
  const [reportOpen, setReportOpen] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const report = async () => {
    setError(null);
    try {
      await api.post(`/api/conversations/${props.conversationId}/attempts/${a().id}/report`, { note: note() });
      setReported(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div class="qa-retry d-flex flex-column gap-2">
      <div class="d-flex align-items-center gap-2 small text-body-secondary">
        <span class="qa-retry-heard">{t("speak.youSaid")} <i>{a().transcript}</i></span>
        <PlayButton url={props.ownUrl} class="qa-retry-play-own btn-link p-0" />
      </div>
      <div class="qa-retry-good-try text-orange fw-semibold">{t("speak.goodTry")}</div>
      <ul class="mb-0">
        <li class="qa-retry-feedback">{a().verdict.feedback}</li>
        <For each={a().verdict.fixes}>
          {(f) => <li class="qa-retry-fix"><span class="letter-delete">{f.wrong}</span> → <span class="letter-insert">{f.right}</span> <span class="small text-body-secondary">{f.why}</span></li>}
        </For>
      </ul>
      <div>
        <div class="small text-orange fw-semibold">{t("speak.sayThis")}:</div>
        <div class="d-flex align-items-center gap-2">
          <Show when={a().targetAudioUrl}>
            {(u) => <PlayButton url={u()} class="qa-retry-play-target" color="btn-outline-primary" />}
          </Show>
          <span class="qa-retry-target fs-4">{a().target}</span>
        </div>
      </div>
      <div class="d-flex flex-nowrap gap-1">
        <button type="button" class="qa-retry-else btn btn-sm btn-link px-1 text-nowrap" onClick={props.onElse}>{t("speak.else")}</button>
        <button type="button" class="qa-retry-report-open btn btn-sm btn-link px-1 text-nowrap" onClick={() => setReportOpen(!reportOpen())}>{t("speak.report")}</button>
      </div>
      <Show when={a().failures >= MOVE_ON_AFTER}>
        <div class="qa-move-on alert alert-warning d-flex flex-wrap align-items-center gap-2 mb-0">
          <span class="me-auto">{t("speak.moveOnHint")}</span>
          <button type="button" class="qa-move-on-go btn btn-sm btn-warning" disabled={props.busy} onClick={props.onMoveOn}>{t("speak.moveOn")}</button>
        </div>
      </Show>
      <Show when={reportOpen()}>
        <Show when={!reported()} fallback={<div class="qa-retry-reported small text-success">{t("speak.reported")}</div>}>
          <form class="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); void report(); }}>
            <input class="qa-retry-report-note form-control form-control-sm" placeholder={t("speak.reportNote")} value={note()} onInput={(e) => setNote(e.currentTarget.value)} />
            <button type="submit" class="qa-retry-report-send btn btn-sm btn-outline-danger">{t("speak.reportSend")}</button>
          </form>
        </Show>
      </Show>
      <Show when={error()}>{(m) => <div class="small text-danger">{m()}</div>}</Show>
    </div>
  );
}
