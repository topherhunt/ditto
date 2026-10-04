import { A } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { FEEDBACK_TAGS, type AdminFeedback, type AdminFeedbackOut, type FeedbackTag } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { AdminCrumb } from "../components/AdminCrumb.tsx";
import { MOOD_ICONS, MOODS_HAPPIEST_FIRST } from "../feedback.ts";
import { en } from "../i18n/en.ts";
import { routes } from "../routes.ts";

// Admin-only, so English-only: tag labels come from the English dictionary.

const label = (tag: FeedbackTag) => en[`feedback.tag.${tag}` as "feedback.tag.bugs"];

/** What learners said in the feedback form: how it's going, what's in the way, what they want, and their own words. Unhandled first. */
export function FeedbackAdmin() {
  const [data, { refetch }] = createResource(() => api.get<AdminFeedbackOut>("/api/admin/feedback"));
  const [tag, setTag] = createSignal<FeedbackTag | null>(null);
  const [unhandledOnly, setUnhandledOnly] = createSignal(false);
  const shown = createMemo(() => (data()?.items ?? []).filter((i) => (!tag() || i.tags.includes(tag()!)) && (!unhandledOnly() || !i.handledAt)));
  const count = (kind: keyof typeof FEEDBACK_TAGS) => (data()?.tags ?? []).filter((x) => (FEEDBACK_TAGS[kind] as readonly string[]).includes(x.tag));

  const ranking = (kind: keyof typeof FEEDBACK_TAGS, title: string) => (
    <div class={`qa-feedback-rank-${kind} col-12 col-sm-6`}>
      <h2 class="h6">{title}</h2>
      <div class="d-flex flex-wrap gap-2">
        <For each={count(kind)} fallback={<span class="text-body-secondary small">None yet.</span>}>
          {(x) => (
            <button type="button" class={`qa-feedback-filter-${x.tag} btn btn-sm rounded-pill`} classList={{ "btn-primary": tag() === x.tag, "btn-outline-secondary": tag() !== x.tag }}
              onClick={() => setTag(tag() === x.tag ? null : x.tag)}>{label(x.tag)} <span class="badge text-bg-light">{x.count}</span></button>
          )}
        </For>
      </div>
    </div>
  );

  async function handle(f: AdminFeedback, handled: boolean, note: string) {
    await api.post(`/api/admin/feedback/${f.id}`, { handled, note });
    await refetch();
  }

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0"><AdminCrumb>Feedback</AdminCrumb></h1>
      <Show when={data()}>
        {(d) => (
          <>
            <div class="qa-feedback-moods d-flex flex-wrap gap-3 fs-5">
              <For each={MOODS_HAPPIEST_FIRST}>{(mood) => <span><i class={`bi bi-${MOOD_ICONS[mood - 1]} me-1`} aria-hidden="true" /><span class={`qa-feedback-mood-count-${mood}`}>{d().moods[mood - 1]}</span></span>}</For>
            </div>
            <div class="row g-3">
              {ranking("struggle", "What's getting in the way")}
              {ranking("wish", "What they'd love to see")}
            </div>
            <div class="form-check form-switch">
              <input class="qa-feedback-unhandled form-check-input" type="checkbox" role="switch" id="unhandled-only" checked={unhandledOnly()} onChange={(e) => setUnhandledOnly(e.currentTarget.checked)} />
              <label class="form-check-label" for="unhandled-only">Unhandled only</label>
            </div>
            <Show when={shown().length > 0} fallback={<p class="qa-feedback-empty mb-0">No feedback.</p>}>
              <ul class="list-group">
                <For each={shown()}>{(f) => <Item f={f} onHandle={handle} />}</For>
              </ul>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}

function Item(props: { f: AdminFeedback; onHandle: (f: AdminFeedback, handled: boolean, note: string) => Promise<void> }) {
  const [note, setNote] = createSignal(props.f.adminNote ?? "");
  const f = () => props.f;
  return (
    <li class="qa-feedback-item list-group-item d-flex flex-column gap-2" classList={{ "text-body-secondary": f().handledAt !== null }}>
      <div class="d-flex flex-wrap gap-2 align-items-baseline">
        <Show when={f().mood}>{(m) => <i class={`bi bi-${MOOD_ICONS[m() - 1]} fs-4`} aria-hidden="true" />}</Show>
        <A href={routes.adminUser({ id: f().user.id })}>{f().user.username ?? <em>no username</em>}</A>
        <Show when={f().email}>{(e) => <a class="small" href={`mailto:${e()}`}>{e()}</a>}</Show>
        <span class="small text-body-secondary ms-auto">{f().page} · {f().locale} · {new Date(f().createdAt).toLocaleString()}</span>
      </div>
      <Show when={f().tags.length}>
        <div class="d-flex flex-wrap gap-1"><For each={f().tags}>{(tag) => <span class="badge text-bg-secondary">{label(tag)}</span>}</For></div>
      </Show>
      <Show when={f().message}><p class="qa-feedback-text mb-0" style={{ "white-space": "pre-wrap" }}>{f().message}</p></Show>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <input class="qa-feedback-note form-control form-control-sm w-auto flex-grow-1" placeholder="Note" value={note()} onInput={(e) => setNote(e.currentTarget.value)} />
        <Show when={f().handledAt} fallback={<button type="button" class="qa-feedback-handle btn btn-sm btn-outline-success" onClick={() => props.onHandle(f(), true, note())}>Mark handled</button>}>
          <button type="button" class="qa-feedback-reopen btn btn-sm btn-outline-secondary" onClick={() => props.onHandle(f(), false, note())}>Reopen</button>
        </Show>
      </div>
    </li>
  );
}
