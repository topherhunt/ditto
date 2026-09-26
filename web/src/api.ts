export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `${method} ${path} failed with ${res.status}`);
  return data as T;
}

/**
 * POSTs to a route that streams NDJSON events ending in {result} or {error, status}; each other event goes to `onEvent`.
 * Errors before the stream starts come back as an ordinary JSON error response.
 */
async function postStream<T, E>(path: string, body: unknown, onEvent: (e: E) => void): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    throw new ApiError(res.status, data?.error ?? `POST ${path} failed with ${res.status}`);
  }
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) throw new Error(`POST ${path} ended without a result`);
    buffered += value;
    const lines = buffered.split("\n");
    buffered = lines.pop()!;
    for (const line of lines) {
      const event = JSON.parse(line);
      if ("result" in event) return event.result as T;
      if ("error" in event) throw new ApiError(event.status, event.error);
      onEvent(event as E);
    }
  }
}

export const api = {
  postStream,
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
