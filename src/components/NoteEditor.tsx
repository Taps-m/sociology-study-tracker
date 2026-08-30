import { useEffect, useState } from "react";
import type { Derived } from "../lib/events";
import { C } from "../lib/theme";

/**
 * A note on one topic, in your own words.
 *
 * Folded away until asked for, because a textarea open on every row turns the
 * chapter list into a form. Plain text: a rich editor would be a dependency, a
 * storage format and a migration, none of which help anyone remember what
 * Merton meant by a latent function.
 *
 * Saving is explicit rather than on every keystroke. The log is append-only, so
 * autosave would write an event per character and the note's history would be
 * unreadable — and worse, Recent Activity would fill with them.
 */
export function NoteEditor({
  topicId,
  d,
  onSave,
  startOpen = false,
}: {
  topicId: string;
  d: Derived;
  onSave: (topicId: string, text: string) => void;
  startOpen?: boolean;
}) {
  const saved = d.notes[topicId];
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState(saved?.text ?? "");

  // Someone else may have written this note — the search screen and the topic
  // row edit the same one. Take theirs whenever it changes underneath.
  useEffect(() => setText(saved?.text ?? ""), [saved?.at, saved?.text]);

  const dirty = text.trim() !== (saved?.text ?? "");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 8,
          padding: 0,
          background: "none",
          border: "none",
          color: saved ? C.text : C.muted,
          font: "inherit",
          fontSize: 12.5,
          textAlign: "left",
          cursor: "pointer",
          lineHeight: 1.5,
        }}
      >
        {saved ? (
          <>
            <span style={{ color: C.muted }}>note · </span>
            {saved.text.length > 90 ? `${saved.text.slice(0, 90)}…` : saved.text}
          </>
        ) : (
          "+ add a note"
        )}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        autoFocus
        placeholder="What you want to remember about this topic — a definition, a thinker, an example you can use in an answer."
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          background: C.surface,
          border: `1px solid ${C.line}`,
          color: C.text,
          fontFamily: C.sans,
          fontSize: 14,
          lineHeight: 1.6,
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <button
          onClick={() => {
            onSave(topicId, text);
            setOpen(false);
          }}
          disabled={!dirty}
          style={{
            minHeight: 34,
            padding: "0 14px",
            borderRadius: 7,
            border: "none",
            background: dirty ? C.accent : C.panel,
            color: dirty ? C.surface : C.muted,
            font: "inherit",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: dirty ? "pointer" : "default",
          }}
        >
          {text.trim() === "" && saved ? "Delete note" : "Save"}
        </button>
        <button
          onClick={() => {
            setText(saved?.text ?? "");
            setOpen(false);
          }}
          style={{
            minHeight: 34,
            padding: "0 12px",
            borderRadius: 7,
            border: `1px solid ${C.line}`,
            background: "transparent",
            color: C.muted,
            font: "inherit",
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
            saved {saved.at.slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}
