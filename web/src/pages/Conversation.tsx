import { A, useLocation, useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, onCleanup, Show } from "solid-js";
import {
  MOVE_ON_AFTER, type CheckStep, type Chunk, type ConversationOut, type HowOut, type MoveOnResult, type PartnerRetryResult, type SpeakAttemptOut, type SpeakAttemptResult,
  type TurnOut,
} from "../../../shared/api.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { playResult, playWarning } from "../sounds.ts";
import { PlayButton } from "../components/PlayButton.tsx";
import { autoplay } from "./player.ts";
import { usd } from "./Speak.tsx";

/** Tappable chunks; the tapped one is spoken and shows its gloss in a tooltip below it. Bootstrap's tooltip classes, positioned without its JS. */
function ChunkLine(props: { chunks: Chunk[]; id: string; active: string | null; onTap: (key: string, text: string) => void; class?: string }) {
  const key = (i: number) => `${props.id}-${i}`;
  return (
    <div class={props.class}>
      <For each={props.chunks}>
        {(c, i) => (
          <>
            <span class="qa-chunk chunk position-relative" classList={{ active: props.active === key(i()) }} onClick={() => props.onTap(key(i()), c.text)}>
              {c.text}
              <Show when={props.active === key(i())}>
                <span class="qa-gloss tooltip bs-tooltip-bottom show position-absolute top-100 start-50 translate-middle-x" role="tooltip">
                  <span class="tooltip-arrow" style={{ left: "calc(50% - var(--bs-tooltip-arrow-width) / 2)" }} />
                  <span class="tooltip-inner d-block text-nowrap">{c.gloss}</span>
                </span>
              </Show>
            </span>{" "}
          </>
        )}
      </For>
    </div>
  );
}

