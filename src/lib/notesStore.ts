import { notePagesFor, type NoteSection } from "../data/notes";
import { pdfPageOf, standardReadingsFor, stdChapter } from "../data/standardBooks";
import { outlineFromPages, type OutlineNode } from "./notesOutline";

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

/**
 * One record per source of pages held on this device.
 *
 * "sleepy" is the two coaching PDFs, keyed by paper. "sangwan" is the OCR of
 * Essential Sociology, keyed by the book's own id. They are stored apart
 * because they are loaded apart and either can be absent — a candidate with
 * the notes and no book should get the notes, not an error.
 */
export type SourceId = "sleepy" | "sangwan";
const KEY: SourceId = "sleepy";

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

export async function saveNotes(bundle: NotesBundle, key: SourceId = KEY): Promise<void> {
  await run("readwrite", (s) => s.put(bundle, key));
}

export async function loadNotes(key: SourceId = KEY): Promise<NotesBundle | null> {
  try {
    return (await run<NotesBundle | undefined>("readonly", (s) => s.get(key))) ?? null;
  } catch {
    // Private mode, blocked storage, or a first run. The app works without it;
    // answers are simply not grounded in the notes until they are imported.
    return null;
  }
}

export async function clearNotes(key: SourceId = KEY): Promise<void> {
  await run("readwrite", (s) => s.delete(key));
}

/** What is loaded, for the screen that offers to load it. */
export async function notesStatus(key: SourceId = KEY): Promise<{ loaded: boolean; pages: number }> {
  const b = await loadNotes(key);
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

/**
 * The pages of Sangwan that cover this topic.
 *
 * The chapter map in standardBooks.ts already says which printed pages answer
 * which topic; `pdfPageOf` turns those into the PDF's own numbering, now that
 * the offset has been measured rather than guessed. A page of padding either
 * side, because that offset is right to within one page and a chapter that
 * starts a line late is worth more than one that starts a line early.
 *
 * Capped harder than the notes are. Sangwan's chapters run twenty pages where a
 * notes section runs six, and a prompt carrying twenty pages of OCR spends its
 * budget on the scan rather than on the answer.
 */
export async function sangwanSliceFor(
  topicId: string,
  maxChars = 18_000,
): Promise<{ text: string; cite: string } | null> {
  const reading = standardReadingsFor(topicId).find(
    (r) => r.book === "sangwan" && r.kind === "covers" && r.from && r.to,
  );
  if (!reading?.from || !reading.to) return null;

  const bundle = await loadNotes("sangwan");
  const pages = bundle?.sangwan;
  if (!pages) return null;

  const first = pdfPageOf("sangwan", reading.from);
  const last = pdfPageOf("sangwan", reading.to);
  if (first === null || last === null) return null;

  const text = pages
    .slice(Math.max(0, first - 2), Math.min(pages.length, last + 1))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;

  const ch = stdChapter("sangwan", reading.chapter);
  return {
    text: text.slice(0, maxChars),
    cite: `Sangwan, Essential Sociology, ch. ${reading.chapter}${
      ch?.title ? ` — ${ch.title}` : ""
    }, pp. ${reading.from}–${reading.to}`,
  };
}

/**
 * The same pages, read as an outline rather than as a block of prose.
 *
 * This is what the mind map is drawn from when the notes are loaded. Drawn
 * from the answer skeleton instead, a map has two levels and is organised
 * around building an answer; drawn from here it has the subject's own shape
 * and the notes' own words, which is what a revision map is for.
 *
 * Takes the whole section, not the capped slice the prompt gets — a map is
 * read by eye and can afford pages a prompt cannot.
 */
export async function notesOutlineFor(
  topicId: string,
): Promise<{ outline: OutlineNode; cite: NoteSection } | null> {
  const want = notePagesFor(topicId, 10);
  if (want.length === 0) return null;
  const bundle = await loadNotes();
  if (!bundle) return null;

  const cite = want[0]!;
  const pages = bundle[String(cite.paper)]?.slice(cite.from - 1, cite.to);
  if (!pages || pages.length === 0) return null;

  const outline = outlineFromPages(pages, cite.heading);
  return (outline.children?.length ?? 0) > 0 ? { outline, cite } : null;
}
