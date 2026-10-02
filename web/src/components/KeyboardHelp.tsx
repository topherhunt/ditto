import { createSignal, For } from "solid-js";
import type { Language } from "../../../shared/content.ts";
import type { Key } from "../i18n/en.ts";
import { languageInSentence, t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

type Platform = "ios" | "android" | "mac" | "windows";

const STEPS: Record<Platform, { name: string; steps: Key }> = {
  ios: { name: "iPhone / iPad", steps: "help.keyboard.ios" },
  android: { name: "Android", steps: "help.keyboard.android" },
  mac: { name: "Mac", steps: "help.keyboard.mac" },
  windows: { name: "Windows", steps: "help.keyboard.windows" },
};

/** An iPad in desktop mode reports a Mac user agent, so touch points tell them apart. */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return /Macintosh/.test(ua) ? "mac" : "windows";
}

/** The typing help's note for a course in another alphabet: how to get its keyboard, with step-by-step instructions per device in a popup. */
export function KeyboardHelp(props: { lang: Language }) {
  const [open, setOpen] = createSignal(false);
  const platform = detectPlatform();
  const mobile = platform === "ios" || platform === "android";
  const order = [platform, ...(Object.keys(STEPS) as Platform[]).filter((p) => p !== platform)];
  const language = () => languageInSentence(props.lang);
  return (
    <>
      <strong>{t("help.keyboard.lead")}</strong> {t(mobile ? "help.keyboard.mobile" : "help.keyboard.desktop", { language: language() })}{" "}
      <button type="button" class="qa-keyboard-help-open btn btn-link btn-sm p-0 align-baseline" onClick={() => setOpen(true)}>{t("help.keyboard.how")}</button>
      <Popup open={open()} onClose={() => setOpen(false)} title={t("help.keyboard.title", { language: language() })} class="qa-keyboard-popup"
        footer={<button type="button" class="qa-keyboard-popup-close btn btn-primary" onClick={() => setOpen(false)}>{t("help.gotIt")}</button>}>
        <div class="d-flex flex-column gap-3">
          <For each={order}>{(p) => (
            <div class={`qa-keyboard-step qa-keyboard-${p}`}>
              <h3 class="h6 mb-1">{STEPS[p].name}</h3>
              <p class="mb-0">{t(STEPS[p].steps, { language: language() })}</p>
            </div>
          )}</For>
        </div>
      </Popup>
    </>
  );
}
