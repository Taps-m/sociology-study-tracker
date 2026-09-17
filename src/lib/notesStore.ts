import { notePagesFor, type NoteSection } from "../data/notes";

/**
 * The notes themselves, held on this device and nowhere else.
 *
 * Two constraints decide this design. The notes are paid, copyrighted material
 * and the repository is public, so the text can never be committed or built
 * into the bundle. And the app is local-first, with a server that exists only
 * to hold an API key — so there is nowhere on our side to put it either.
 *
 * So it lives in IndexedDB on the device, imported once from a file, and the
 * few pages a question needs travel with that question's request. The text
 * never leaves the browser except into the model call the candidate asked for,
 * and clearing site data removes it as completely as it removes everything
 * else.
 *
 * IndexedDB rather than localStorage: this is about 1.6 MB, and dropping that
 * beside the answer caches in a 5 MB store is how you get a QuotaExceededError
 * on an unrelated write three weeks later.
 */

const DB = "wbcs.notes";
const STORE = "pages";
const KEY = "sleepy";

/** Paper number to its pages, index 0 being page 1. */
export type NotesBundle = Record<string, string[]>;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveNotes(bundle: NotesBundle): Promise<void> {
  await run("readwrite", (s) => s.put(bundle, KEY));
}

export async function loadNotes(): Promise<NotesBundle | null> {
  try {
    return (await run<NotesBundle | undefined>("readonly", (s) => s.get(KEY))) ?? null;
  } catch {
    // Private mode, blocked storage, or a first run. The app works without it;
    // answers are simply not grounded in the notes until they are imported.
    return null;
  }
}

export async function clearNotes(): Promise<void> {
  await run("readwrite", (s) => s.delete(KEY));
}

/** What is loaded, for the screen that offers to load it. */
export async function notesStatus(): Promise<{ loaded: boolean; pages: number }> {
  const b = await loadNotes();
  if (!b) return { loaded: false, pages: 0 };
  return { loaded: true, pages: Object.values(b).reduce((n, p) => n + p.length, 0) };
}

/**
 * The passage a topic needs, ready to travel with a request.
 *
 * Capped hard. A prompt that carries fifty pages costs more than it earns and
 * pushes the answer itself out of the reply; the section a question needs is
 * six or seven pages, which is about twelve kilobytes.
 */
export async function notesSliceFor(
  topicId: string,
  maxChars = 22_000,
): Promise<{ text: string; cite: NoteSection } | null> {
  const want = notePagesFor(topicId);
  if (want.length === 0) return null;
  const bundle = await loadNotes();
  if (!bundle) return null;

  const cite = want[0]!;
  const pages = bundle[String(cite.paper)];
  if (!pages) return null;

  const text = pages
    .slice(cite.from - 1, cite.to)
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text ? { text: text.slice(0, maxChars), cite } : null;
}
