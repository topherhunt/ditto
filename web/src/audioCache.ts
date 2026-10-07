/**
 * WebKit (so every iPhone browser) re-downloads a clip each time an audio element loads it, ignoring the HTTP cache, so every
 * replay waits on the network. A clip fetched once into a blob URL plays from memory instead, until the page unloads.
 */
const loaded = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** `url` as a blob URL, fetched once; a failed fetch is forgotten so the next call retries it. */
export function load(url: string): Promise<string> {
  const blobUrl = loaded.get(url);
  if (blobUrl) return Promise.resolve(blobUrl);
  let p = pending.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const b = URL.createObjectURL(await res.blob());
      loaded.set(url, b);
      return b;
    }).finally(() => pending.delete(url));
    pending.set(url, p);
  }
  return p;
}

/** `url`'s blob URL once loaded. Until then it returns `url` and starts the load, so this play streams and later ones don't. */
export function cachedSrc(url: string): string {
  const blobUrl = loaded.get(url);
  if (blobUrl) return blobUrl;
  // The audio element streaming `url` reports the same failure, so this load's is dropped.
  load(url).catch(() => {});
  return url;
}

/** `url`'s blob URL if it's loaded already. */
export const loadedSrc = (url: string): string | undefined => loaded.get(url);
