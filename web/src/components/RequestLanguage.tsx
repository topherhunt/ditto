import TomSelect from "tom-select";
import "tom-select/dist/css/tom-select.bootstrap5.css";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { REQUEST_LANGUAGES, type RequestLanguage } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { locale, t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

/** A select whose options can be filtered by typing, for lists too long to scroll. `value` "" means nothing chosen. */
function FilterSelect(props: { class: string; value: string; onChange: (v: string) => void; placeholder: string; options: { code: string; name: string }[] }) {
  let select!: HTMLSelectElement;
  let ts!: TomSelect;
  onMount(() => {
    ts = new TomSelect(select, { maxOptions: null, openOnFocus: true, onChange: (v: string) => props.onChange(v) });
    onCleanup(() => ts.destroy());
  });
  createEffect(() => {
    if (ts.getValue() !== props.value) ts.setValue(props.value, true);
  });
  return (
    <select ref={select} class={props.class} value={props.value} data-placeholder={props.placeholder}>
      <option value="">{props.placeholder}</option>
      <For each={props.options}>{(o) => <option value={o.code}>{o.name}</option>}</For>
    </select>
  );
}

/** A small link that opens a popup asking, anonymously, which language the visitor speaks best and which they want to learn. It changes nothing about their account. */
export function RequestLanguageLink(props: { label?: string; class?: string }) {
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
    <label class={`${cls} form-label mb-0 d-block`}>
      {label}
      <FilterSelect class="form-select" value={value()} onChange={set} placeholder={t("request.choose")} options={options()} />
    </label>
  );

  return (
    <>
      <button type="button" class={`qa-request-language ${props.class ?? ""} btn btn-link link-secondary p-0 align-baseline small`} onClick={show}>{props.label ?? t("welcome.requestLanguage")}</button>
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
