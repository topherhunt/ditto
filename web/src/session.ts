import { createResource } from "solid-js";
import type { Me } from "../../shared/api.ts";
import { api, ApiError } from "./api.ts";
import { setLocale } from "./i18n/index.ts";

/** The signed-in user, or null when signed out; a signed-in user's locale drives the UI. Other errors propagate to the error boundary. */
export const [me, { refetch: refetchMe }] = createResource(async () => {
  try {
    const user = await api.get<Me>("/api/me");
    setLocale(user.locale);
    return user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});

export async function logout() {
  await api.post("/api/auth/logout");
  await refetchMe();
}
