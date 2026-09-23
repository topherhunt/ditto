import { createResource, createSignal, onMount, Show } from "solid-js";
import type { Config } from "../../../shared/api.ts";
import { api } from "../api.ts";
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
  onMount(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onerror = () => props.onError("Could not load Google sign-in");
    script.onload = () => {
      const gis = window.google!.accounts.id;
      gis.initialize({
        client_id: props.clientId,
        callback: ({ credential }) =>
          api.post("/api/auth/google", { credential }).then(refetchMe, (e: Error) => props.onError(e.message)),
      });
      gis.renderButton(el, { theme: "outline", size: "large", text: "signin_with" });
    };
    document.head.append(script);
  });
  return <div ref={el} class="qa-google-signin" />;
}

export function Login() {
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [error, setError] = createSignal<string | null>(null);
  const [email, setEmail] = createSignal("dev@example.com");

  return (
    <div class="container py-5" style={{ "max-width": "28rem" }}>
      <h1 class="h3 mb-3">Ditto</h1>
      <p class="text-body-secondary">Listen, type what you hear, and learn from every mistake.</p>
      <Show when={config()}>
        {(c) => (
          <div class="d-flex flex-column gap-3">
            <Show when={c().googleClientId} fallback={<div class="alert alert-warning">Google sign-in is not configured.</div>}>
              {(id) => <GoogleButton clientId={id()} onError={setError} />}
            </Show>
            <Show when={c().devLogin}>
              <form class="qa-dev-login d-flex gap-2" onSubmit={(e) => {
                e.preventDefault();
                api.post("/api/auth/dev", { email: email() }).then(refetchMe, (err: Error) => setError(err.message));
              }}>
                <input class="qa-dev-email form-control" type="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} />
                <button class="qa-dev-submit btn btn-secondary text-nowrap" type="submit">Dev sign-in</button>
              </form>
            </Show>
          </div>
        )}
      </Show>
      <Show when={error()}>{(m) => <div class="qa-login-error alert alert-danger mt-3">{m()}</div>}</Show>
    </div>
  );
}
