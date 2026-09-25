import { createSignal, Show } from "solid-js";
import { api, ApiError } from "../api.ts";
import { t } from "../i18n/index.ts";
import { refetchMe } from "../session.ts";

/** Sets the signed-in user's username; the pattern mirrors UsernameSchema so the browser rejects bad input before the server does. */
export function UsernameForm(props: { initial: string | null; submitLabel: string; onSaved?: () => void }) {
  const [username, setUsername] = createSignal(props.initial ?? "");
  const [error, setError] = createSignal<string | null>(null);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put("/api/username", { username: username().trim() });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t("username.taken") : (err as Error).message);
      return;
    }
    await refetchMe();
    props.onSaved?.();
  }

  return (
    <form class="qa-username-form d-flex flex-column gap-2" onSubmit={save}>
      <label class="form-label mb-0">
        {t("username.label")}
        <input class="qa-username form-control" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_.\-]{3,20}" autocomplete="username"
          value={username()} onInput={(e) => { setUsername(e.currentTarget.value); setError(null); }} />
      </label>
      <div class="form-text mt-0">{t("username.rules")}</div>
      <Show when={error()}>{(m) => <div class="qa-username-error text-danger small">{m()}</div>}</Show>
      <div><button type="submit" class="qa-username-save btn btn-primary">{props.submitLabel}</button></div>
    </form>
  );
}
