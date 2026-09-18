import { useEffect, useRef, useState } from "react";
import {
  clearNotes,
  notesStatus,
  saveNotes,
  type NotesBundle,
  type SourceId,
} from "../../lib/notesStore";
import { NOTE_SECTIONS } from "../../data/notes";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

/**
 * Loading your own notes into the app, once.
 *
 * The app knows which pages of the Sleepy Classes notes cover which topic —
 * that index ships in the build. What it cannot ship is the notes themselves:
 * they are paid material and this repository is public. So the text is
 * extracted alongside the PDFs into `book-text/`, which is git-ignored, and
 * loaded from there into this device's own storage.
 *
 * After that, the pages a question needs travel with that question's request
 * and the answers are written out of the material actually revised from. The
 * file never goes to a server of ours, because there is no server of ours to
 * send it to.
 */
export function NotesImport() {
  return (
    <>
      <SourceCard
        source="sleepy"
        icon="book"
        title="Your notes"
        fileName="book-text\\sleepy-notes.json"
        what={
          <>
            The app knows which pages of your Sleepy Classes notes cover which topic —{" "}
            <span className="num">{NOTE_SECTIONS.length}</span> sections across both papers. Load
            the notes themselves and every skeleton, answer and map is written out of them rather
            than out of what the model happens to know.
          </>
        }
      />
      <SourceCard
        source="sangwan"
        icon="book"
        title="Essential Sociology"
        fileName="book-text\\sangwan-text.json"
        what={
          <>
            All <span className="num">547</span> pages of Sangwan, scanned and read. The chapter
            map already says which pages answer which topic; load the book and those pages travel
            with the question instead of being cited at it. It is OCR of a photographed book, so
            expect the odd mangled line — the sociology survives, the typesetting does not.
          </>
        }
      />
    </>
  );
}

function SourceCard({
  source,
  icon,
  title,
  fileName,
  what,
}: {
  source: SourceId;
  icon: string;
  title: string;
  fileName: string;
  what: React.ReactNode;
}) {
  const [state, setState] = useState<{ loaded: boolean; pages: number }>({
    loaded: false,
    pages: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  const refresh = () => void notesStatus(source).then(setState);
  useEffect(refresh, []);

  async function take(f: File) {
    setBusy(true);
    setError(null);
    try {
      const raw = await f.text();
      /*
       * The PDF is the obvious wrong answer — the picker opens in the folder
       * that holds it — so name the right file rather than handing over
       * whatever JSON.parse said about the first byte it disliked.
       */
      if (raw.startsWith("%PDF")) {
        throw new Error(`That is the PDF itself. You want ${fileName} — the extracted text.`);
      }
      const bundle = JSON.parse(raw) as NotesBundle;
      const keys = Object.keys(bundle);
      if (keys.length === 0 || !keys.every((k) => Array.isArray(bundle[k]))) {
        throw new Error("That is valid JSON, but not a bundle of pages.");
      }
      /*
       * Each bundle knows which source it is: the notes are keyed by paper
       * number, the book by its own id. Loading one into the other's slot would
       * fail silently later — a question would find no pages and simply write
       * an ungrounded answer — so it is refused here, where it can be explained.
       */
      const wantsSangwan = source === "sangwan";
      if (wantsSangwan !== keys.includes("sangwan")) {
        throw new Error(
          wantsSangwan
            ? "That looks like the notes bundle. This slot wants sangwan-text.json."
            : "That looks like the Sangwan bundle. This slot wants sleepy-notes.json.",
        );
      }
      await saveNotes(bundle, source);
      refresh();
    } catch (e) {
      const why = e instanceof Error ? e.message : "";
      setError(
        why.includes("is not valid JSON")
          ? `That file is not a page bundle. Pick ${fileName}.`
          : why || "Could not read that file.",
      );
    }
    setBusy(false);
  }

  return (
    <Card icon={icon} title={title}>
      <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>{what}</p>

      <p style={{ fontSize: 12.5, color: C.muted, margin: "9px 0 0", lineHeight: 1.65 }}>
        The file is <span className="num">{fileName}</span>, beside the PDFs. It stays on this
        device — never uploaded, never committed, and it leaves the browser only as the few pages a
        question needs, inside that question's own request.
      </p>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void take(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => file.current?.click()}
          disabled={busy}
          style={{
            minHeight: 42,
            padding: "0 16px",
            borderRadius: 9,
            border: "none",
            background: busy ? C.line : C.accent,
            color: busy ? C.muted : C.accentInk,
            font: "inherit",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Loading…" : state.loaded ? "Load a newer copy" : `Load ${title.toLowerCase()}`}
        </button>

        {state.loaded && (
          <>
            <span style={{ fontSize: 13.5, color: "var(--good)" }}>
              <span className="num">{state.pages}</span> pages loaded
            </span>
            <button
              onClick={() => void clearNotes(source).then(refresh)}
              style={{
                minHeight: 38,
                padding: "0 13px",
                borderRadius: 8,
                border: `1px solid ${C.line}`,
                background: "transparent",
                color: C.muted,
                font: "inherit",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: C.warn, margin: "10px 0 0", lineHeight: 1.6 }}>{error}</p>
      )}

      {!state.loaded && !busy && (
        <p style={{ fontSize: 12.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.6 }}>
          Until this is loaded the model is told which chapters cover a topic but has not read
          them.
        </p>
      )}
    </Card>
  );
}
