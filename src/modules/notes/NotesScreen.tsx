import { useMemo, useState } from "react";
import { TOPICS } from "../../data/syllabus";
import type { Derived } from "../../lib/events";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { NoteEditor } from "../../components/NoteEditor";

/**
 * Everything you have written, in one place.
 *
 * This is a recall surface, not a second place to take notes: the writing
 * happens on the topic row, where the topic is. What this adds is the thing a
 * topic row cannot — searching across all of them at once, a week before the
 * paper, when you remember the phrase but not which unit it was in.
 *
 * The same editor component is embedded here rather than a second one written
 * for this screen, so a note behaves identically wherever it is opened.
 */
export function NotesScreen({
  d,
  onSave,
}: {
  d: Derived;
  onSave: (topicId: string, text: string) => void;
}) {
  const [query, setQuery] = useState("");

  const written = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPICS.filter((t) => d.notes[t.id]).filter((t) =>
      q === ""
        ? true
        : `${t.name} ${t.unit} ${d.notes[t.id]!.text}`.toLowerCase().includes(q),
    );
  }, [d.notes, query]);

  const total = TOPICS.filter((t) => d.notes[t.id]).length;
  const words = TOPICS.reduce(
    (s, t) => s + (d.notes[t.id]?.text.trim().split(/\s+/).filter(Boolean).length ?? 0),
    0,
  );

  if (total === 0) {
    return (
      <Card title="My Notes">
        <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.65 }}>
          Nothing written yet. Notes are added on a topic — open Chapters, find the topic
          you are working on, and use <em>add a note</em> under it. They collect here, and
          the ones you write show up again on the back of the revision cards.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card title="My Notes">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes"
          aria-label="Search your notes"
          style={{
            width: "100%",
            minHeight: 42,
            padding: "0 12px",
            borderRadius: 8,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.text,
            fontFamily: C.sans,
            fontSize: 15,
          }}
        />
        <p style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 0" }}>
          <span className="num">{written.length}</span>
          {query.trim() ? ` of ${total} notes match` : ` topics noted`} ·{" "}
          <span className="num">{words}</span> words in your own hand
        </p>
      </Card>

      {written.length === 0 ? (
        <Card>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Nothing matches “{query.trim()}”.
          </p>
        </Card>
      ) : (
        written.map((t) => (
          <Card key={t.id}>
            <div style={{ fontSize: 12.5, color: C.muted, letterSpacing: "0.08em" }}>
              Paper {t.paper === 1 ? "I" : "II"} · {t.unit}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, margin: "4px 0 2px", lineHeight: 1.45 }}>
              {t.name}
            </div>
            <NoteEditor topicId={t.id} d={d} onSave={onSave} />
          </Card>
        ))
      )}
    </div>
  );
}
