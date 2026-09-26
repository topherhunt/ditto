import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, For, onCleanup, Show } from "solid-js";
import {
  MOVE_ON_AFTER, type Chunk, type ConversationOut, type HowOut, type MoveOnResult, type SpeakAttemptOut, type SpeakAttemptResult, type TurnOut,
} from "../../../shared/api.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { usd } from "./Speak.tsx";

const player = new Audio();
const play = (url: string) => {
  player.src = url;
  return player.play();
};

/** Tappable chunks; the tapped one shows its gloss in a tooltip below it. Bootstrap's tooltip classes, positioned without its JS. */
function ChunkLine(props: { chunks: Chunk[]; id: string; active: string | null; onTap: (key: string) => void; class?: string }) {
  const key = (i: number) => `${props.id}-${i}`;
  return (
    <div class={props.class}>
      <For each={props.chunks}>
        {(c, i) => (
          <>
            <span class="qa-chunk chunk position-relative px-1" classList={{ active: props.active === key(i()) }} onClick={() => props.onTap(key(i()))}>
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

function Turn(props: { turn: TurnOut; active: string | null; onTap: (key: string) => void }) {
  const turn = () => props.turn;
  return (
    <Show when={turn().role === "partner"} fallback={
      <div class="qa-turn qa-turn-learner align-self-end text-end" style={{ "max-width": "85%" }}>
        <div class="d-inline-flex align-items-center gap-2 p-2 rounded bg-primary-subtle">
          <span class="qa-turn-text">{turn().text}</span>
          <Show when={turn().audioUrl}>{(u) => <button type="button" class="btn btn-sm btn-link p-0" aria-label={t("speak.play")} onClick={() => void play(u())}><i class="bi bi-play-circle" aria-hidden="true" /></button>}</Show>
        </div>
        <div class="small text-body-secondary">
          <Show when={turn().source !== "own"}>{t(`speak.source.${turn().source as "suggestion" | "how" | "moved_on"}`)}</Show>
          <Show when={turn().level}>{(l) => <span class="qa-turn-level badge text-bg-secondary ms-2">{l()}</span>}</Show>
        </div>
      </div>
    }>
      <div class="qa-turn qa-turn-partner d-flex align-items-start gap-2 p-2 rounded bg-body-secondary" style={{ "max-width": "85%" }}>
        <button type="button" class="qa-turn-play btn btn-sm btn-outline-primary" aria-label={t("speak.play")} onClick={() => void play(turn().audioUrl!)}>▶</button>
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
  /** Chunks tapped since the learner's last turn; their count is sent as `taps`. */
  const [revealed, setRevealed] = createSignal(new Set<string>());
  const [recState, setRecState] = createSignal<RecState>("idle");
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
  const tap = (key: string) => {
    setActiveChunk(activeChunk() === key ? null : key);
    setRevealed((s) => new Set(s).add(key));
  };
  const closeTooltip = (e: MouseEvent) => {
    if (!(e.target as Element).closest(".chunk")) setActiveChunk(null);
  };
  document.addEventListener("click", closeTooltip);
  onCleanup(() => document.removeEventListener("click", closeTooltip));
  const update = (patch: Partial<ConversationOut>, turns: TurnOut[] = []) => mutate({ ...c(), ...patch, turns: [...c().turns, ...turns] });
  /** A new turn clears the reply in progress and speaks the partner's answer. */
  const advance = (turns: TurnOut[], patch: Partial<ConversationOut>) => {
    update(patch, turns);
    setAttempt(null);
    setHow(null);
    setHowText("");
    setHowOpen(false);
    setRevealed(new Set<string>());
    const partner = turns.find((x) => x.role === "partner");
    // Autoplay can be refused without a recent click; the play button is still there.
    if (partner) play(partner.audioUrl!).catch(() => {});
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
    try {
      const res = await api.post<SpeakAttemptResult>(`/api/conversations/${c().id}/attempts`, {
        audio, mime, target: attempt()?.target ?? null, usedHow: how() !== null, taps: revealed().size,
      });
      if (res.attempt.passed) advance(res.turns, { reliance: res.reliance, spend: res.spend });
      else {
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
    const res = await api.post<{ turn: TurnOut; spend: ConversationOut["spend"] }>(`/api/conversations/${c().id}/partner`);
    advance([res.turn], { spend: res.spend });
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

            <div class="d-flex align-items-center gap-2">
              <button type="button" class="qa-record btn btn-lg" classList={{ "btn-danger": recState() === "recording", "btn-outline-danger": recState() !== "recording" }}
                disabled={busy() || recState() === "starting" || recState() === "checking"}
                onClick={() => (recState() === "recording" ? recorder!.stop() : void record())}>
                <i class={`bi ${recState() === "recording" ? "bi-stop-fill" : "bi-mic-fill"} me-1`} aria-hidden="true" />
                {recState() === "recording" ? t("speak.stop") : attempt() ? t("speak.recordAgain") : t("speak.record")}
              </button>
              <Show when={recState() === "checking"}><span class="qa-checking text-body-secondary">{t("speak.checking")}</span></Show>
            </div>
          </div>
        </Show>

        <Show when={error()}>{(m) => <div class="qa-conversation-error alert alert-danger mb-0">{m()}</div>}</Show>

        <div class="d-flex flex-wrap gap-3 small text-body-secondary border-top pt-2">
          <span class="qa-cost">{t("speak.cost", { cost: usd(c().spend.conversation), today: usd(c().spend.today), cap: usd(c().spend.cap) })}</span>
          <Show when={c().reliance.of > 0}>
            <span class="qa-reliance">{t("speak.reliance", { n: c().reliance.leaned, of: c().reliance.of })}</span>
          </Show>
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
  const badWords = () => a().verdict.words.filter((w) => !w.ok);
  return (
    <div class="qa-retry d-flex flex-column gap-2">
      <div>
        <div class="small fw-semibold">{t("speak.sayThis")} <span class="qa-retry-tries fw-normal text-body-secondary">({t("speak.tries", { n: a().failures + 1 })})</span></div>
        <div class="d-flex align-items-center gap-2">
          <Show when={a().targetAudioUrl}>
            {(u) => <button type="button" class="qa-retry-play-target btn btn-sm btn-outline-primary" aria-label={t("speak.play")} onClick={() => void play(u())}>▶</button>}
          </Show>
          <span class="qa-retry-target fs-4">{a().target}</span>
        </div>
        <div class="qa-retry-heard small text-body-secondary">{t("speak.youSaid", { text: a().transcript })}</div>
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
      <Show when={badWords().length}>
        <div>
          <div class="small fw-semibold">{t("speak.sounds")}</div>
          <ul class="mb-0">
            <For each={badWords()}>
              {(w) => <li class="qa-retry-sound"><span class="fw-semibold">{w.word}:</span> {w.hint}</li>}
            </For>
          </ul>
        </div>
      </Show>
      <details class="small">
        <summary>{t("speak.details")}</summary>
        <div class="d-flex flex-column gap-1 mt-1">
          <div><span class="fw-semibold">{t("speak.heard")}:</span> <span class="qa-retry-ipa-heard font-mono">{a().heard}</span></div>
          <div><span class="fw-semibold">{t("speak.native")}:</span> <span class="font-mono">{a().native}</span></div>
          <button type="button" class="btn btn-sm btn-outline-secondary align-self-start" onClick={() => void play(a().audioUrl)}>▶ {t("speak.play")}</button>
        </div>
      </details>
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
