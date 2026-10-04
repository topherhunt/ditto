import { useNavigate, useSearchParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { FEEDBACK_MESSAGE_MAX, FEEDBACK_TAGS, type FeedbackOut, type FeedbackTag } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { MoodFaces } from "../components/MoodFaces.tsx";
import { safeFrom, setFeedbackThanks } from "../feedback.ts";
import { t } from "../i18n/index.ts";
import { homeLanguage } from "../learning.ts";
import { me } from "../session.ts";
import { routes } from "../routes.ts";

/** Structured prompts plus a free-text box, all optional. `?id=` continues a mood saved from the dashboard card; `?from=` is the route the learner came from. */
export function Feedback() {
  const [params] = useSearchParams();
  const id = () => (typeof params.id === "string" ? Number(params.id) : null);
  const [saved] = createResource(id, (i) => api.get<FeedbackOut>(`/api/feedback/${i}`));
  return (
    <Show when={id() === null || saved()}>
      <FeedbackForm saved={saved()} from={safeFrom(params.from)} />
    </Show>
  );
}

function FeedbackForm(props: { saved: FeedbackOut | undefined; from: string }) {
  const navigate = useNavigate();
  const [mood, setMood] = createSignal<number | null>(props.saved?.mood ?? null);
  const [tags, setTags] = createSignal<FeedbackTag[]>(props.saved?.tags ?? []);
  const [message, setMessage] = createSignal(props.saved?.message ?? "");
  const [mayContact, setMayContact] = createSignal(props.saved?.mayContact ?? false);
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const empty = () => mood() === null && tags().length === 0 && message().trim() === "";
  const home = () => routes.dashboard({ lang: homeLanguage(me()!.learning) });

  const toggle = (tag: FeedbackTag) => setTags(tags().includes(tag) ? tags().filter((x) => x !== tag) : [...tags(), tag]);
  const send = async () => {
    setSending(true);
    setError(null);
    const body = { mood: mood(), tags: tags(), message: message(), mayContact: mayContact() };
    try {
      if (props.saved) await api.put(`/api/feedback/${props.saved.id}`, body);
      else await api.post("/api/feedback", { ...body, page: props.from });
      setFeedbackThanks(true);
      navigate(home());
    } catch (e) {
      setError(t("feedback.failed", { error: (e as Error).message }));
      setSending(false);
    }
  };
  const chips = (group: keyof typeof FEEDBACK_TAGS, question: string) => (
    <fieldset class={`qa-feedback-${group} d-flex flex-column gap-2`}>
      <legend class="h6 mb-0">{question}</legend>
      <div class="d-flex flex-wrap gap-2">
        <For each={FEEDBACK_TAGS[group]}>
          {(tag) => (
            <button type="button" class={`qa-feedback-tag-${tag} btn btn-sm rounded-pill`} classList={{ "btn-primary": tags().includes(tag), "btn-outline-secondary": !tags().includes(tag) }}
              aria-pressed={tags().includes(tag)} onClick={() => toggle(tag)}>{t(`feedback.tag.${tag}` as "feedback.tag.bugs")}</button>
          )}
        </For>
      </div>
    </fieldset>
  );

  return (
    <div class="qa-feedback d-flex flex-column gap-4" style={{ "max-width": "32rem" }}>
      <div class="d-flex flex-column gap-1">
        <h1 class="h4 mb-0">{t("feedback.title")}</h1>
        <p class="text-body-secondary mb-0">{t("feedback.intro")}</p>
      </div>
      <div class="d-flex flex-column gap-2">
        <h2 class="h6 mb-0">{t("feedback.moodQ")}</h2>
        <MoodFaces value={mood()} onPick={setMood} />
      </div>
      {chips("struggle", t("feedback.struggleQ"))}
      {chips("wish", t("feedback.wishQ"))}
      <label class="d-flex flex-column gap-2">
        <span class="h6 mb-0">{t("feedback.messageQ")}</span>
        <textarea class="qa-feedback-message form-control" rows="5" maxLength={FEEDBACK_MESSAGE_MAX} value={message()} onInput={(e) => setMessage(e.currentTarget.value)} />
      </label>
      <div>
        <div class="form-check">
          <input class="qa-feedback-contact form-check-input" type="checkbox" id="feedback-contact" checked={mayContact()} onChange={(e) => setMayContact(e.currentTarget.checked)} />
          <label class="form-check-label" for="feedback-contact">{t("feedback.contact")}</label>
        </div>
        <div class="small text-body-secondary">{t("feedback.contactHelp")}</div>
      </div>
      <Show when={error()}>{(m) => <div class="qa-feedback-error text-danger small">{m()}</div>}</Show>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="qa-feedback-send btn btn-primary" disabled={empty() || sending()} onClick={send}>{t("feedback.send")}</button>
        <button type="button" class="qa-feedback-cancel btn btn-outline-secondary" onClick={() => navigate(home())}>{t("feedback.cancel")}</button>
      </div>
    </div>
  );
}
