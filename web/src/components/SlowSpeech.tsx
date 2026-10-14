import { Show } from "solid-js";
import { SLOW_TALK_RATE } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";

/** The playback rate for the partner's voice in Talk, from the learner's setting for `lang`. */
export const talkRate = (lang: Language) => (me()!.prefs[lang].slowTalk ? SLOW_TALK_RATE : 1);

/** The "Slow speech" checkbox, on the Talk page and in a conversation; it saves the course's prefs at once. */
export function SlowSpeechToggle(props: { lang: Language; onError: (message: string) => void; hint?: boolean }) {
  const toggle = async (on: boolean) => {
    try {
      await api.put("/api/prefs", { language: props.lang, prefs: { ...me()!.prefs[props.lang], slowTalk: on } });
      await refetchMe();
    } catch (e) {
      props.onError((e as Error).message);
    }
  };
  return (
    <div>
      <label class="form-check mb-0">
        <input type="checkbox" class="qa-speak-slow form-check-input" checked={me()!.prefs[props.lang].slowTalk} onChange={(e) => void toggle(e.currentTarget.checked)} />
        <span class="form-check-label">{t("speak.slowSpeech")}</span>
      </label>
      <Show when={props.hint}><div class="form-text">{t("speak.slowSpeechHint")}</div></Show>
    </div>
  );
}
