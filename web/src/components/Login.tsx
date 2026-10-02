import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import type { Config } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { locale, ownLocale, t } from "../i18n/index.ts";
import { homeLanguage } from "../learning.ts";
import { me, refetchMe } from "../session.ts";
import { theme } from "../theme.ts";

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

function GoogleButton(props: { clientId: string; signIn: (body: object) => Promise<void>; onError: (m: string) => void }) {
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
        callback: ({ credential }) => props.signIn({ credential }),
      });
      setLoaded(true);
    };
    document.head.append(script);
  });
  // Re-render on a locale or theme change so the button's own label and colors follow.
  createEffect(() => {
    if (!loaded()) return;
    el.replaceChildren();
    window.google!.accounts.id.renderButton(el, {
      theme: theme() === "dark" ? "filled_black" : "outline",
      size: "large",
      text: "signin_with",
      locale: locale(),
    });
  });
  // Google's iframe declares no color-scheme, so under our dark scheme the browser paints it an opaque white backdrop.
  return (
    <div class="d-flex justify-content-center">
      <div ref={el} class="qa-google-signin border border-primary rounded-2 overflow-hidden" style={{ "color-scheme": "light" }} />
    </div>
  );
}

/** Signs in with the course picked on the homepage; the server keeps it only for an account that has none yet. */
export function SignIn(props: { config: Config; learning: Language | null }) {
  const [error, setError] = createSignal<string | null>(null);
  const [email, setEmail] = createSignal("dev@example.com");
  const location = useLocation();
  const navigate = useNavigate();

  async function signIn(path: string, body: object) {
    try {
      await api.post(path, { ...body, locale: ownLocale(),...(props.learning && { learning: props.learning }) });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    await refetchMe();
    // Deep links keep their page; the homepage hands over to the course.
    const learning = me()!.learning;
    if (location.pathname === "/" && learning.length > 0) navigate(`/${homeLanguage(learning)}`);
  }

  return (
    <div>
      <div class="d-flex flex-column gap-3">
        <Show when={props.config.googleClientId} fallback={<div class="alert alert-warning">{t("login.googleMissing")}</div>}>
          {(id) => <GoogleButton clientId={id()} signIn={(body) => signIn("/api/auth/google", body)} onError={setError} />}
        </Show>
        <Show when={props.config.devLogin}>
          <form class="qa-dev-login d-flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            void signIn("/api/auth/dev", { email: email() });
          }}>
            <input class="qa-dev-email form-control" type="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} />
            <button class="qa-dev-submit btn btn-secondary text-nowrap" type="submit">{t("login.dev")}</button>
          </form>
        </Show>
      </div>
      <Show when={error()}>{(m) => <div class="qa-login-error alert alert-danger mt-3">{m()}</div>}</Show>
    </div>
  );
}
