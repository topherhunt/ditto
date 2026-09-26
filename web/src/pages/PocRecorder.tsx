import { createResource, createSignal, For, Show } from "solid-js";
import type { PocData, PocSentence, PocTake } from "../../../shared/api.ts";
import { api } from "../api.ts";

// Dev-only admin tool, so English-only: records takes for scripts/pronunciation-poc.ts (docs/conversation.md).

const player = new Audio();
const play = (url: string) => {
  player.src = url;
  void player.play();
};

/** The key of the take being recorded, so only one recording runs at a time. */
const [recording, setRecording] = createSignal<string | null>(null);
let recorder: MediaRecorder | null = null;

async function startRecording(key: string, onDone: (audio: string, mime: PocTake["mime"]) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Chrome and Firefox record WebM, Safari only MP4.
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
  const chunks: Blob[] = [];
  recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    setRecording(null);
    const reader = new FileReader();
    reader.onload = () => onDone((reader.result as string).split(",")[1], mime);
    reader.readAsDataURL(new Blob(chunks, { type: mime }));
  };
  recorder.start();
  setRecording(key);
}

function RecordButton(props: { slot: string; label: string; onDone: (audio: string, mime: PocTake["mime"]) => void; qa: string }) {
  const active = () => recording() === props.slot;
  const [error, setError] = createSignal<string | null>(null);
  // Until the mic opens (or its permission prompt is answered), a second click would start a second recording.
  const [starting, setStarting] = createSignal(false);
  const start = () => {
    setStarting(true);
    startRecording(props.slot, props.onDone).catch((e: Error) => setError(e.message)).finally(() => setStarting(false));
  };
  return (
    <>
      <button type="button" class={`${props.qa} btn btn-sm`} classList={{ "btn-danger": active(), "btn-outline-danger": !active() }}
        disabled={starting() || (recording() !== null && !active())}
        onClick={() => (active() ? recorder!.stop() : start())}>
        <i class={`bi ${active() ? "bi-stop-fill" : "bi-mic-fill"} me-1`} aria-hidden="true" />{active() ? "Stop" : props.label}
      </button>
      <Show when={error()}>{(m) => <span class="qa-poc-mic-error small text-danger">{m()}</span>}</Show>
    </>
  );
}

function Take(props: { take: PocTake; onChange: () => void }) {
  const [note, setNote] = createSignal(props.take.note);
  const url = () => `/api/admin/poc/audio/${encodeURIComponent(props.take.file)}`;
  return (
    <div class="qa-poc-take d-flex flex-wrap align-items-center gap-2">
      <button type="button" class="qa-poc-play-take btn btn-sm btn-outline-primary" onClick={() => play(url())}>▶ Play</button>
      <Show when={props.take.expect === "fail"}>
        <input class="qa-poc-note form-control form-control-sm flex-grow-1 w-auto" placeholder="What did you mispronounce?" value={note()}
          onInput={(e) => setNote(e.currentTarget.value)}
          onBlur={() => note() !== props.take.note && void api.put(`/api/admin/poc/takes/${encodeURIComponent(props.take.file)}`, { note: note() }).then(props.onChange)} />
      </Show>
      <button type="button" class="qa-poc-delete btn btn-sm btn-outline-secondary" aria-label="Delete take"
        onClick={() => void api.del(`/api/admin/poc/takes/${encodeURIComponent(props.take.file)}`).then(props.onChange)}>
        <i class="bi bi-trash" aria-hidden="true" />
      </button>
    </div>
  );
}

function Sentence(props: { sentence: PocSentence; takes: PocTake[]; onChange: () => void }) {
  const s = () => props.sentence;
  const correct = () => props.takes.find((t) => t.expect === "pass");
  const wrong = () => props.takes.filter((t) => t.expect === "fail");
  const [error, setError] = createSignal<string | null>(null);
  const save = (expect: PocTake["expect"]) => (audio: string, mime: PocTake["mime"]) =>
    api.post("/api/admin/poc/takes", { sentence: s().id, expect, mime, note: "", audio })
      .then(() => { setError(null); props.onChange(); }, (e: Error) => setError(e.message));
  return (
    <li class={`qa-poc-sentence qa-poc-${s().id} list-group-item d-flex flex-column gap-2`} data-silent>
      <div class="d-flex align-items-center gap-2">
        <span class="badge text-bg-secondary text-uppercase">{s().lang}</span>
        <span class="fs-5">{s().text}</span>
        <Show when={s().ttsUrl} fallback={<span class="small text-danger">no course audio</span>}>
          {(u) => <button type="button" class="qa-poc-play-native btn btn-sm btn-outline-secondary ms-auto" onClick={() => play(u())}>▶ Native</button>}
        </Show>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="small fw-semibold" style={{ width: "6rem" }}>Correct</span>
        <Show when={correct()} fallback={<RecordButton slot={`${s().id}-pass`} label="Record" qa="qa-poc-record-correct" onDone={save("pass")} />}>
          {(t) => (
            <>
              <Take take={t()} onChange={props.onChange} />
              <RecordButton slot={`${s().id}-pass`} label="Re-record" qa="qa-poc-record-correct" onDone={save("pass")} />
            </>
          )}
        </Show>
      </div>

      <div class="d-flex flex-column gap-2">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <span class="small fw-semibold" style={{ width: "6rem" }}>Mispronounced</span>
          <RecordButton slot={`${s().id}-fail`} label={wrong().length ? "Record another" : "Record"} qa="qa-poc-record-wrong" onDone={save("fail")} />
          <span class="small text-body-secondary">Try: {s().suggestion}</span>
        </div>
        <For each={wrong()}>{(t) => <Take take={t} onChange={props.onChange} />}</For>
      </div>
      <Show when={error()}>{(m) => <div class="qa-poc-error small text-danger">{m()}</div>}</Show>
    </li>
  );
}

export function PocRecorder() {
  const [data, { refetch }] = createResource(() => api.get<PocData>("/api/admin/poc"));
  const done = () => data()!.sentences.filter((s) => data()!.takes.some((t) => t.sentence === s.id && t.expect === "pass")).length;
  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0">Pronunciation POC recorder</h1>
      <p class="mb-0 text-body-secondary">
        For each sentence, record a careful correct take and one or more deliberately mispronounced takes, noting what you got wrong.
        Takes save to <code>data/poc/</code>; then run <code>node --env-file=.env scripts/pronunciation-poc.ts data/poc</code>.
      </p>
      <Show when={data.error}>{(e) => <div class="qa-poc-load-error alert alert-danger">{(e() as Error).message}</div>}</Show>
      <Show when={data()}>
        {(d) => (
          <>
            <div class="qa-poc-progress small">
              {done()} / {d().sentences.length} correct takes, {d().takes.filter((t) => t.expect === "fail").length} mispronounced takes
            </div>
            <ul class="list-group">
              <For each={d().sentences}>
                {(s) => <Sentence sentence={s} takes={d().takes.filter((t) => t.sentence === s.id)} onChange={refetch} />}
              </For>
            </ul>
          </>
        )}
      </Show>
    </div>
  );
}