function Turn(props: { turn: TurnOut; active: string | null; onTap: (key: string, text: string) => void }) {
  const turn = () => props.turn;
  return (
    <Show when={turn().role === "partner"} fallback={
      <div class="qa-turn qa-turn-learner align-self-end text-end" style={{ "max-width": "85%" }}>
        <div class="d-inline-flex align-items-center gap-2 p-2 rounded bg-primary-subtle">
          <Show when={turn().chunks} fallback={<span class="qa-turn-text">{turn().text}</span>}>
            {(chunks) => <ChunkLine class="qa-turn-text" chunks={chunks()} id={`t${turn().id}`} active={props.active} onTap={props.onTap} />}
          </Show>
          <Show when={turn().audioUrl}>{(u) => <PlayButton url={u()} class="btn-link p-0" />}</Show>
        </div>
        <div class="small text-body-secondary">
          <Show when={turn().source !== "own"}>{t(`speak.source.${turn().source as "suggestion" | "how" | "moved_on"}`)}</Show>
          <Show when={turn().level}>{(l) => <span class="qa-turn-level badge text-bg-secondary ms-2">{l()}</span>}</Show>
        </div>
      </div>
    }>
      <div class="qa-turn qa-turn-partner d-flex align-items-start gap-2 p-2 rounded bg-body-secondary" style={{ "max-width": "85%" }}>
        <PlayButton url={turn().audioUrl!} class="qa-turn-play" color="btn-outline-primary" />
        <ChunkLine class="qa-turn-text fs-5" chunks={turn().chunks!} id={`t${turn().id}`} active={props.active} onTap={props.onTap} />
      </div>
    </Show>
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
  const tap = (key: string, text: string) => {
    if (activeChunk() === key) return setActiveChunk(null);
    setActiveChunk(key);
    autoplay(`/api/conversations/${c().id}/say?text=${encodeURIComponent(text)}`);
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

  const send = (audio: string, mime: "audio/webm" | "audio/mp4") => run(async () => {
    setRecState("checking");
    setStep("sending");
    try {
      const res = await api.postStream<SpeakAttemptResult, { step: CheckStep }>(`/api/conversations/${c().id}/attempts`, {
        audio, mime, target: attempt()?.target ?? null, usedHow: how() !== null, taps: revealed().size,
      }, (e) => setStep(e.step));
      if (res.attempt.passed) {
        playResult(true);
        advance(res.turns, { reliance: res.reliance, spend: res.spend });
      } else {
        playWarning();
        update({ spend: res.spend });
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
        stream.getTracks().forEach((track) => track.stop());
        const reader = new FileReader();
        reader.onload = () => void send((reader.result as string).split(",")[1], mime);
        reader.readAsDataURL(new Blob(chunks, { type: mime }));
      };
      recorder.start();
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
  const setHardMode = (hardMode: boolean) => run(async () => {
    await api.put(`/api/conversations/${c().id}`, { hardMode });
    update({ hardMode });
  });

  return (
    <Show when={conv()}>
      <div class="d-flex flex-column gap-3">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <A href={`/${lang()}/speak`} class="btn btn-sm btn-outline-secondary" aria-label={t("speak.history")}><i class="bi bi-arrow-left" aria-hidden="true" /></A>
          <h1 class="qa-conversation-title h4 mb-0 me-auto">{c().title}</h1>
          <label class="form-check mb-0 small">
            <input type="checkbox" class="qa-conversation-hard form-check-input" checked={c().hardMode} onChange={(e) => void setHardMode(e.currentTarget.checked)} />
            <span class="form-check-label">{t("speak.hardMode")}</span>
          </label>
        </div>
        <div class="small text-body-secondary">{t("speak.tapHint")}</div>

        <div class="d-flex flex-column gap-3">
          <For each={c().turns}>{(turn) => <Turn turn={turn} active={activeChunk()} onTap={tap} />}</For>
        </div>

        <Show when={last().role === "learner"}>
          <button type="button" class="qa-partner-retry btn btn-outline-primary align-self-start" disabled={busy()} onClick={partnerRetry}>{t("speak.partnerRetry")}</button>
        </Show>

        <Show when={last().role === "partner"}>
          <div class="qa-reply d-flex flex-column gap-3 border-top pt-3">
            {/* Keyed, so each attempt gets a fresh report form. */}
            <Show when={attempt()} keyed fallback={
              <>
                <Show when={!c().hardMode}><div class="small fw-semibold">{t("speak.suggestions")}</div></Show>
                {/* The suggestions, then "How do I say...?" as the last option; hard mode leaves only that. */}
                <ul class="mb-0">
                  <Show when={!c().hardMode && last().suggestions}>
                    {(suggestions) => (
                      <For each={suggestions()}>
                        {(s, j) => <li class="qa-suggestion mb-1"><ChunkLine chunks={s} id={`t${last().id}-s${j()}`} active={activeChunk()} onTap={tap} /></li>}
                      </For>
                    )}
                  </Show>
                  <li>
                    <button type="button" class="qa-how-open btn btn-link p-0 align-baseline" onClick={() => setHowOpen(!howOpen())}>{t("speak.how")}</button>
                    <Show when={howOpen()}>
                      <form class="d-flex gap-2 mt-1" onSubmit={(e) => { e.preventDefault(); void askHow(); }}>
                        <input class="qa-how-text form-control form-control-sm" placeholder={t("speak.howPlaceholder")} value={howText()} onInput={(e) => setHowText(e.currentTarget.value)} />
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
              </>
            }>
              {(a) => <Retry attempt={a} conversationId={c().id} onElse={() => setAttempt(null)} onMoveOn={moveOn} busy={busy()} />}
            </Show>

            <Show when={recState() === "checking"} fallback={
              <button type="button" class="qa-record btn btn-lg align-self-start" classList={{ "btn-danger": recState() === "recording", "btn-outline-danger": recState() !== "recording" }}
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
          </div>
        </Show>

        <Show when={error()}>{(m) => <div class="qa-conversation-error alert alert-danger mb-0">{m()}</div>}</Show>

        <div class="d-flex flex-wrap gap-3 small text-body-secondary border-top pt-2">
          <span class="qa-cost">{t("speak.cost", { cost: usd(c().spend.conversation), today: usd(c().spend.today), cap: usd(c().spend.cap) })}</span>
          <span class="qa-replies">{t(c().reliance.of === 1 ? "speak.replies.one" : "speak.replies.other", { n: c().reliance.of })}</span>
          <span class="qa-hints">{t(c().reliance.leaned === 1 ? "speak.hints.one" : "speak.hints.other", { n: c().reliance.leaned })}</span>
        </div>
      </div>
    </Show>
  );
}

/** A failed reply: the sentence to say, what went wrong, and the ways out. */
function Retry(props: { attempt: SpeakAttemptOut; conversationId: number; onElse: () => void; onMoveOn: () => void; busy: boolean }) {
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
      <div>
        <div class="qa-retry-good-try text-orange fw-semibold">{t("speak.goodTry")}</div>
        <div class="small fw-semibold">{t("speak.sayThis")} <span class="qa-retry-tries fw-normal text-body-secondary">({t("speak.tries", { n: a().failures + 1 })})</span></div>
        <div class="d-flex align-items-center gap-2">
          <Show when={a().targetAudioUrl}>
            {(u) => <PlayButton url={u()} class="qa-retry-play-target" color="btn-outline-primary" />}
          </Show>
          <span class="qa-retry-target fs-4">{a().target}</span>
        </div>
        <div class="d-flex align-items-center gap-2 small text-body-secondary">
          <PlayButton url={a().audioUrl} class="qa-retry-play-own" color="btn-outline-secondary" />
          <span class="qa-retry-heard">{t("speak.youSaid", { text: a().transcript })}</span>
        </div>
      </div>
      <div class="qa-retry-feedback">{a().verdict.feedback}</div>
      <Show when={a().verdict.fixes.length}>
        <div>
          <div class="small fw-semibold">{t("speak.fixes")}</div>
          <ul class="mb-0">
            <For each={a().verdict.fixes}>
              {(f) => <li class="qa-retry-fix"><span class="letter-delete">{f.wrong}</span> → <span class="letter-insert">{f.right}</span> <span class="small text-body-secondary">{f.why}</span></li>}
            </For>
          </ul>
        </div>
      </Show>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="qa-retry-else btn btn-sm btn-link" onClick={props.onElse}>{t("speak.else")}</button>
        <button type="button" class="qa-retry-report-open btn btn-sm btn-link" onClick={() => setReportOpen(!reportOpen())}>{t("speak.report")}</button>
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
