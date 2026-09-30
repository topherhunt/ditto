// A learner's own replies, kept only in this browser so they can replay them; the server never stores them (docs/privacy.md).
// IndexedDB can be missing or blocked (private windows); then replay is unavailable, with a console warning.

/** How long a recording stays replayable. */
const KEEP_DAYS = 30;
const DB = "ditto-recordings";
const STORE = "replies";

type Kept = { blob: Blob; savedAt: number };

/** Object URLs by learner turn id, so a reply just kept replays without waiting on IndexedDB. */
const urls = new Map<number, string>();

const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

const warn = (what: string) => (e: unknown) => console.warn(`Recordings: ${what} failed:`, e);

const expired = (kept: Kept) => kept.savedAt < Date.now() - KEEP_DAYS * 86_400_000;

async function prune() {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).openCursor().onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor) return;
        if (expired(cursor.value as Kept)) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Keeps the recording of learner turn `turnId`. */
export function keepRecording(turnId: number, blob: Blob) {
  urls.set(turnId, URL.createObjectURL(blob));
  void withStore("readwrite", (s) => s.put({ blob, savedAt: Date.now() } satisfies Kept, turnId)).then(prune).catch(warn("saving a reply"));
}

/** The replayable recording of learner turn `turnId`, or null when this browser doesn't have it (or it expired). */
export async function recordingUrl(turnId: number): Promise<string | null> {
  const cached = urls.get(turnId);
  if (cached) return cached;
  try {
    const kept = await withStore<Kept | undefined>("readonly", (s) => s.get(turnId));
    if (!kept || expired(kept)) return null;
    const url = URL.createObjectURL(kept.blob);
    urls.set(turnId, url);
    return url;
  } catch (e) {
    warn("reading a reply")(e);
    return null;
  }
}

/** Forgets every recording; on sign-out, so the next person on this browser can't replay them. */
export function clearRecordings() {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  void withStore("readwrite", (s) => s.clear()).catch(warn("clearing replies"));
}
