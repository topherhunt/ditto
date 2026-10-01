import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { LEARNER_LEVELS, SPEAK_LANGUAGES, STARTERS, type Config, type LearnerLevel, type Starter, type ConversationOut, type ConversationsOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { ActivityHeader } from "../components/ActivityHeader.tsx";
import { t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";
import { useLang } from "./lang.ts";
import { unlockPlayer } from "./player.ts";

/** Language-neutral, so it lives here rather than in each locale file. */
const STARTER_EMOJI: Record<Starter, string> = {
  cafe: "☕", directions: "🧭", hotel: "🏨", meeting: "👋", market: "🍅", weekend: "🏖️",
  pharmacy: "💊", train: "🚆", reservation: "📞", doctor: "🩺", clothes: "👕", taxi: "🚕", neighbor: "🏡", interview: "💼", hobbies: "🎸", airport: "✈️", lostitem: "🧳", movies: "🎬", apartment: "🔑", birthday: "🎂",
};

const SHOWN_STARTERS = 7;

/** A fresh random pick of the pool, so the page doesn't always offer the same scenarios. */
const pickStarters = (): Starter[] => [...STARTERS].sort(() => Math.random() - 0.5).slice(0, SHOWN_STARTERS);

export function Speak() {
  const lang = useLang();
  const navigate = useNavigate();
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [data] = createResource(lang, (l) => api.get<ConversationsOut>(`/api/conversations?lang=${l}`));
  const prefs = () => me()!.prefs[lang()];
  /** The learner's self-rated level, which the dashboard asks for; A1 until they answer. */
  const level = () => prefs().level ?? "A1";
  const starters = pickStarters();
  const [hardMode, setHardMode] = createSignal(false);
  const [topic, setTopic] = createSignal("");
  const [starting, setStarting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const supported = () => (SPEAK_LANGUAGES as readonly string[]).includes(lang());

  const start = async (scenario: { starter: Starter } | { topic: string } | { surprise: true }) => {
    setStarting(true);
    setError(null);
    unlockPlayer();
    try {
      const conv = await api.post<ConversationOut>("/api/conversations", { language: lang(), level: level(), scenario, hardMode: hardMode() });
      navigate(`/${lang()}/talk/${conv.id}`, { state: { opened: true } });
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  };
  const pickLevel = async (l: LearnerLevel) => {
    setError(null);
    try {
      await api.put("/api/prefs", { language: lang(), prefs: { ...prefs(), level: l } });
      await refetchMe();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div class="d-flex flex-column gap-4">
      <Show when={data()}>{(d) => <ActivityHeader activity="talk" lang={lang()} fresh={d().conversations.length === 0} />}</Show>
      <Show when={config() && (!config()!.speak || !supported())}>
        <div class="qa-speak-off alert alert-secondary mb-0">{t("speak.off")}</div>
      </Show>
      <Show when={config()?.speak && supported()}>
        <section class="d-flex flex-column gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <label class="d-flex align-items-center gap-2">
              {t("speak.level")}
              <select class="qa-speak-level form-select form-select-sm w-auto" value={level()} onChange={(e) => void pickLevel(e.currentTarget.value as LearnerLevel)}>
                <For each={LEARNER_LEVELS}>{(l) => <option value={l}>{l}</option>}</For>
              </select>
            </label>
            <label class="form-check mb-0">
              <input type="checkbox" class="qa-speak-hard form-check-input" checked={hardMode()} onChange={(e) => setHardMode(e.currentTarget.checked)} />
              <span class="form-check-label">{t("speak.hardMode")}</span>
            </label>
          </div>
          <div>
            <h2 class="h6">{t("speak.starters")}</h2>
            <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 justify-content-center g-2">
              <For each={starters}>
                {(s) => <div class="col"><button type="button" class={`qa-speak-starter qa-speak-starter-${s} btn btn-outline-primary w-100 h-100`} disabled={starting()} onClick={() => start({ starter: s })}><span aria-hidden="true">{STARTER_EMOJI[s]}</span> {t(`speak.starter.${s}`)}</button></div>}
              </For>
              <div class="col">
                <button type="button" class="qa-speak-surprise btn btn-outline-secondary w-100 h-100" disabled={starting()} onClick={() => start({ surprise: true })}>
                  <span aria-hidden="true">🎲</span> {t("speak.surprise")}
                </button>
              </div>
            </div>
          </div>
          <form class="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); void start({ topic: topic() }); }}>
            <input class="qa-speak-topic form-control" placeholder={t("speak.topicPlaceholder")} aria-label={t("speak.topic")} value={topic()} onInput={(e) => setTopic(e.currentTarget.value)} />
            <button type="submit" class="qa-speak-topic-start btn btn-primary" disabled={starting() || !topic().trim()}>{t("speak.start")}</button>
          </form>
          <Show when={starting()}><div class="qa-speak-starting text-body-secondary">{t("speak.starting")}</div></Show>
          <Show when={error()}>{(m) => <div class="qa-speak-error alert alert-danger mb-0">{m()}</div>}</Show>
        </section>
      </Show>

      <Show when={data()}>
        {(d) => (
          <>
            <section>
              <h2 class="h5"><i class="bi bi-clock-history me-2" aria-hidden="true" />{t("speak.history")}</h2>
              <Show when={d().conversations.length} fallback={<p class="text-body-secondary">{t("speak.noHistory")}</p>}>
                <ul class="list-group">
                  <For each={d().conversations}>
                    {(c) => (
                      <li class="qa-speak-history list-group-item d-flex flex-wrap align-items-center gap-2">
                        <A href={`/${lang()}/talk/${c.id}`} class="me-auto">{c.title}</A>
                        <For each={c.levels.slice(-3)}>{(l) => <span class="badge text-bg-secondary">{l}</span>}</For>
                        <span class="small text-body-secondary">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>
            <Show when={d().weakPhrases.length}>
              <section>
                <h2 class="h5">{t("speak.weak")}</h2>
                <ul class="list-unstyled mb-0">
                  <For each={d().weakPhrases}>{(w) => <li class="qa-speak-weak">{w.text}</li>}</For>
                </ul>
              </section>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}
