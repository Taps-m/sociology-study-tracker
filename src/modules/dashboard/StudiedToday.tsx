import { useMemo, useState } from "react";
import { TOPICS, type Topic } from "../../data/syllabus";
import type { CheckId, Derived } from "../../lib/events";
import { CHECKS, checksFor, partsDone, partsOf } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

/**
 * The gap between what was studied and what the app knows.
 *
 * The plan is a recommendation and the wheel is a record, and the only thing
 * joining them was a tick buried on a topic row among eighty-five others. So an
 * evening on Marx left no trace: the plan went on recommending it, the wheel
 * went on saying 0%, and the numbers on the dashboard slowly stopped describing
 * the person reading them. A plan that has drifted from the truth is one nobody
 * opens again.
 *
 * Two words and a tap. Matching is on the words a candidate would actually
 * type — "marx", "groups", "mobility" — against the topic name and its unit,
 * not against the syllabus's own phrasing, because nobody types "historical
 * materialism, mode of production, alienation".
 */
function matches(query: string): Topic[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  return TOPICS.filter((t) => {
    const hay = `${t.name} ${t.unit}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  }).slice(0, 6);
}

/** "Karl Marx — historical materialism, …" reads as "Karl Marx" in a list. */
function shortName(name: string): string {
  const head = name.split(" — ")[0]!.trim();
  return head.length > 46 ? `${head.slice(0, 45).trimEnd()}…` : head;
}

export function StudiedToday({
  d,
  onToggle,
}: {
  d: Derived;
  onToggle: (topicId: string, check: CheckId, part?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [justLogged, setJustLogged] = useState<Topic | null>(null);
  const found = useMemo(() => matches(query), [query]);

  function log(topic: Topic, check: CheckId) {
    if (!checksFor(d, topic.id)[check]) onToggle(topic.id, check);
    setJustLogged(topic);
    setQuery("");
  }

  /*
   * A part stays on screen after it is ticked.
   *
   * The whole-topic buttons clear the search, because that evening's work is
   * recorded and there is nothing more to say. Parts are the opposite: someone
   * who read two of Marx's four wants to tick both without typing "marx" twice.
   */
  function logPart(topic: Topic, part: string) {
    onToggle(topic.id, "read", part);
    setJustLogged(topic);
  }

  return (
    <Card icon="search" title="What did you study today?">
      <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.6 }}>
        Type two words. The plan rebuilds itself around whatever you tell it.
      </p>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setJustLogged(null);
        }}
        placeholder="marx, groups, mobility…"
        aria-label="Search the syllabus for what you studied"
        style={{
          width: "100%",
          minHeight: 44,
          padding: "0 12px",
          borderRadius: 9,
          background: C.surface,
          border: `1px solid ${C.line}`,
          color: C.text,
          fontFamily: C.sans,
          fontSize: 15,
        }}
      />

      {query.trim().length >= 2 && found.length === 0 && (
        <p style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.6 }}>
          Nothing in the syllabus matches that. Try one word — the topic names
          here are the WBCS wording, which is not always what a book calls it.
        </p>
      )}

      {found.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {found.map((t) => {
            const done = checksFor(d, t.id);
            return (
              <div
                key={t.id}
                style={{
                  padding: "9px 11px",
                  borderRadius: 9,
                  border: `1px solid ${C.line}`,
                  background: C.surface,
                }}
              >
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.35 }}>
                  {shortName(t.name)}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                  Paper {t.paper === 1 ? "I" : "II"} · {t.unit}
                </div>
                {/*
                  All four checks, not just "read".
                  An evening is rarely one kind of work, and offering only the
                  first of the four would make the other three feel like extra
                  admin — which is how a logger stops being used by Thursday.
                */}
                {/*
                  Where the syllabus named the parts, offer them. An evening is
                  usually one part of a thinker, not six hours of one.
                */}
                {partsOf(t).length > 0 && !done.read && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                    {partsOf(t).map((part) => {
                      const got = partsDone(d, t.id, "read").includes(part);
                      return (
                        <button
                          key={part}
                          onClick={() => logPart(t, part)}
                          title={got ? "recorded — tap to undo" : "record this part as read"}
                          style={{
                            font: "inherit",
                            fontSize: 12,
                            padding: "5px 9px",
                            minHeight: 30,
                            borderRadius: 7,
                            cursor: "pointer",
                            background: got ? C.accentSoft : "transparent",
                            color: got ? C.accent : C.muted,
                            border: `1px solid ${got ? C.accent : C.line}`,
                          }}
                        >
                          {got ? "✓ " : ""}
                          {part}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                  {CHECKS.map((c) => {
                    const on_ = Boolean(done[c.id]);
                    return (
                      <button
                        key={c.id}
                        onClick={() => log(t, c.id)}
                        disabled={on_}
                        title={on_ ? "already recorded" : `record ${c.label.toLowerCase()}`}
                        style={{
                          font: "inherit",
                          fontSize: 12.5,
                          padding: "6px 10px",
                          minHeight: 32,
                          borderRadius: 7,
                          cursor: on_ ? "default" : "pointer",
                          background: on_ ? C.accentSoft : "transparent",
                          color: on_ ? C.accent : C.text,
                          border: `1px solid ${on_ ? C.accent : C.line}`,
                        }}
                      >
                        {on_ ? "✓ " : ""}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {justLogged && (
        <p style={{ fontSize: 13.5, color: "var(--good)", margin: "10px 0 0", lineHeight: 1.6 }}>
          Recorded against {shortName(justLogged.name)}. The plan has already
          moved on to what is left.
        </p>
      )}
    </Card>
  );
}
