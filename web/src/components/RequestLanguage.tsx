import { createMemo, createSignal, For, Show } from "solid-js";
import { REQUEST_LANGUAGES, type RequestLanguage } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { locale, t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

/** A small link that opens a popup asking, anonymously, which language the visitor speaks best and which they want to learn. It changes nothing about their account. */
export function RequestLanguageLink() {
  const [open, setOpen] = createSignal(false);
  const [spoken, setSpoken] = createSignal("");
  const [wanted, setWanted] = createSignal("");
  const [sent, setSent] = createSignal(false);
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const options = createMemo(() => {
    const names = new Intl.DisplayNames(locale(), { type: "language" });
    const named = REQUEST_LANGUAGES.filter((l) => l !== "other").map((l) => ({ code: l, name: names.of(l)! }));
    named.sort((a, b) => a.name.localeCompare(b.name, locale()));
    return [...named, { code: "other" as RequestLanguage, name: t("request.other") }];
  });

  const show = () => { setSpoken(""); setWanted(""); setSent(false); setError(null); setOpen(true); };
  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api.post("/api/language-requests", { spoken: spoken(), wanted: wanted() });
      setSent(true);
    } catch (e) {
      setError(t("request.failed", { error: (e as Error).message }));
    } finally {
      setSending(false);
    }
  };
  const picker = (cls: string, label: string, value: () => string, set: (v: string) => void) => (
    <label class="form-label mb-0 d-block">
      {label}
      <select class={`${cls} form-select`} value={value()} onChange={(e) => set(e.currentTarget.value)}>
        <option value="" disabled>{t("request.choose")}</option>
        <For each={options()}>{(o) => <option value={o.code}>{o.name}</option>}</For>
      </select>
    </label>
  );

  return (
    <>
      <button type="button" class="qa-request-language btn btn-link link-secondary p-0 align-baseline small" onClick={show}>{t("welcome.requestLanguage")}</button>
      <Popup open={open()} onClose={() => setOpen(false)} title={t("request.title")}
        footer={
          <>
            <button type="button" class="qa-request-close btn btn-outline-secondary" onClick={() => setOpen(false)}>{t("request.close")}</button>
            <Show when={!sent()}>
              <button type="button" class="qa-request-send btn btn-primary" disabled={!spoken() || !wanted() || sending()} onClick={send}>{t("request.send")}</button>
            </Show>
          </>
        }>
        <Show when={!sent()} fallback={<p class="qa-request-thanks mb-0">{t("request.thanks")}</p>}>
          <div class="d-flex flex-column gap-3">
            <p class="mb-0">{t("request.intro")}</p>
            {picker("qa-request-spoken", t("request.spoken"), spoken, setSpoken)}
            {picker("qa-request-wanted", t("request.wanted"), wanted, setWanted)}
            <p class="small text-body-secondary mb-0">{t("request.anonymous")}</p>
            <Show when={error()}>{(m) => <div class="qa-request-error text-danger small">{m()}</div>}</Show>
          </div>
        </Show>
      </Popup>
    </>
  );
}
