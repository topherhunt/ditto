import { createEffect, createResource, createSignal, For, onMount, Show } from "solid-js";
import type { Config } from "../../../shared/api.ts";
import { LOCALES, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { locale, LOCALE_LABELS, setLocale, t } from "../i18n/index.ts";
import { refetchMe } from "../session.ts";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(opts: { client_id: string; callback: (r: { credential: string }) => void }): void;
          renderButton(el: HTMLElement, opts: Record<string, string>): void;
        };
      };
    };
  }
}

function GoogleButton(props: { clientId: string; onError: (m: string) => void }) {
  let el!: HTMLDivElement;
  const [loaded, setLoaded] = createSignal(false);
  onMount(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onerror = () => props.onError(t("login.googleFailed"));
    script.onload = () => {
      window.google!.accounts.id.initialize({
        client_id: props.clientId,
        callback: ({ credential }) =>
          api.post("/api/auth/google", { credential, locale: locale() }).then(refetchMe, (e: Error) => props.onError(e.message)),
      });
      setLoaded(true);
    };
    document.head.append(script);
  });
  // Re-render on a locale change so the button's own label follows the picker.
  createEffect(() => {
    if (!loaded()) return;
    el.replaceChildren();
    window.google!.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "signin_with", locale: locale() });
  });
  // Google's iframe declares no color-scheme, so under our dark scheme the browser paints it an opaque white backdrop.
  return <div ref={el} class="qa-google-signin" style={{ "color-scheme": "light" }} />;
}

export function Login() {
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [error, setError] = createSignal<string | null>(null);
  const [email, setEmail] = createSignal("dev@example.com");

  return (
    <div class="container py-5" style={{ "max-width": "28rem" }}>
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h1 class="h3 mb-0">Ditto</h1>
        <select class="qa-login-locale form-select form-select-sm w-auto" aria-label={t("login.language")} value={locale()}
          onChange={(e) => setLocale(e.currentTarget.value as Locale)}>
          <For each={LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
        </select>
      </div>
      <p class="text-body-secondary">{t("login.tagline")}</p>
      <Show when={config()}>
        {(c) => (
          <div class="d-flex flex-column gap-3">
            <Show when={c().googleClientId} fallback={<div class="alert alert-warning">{t("login.googleMissing")}</div>}>
              {(id) => <GoogleButton clientId={id()} onError={setError} />}
            </Show>
            <Show when={c().devLogin}>
              <form class="qa-dev-login d-flex gap-2" onSubmit={(e) => {
                e.preventDefault();
                api.post("/api/auth/dev", { email: email(), locale: locale() }).then(refetchMe, (err: Error) => setError(err.message));
              }}>
                <input class="qa-dev-email form-control" type="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} />
                <button class="qa-dev-submit btn btn-secondary text-nowrap" type="submit">{t("login.dev")}</button>
              </form>
            </Show>
          </div>
        )}
      </Show>
      <Show when={error()}>{(m) => <div class="qa-login-error alert alert-danger mt-3">{m()}</div>}</Show>
    </div>
  );
}
