import { useEffect, useRef, useState } from "react";
import { clearNotes, notesStatus, saveNotes, type NotesBundle } from "../../lib/notesStore";
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
  const [state, setState] = useState<{ loaded: boolean; pages: number }>({
    loaded: false,
    pages: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  const refresh = () => void notesStatus().then(setState);
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
        throw new Error(
          "That is the PDF itself. You want book-text\\sleepy-notes.json — the extracted text beside it.",
        );
      }
      const bundle = JSON.parse(raw) as NotesBundle;
      const papers = Object.keys(bundle);
      if (papers.length === 0 || !papers.every((k) => Array.isArray(bundle[k]))) {
        throw new Error("That is valid JSON, but not the notes bundle.");
      }
      await saveNotes(bundle);
      refresh();
    } catch (e) {
      const why = e instanceof Error ? e.message : "";
      setError(
        why.includes("is not valid JSON")
          ? "That file is not the notes bundle. Pick book-text\\sleepy-notes.json."
          : why || "Could not read that file.",
      );
    }
    setBusy(false);
  }

  const indexed = NOTE_SECTIONS.length;

  return (
    <Card icon="book" title="Your notes">
      <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>
        The app knows which pages of your Sleepy Classes notes cover which topic —{" "}
        <span className="num">{indexed}</span> sections across both papers. Load the notes
        themselves and every skeleton, answer and map is written out of them rather than out of
        what the model happens to know.
      </p>

      <p style={{ fontSize: 12.5, color: C.muted, margin: "9px 0 0", lineHeight: 1.65 }}>
        The file is <span className="num">book-text/sleepy-notes.json</span>, beside the PDFs. It
        stays on this device — it is never uploaded, never committed, and never leaves the browser
        except as the few pages a question needs, inside that question's own request.
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
          {busy ? "Loading…" : state.loaded ? "Load a newer copy" : "Load my notes"}
        </button>

        {state.loaded && (
          <>
            <span style={{ fontSize: 13.5, color: "var(--good)" }}>
              <span className="num">{state.pages}</span> pages loaded
            </span>
            <button
              onClick={() => void clearNotes().then(refresh)}
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
          Until this is loaded the app works exactly as it did before: the model is told which
          chapters cover a topic but has not read them.
        </p>
      )}
    </Card>
  );
}
