import { createResource } from "solid-js";
import type { Me } from "../../shared/api.ts";
import { api, ApiError } from "./api.ts";

/** The signed-in user, or null when signed out. Other errors propagate to the error boundary. */
export const [me, { refetch: refetchMe }] = createResource(async () => {
  try {
    return await api.get<Me>("/api/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});

export async function logout() {
  await api.post("/api/auth/logout");
  await refetchMe();
}
