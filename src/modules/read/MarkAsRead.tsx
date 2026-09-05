import { useMemo, useState } from "react";
import { TOPICS, type Topic } from "../../data/syllabus";
import { keywordCoverage } from "../../data/keywords";
import { standardReadingsFor, stdLine } from "../../data/standardBooks";
import type { CheckId, Derived } from "../../lib/events";
import {
  checkProgress,
  checksFor,
  completionOf,
  packWeeks,
  partsDone,
  partsOf,
} from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { Icon } from "../../app/Icon";

/**
 * Reading, recorded as it actually happens.
 *
 * Every other screen asks about a chapter as a whole: read it or do not. But
 * six hours of Marx is four separate ideas across four evenings, and until now
 * the honest answer after the first of them was unavailable — tick it and the
 * app believed all four were done, leave it and the app believed none were.
 * The second is what kept happening, so a chapter that had been half read sat
 * at zero while the plan went on recommending it.
 *
 * This is the one screen built around that. It opens on the chapters this week
 * actually asks for, because those are the ones being read tonight, and every
 * tick here is the same event the topic row writes — one log, one set of
 * numbers, no second source of truth.
 */

function shortName(name: string): string {
  return name.split(" — ")[0]!.trim();
}

/** The ideas of one chapter, with somewhere to put the tick. */
function ChapterCard({
  topic,
  d,
  onToggle,
}: {
  topic: Topic;
  d: Derived;
  onToggle: (topicId: string, check: CheckId, part?: string) => void;
}) {
  const parts = partsOf(topic);
  const done = partsDone(d, topic.id, "read");
  const whole = Boolean(checksFor(d, topic.id).read);
  const readShare = checkProgress(d, topic, "read");
  const pct = Math.round(completionOf(d, topic.id) * 100);
  const readings = standardReadingsFor(topic.id).filter((r) => r.kind === "covers");

  return (
    <section
      className="card"
      style={{ padding: 15, borderLeft: `3px solid ${whole ? "var(--good)" : C.line}` }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 650, lineHeight: 1.3 }}>
            {shortName(topic.name)}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
            Paper {topic.paper === 1 ? "I" : "II"} · {topic.unit} · {topic.estHours} h
          </div>
        </div>
        <span className="num" style={{ fontSize: 13, color: C.muted, flexShrink: 0 }}>
          {pct}%
        </span>
      </div>

      {/*
        Where to read it. The point of a keyword list is that you can find the
        keyword in a book, so the book and the pages belong on the same card —
        without them this is a checklist of words with nowhere to go.
      */}
      {readings.length > 0 && (
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.7 }}>
          {readings.slice(0, 2).map((r, i) => (
            <div key={i}>{stdLine(r)}</div>
          ))}
        </div>
      )}

      {parts.length > 0 ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              margin: "11px 0 7px",
              fontSize: 12.5,
              color: C.muted,
            }}
          >
            <span style={{ flex: "0 0 auto" }}>
              {whole ? parts.length : done.length} of {parts.length} ideas
            </span>
            <span
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: "var(--line)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${readShare * 100}%`,
                  height: "100%",
                  background: readShare === 1 ? "var(--good)" : C.accent,
                }}
              />
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {parts.map((part) => {
              const got = whole || done.includes(part);
              return (
                <button
                  key={part}
                  onClick={() => onToggle(topic.id, "read", part)}
                  disabled={whole}
                  title={
                    whole
                      ? "the whole chapter is ticked"
                      : got
                        ? "recorded — tap to undo"
                        : "record this idea as read"
                  }
                  style={{
                    font: "inherit",
                    fontSize: 13,
                    padding: "7px 11px",
                    minHeight: 34,
                    borderRadius: 8,
                    cursor: whole ? "default" : "pointer",
                    background: got ? C.accentSoft : "transparent",
                    color: got ? C.accent : C.text,
                    border: `1px solid ${got ? C.accent : C.line}`,
                  }}
                >
                  {got ? "✓ " : ""}
                  {part}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.6 }}>
          One idea, so there is nothing to break up — tick the chapter when it is done.
        </p>
      )}

      <button
        onClick={() => onToggle(topic.id, "read")}
        style={{
          marginTop: 11,
          minHeight: 38,
          padding: "0 14px",
          borderRadius: 8,
          font: "inherit",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          background: whole ? C.accentSoft : "transparent",
          color: whole ? C.accent : C.text,
          border: `1px solid ${whole ? C.accent : C.line}`,
        }}
      >
        {whole ? "✓ Whole chapter read" : "Mark the whole chapter read"}
      </button>
    </section>
  );
}

export function MarkAsRead({
  d,
  onToggle,
}: {
  d: Derived;
  onToggle: (topicId: string, check: CheckId, part?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const cover = keywordCoverage();

  // This week's chapters, which is what is being read tonight.
  const thisWeek = useMemo(() => {
    const weeks = packWeeks(d, 1);
    return weeks[0]?.topics ?? [];
  }, [d]);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    return TOPICS.filter((t) =>
      words.every((w) => `${t.name} ${t.unit}`.toLowerCase().includes(w)),
    ).slice(0, 8);
  }, [query]);

  const started = TOPICS.filter(
    (t) => partsDone(d, t.id, "read").length > 0 && !checksFor(d, t.id).read,
  );

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card icon="tick" title="Mark as read">
        <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>
          A chapter is not one evening's work. Tick the ideas you actually got
          through and the wheel, the plan and the revision queue all move by that
          much — no more, and no less.
        </p>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "9px 0 0", lineHeight: 1.6 }}>
          <span className="num">{cover.chapters}</span> of{" "}
          <span className="num">{cover.of}</span> chapters are broken into ideas,{" "}
          <span className="num">{cover.keywords}</span> in all. The rest are a single idea
          and take one tick.
        </p>
      </Card>

      {/*
        Half-finished chapters first, wherever they are in the plan.

        A chapter with two of five ticked is the one thing on this screen that
        is already in progress, and leaving it to be found among eighty-five is
        how it stays at two of five.
      */}
      {started.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, margin: "4px 0 0", color: C.muted, fontWeight: 600 }}>
            Half done
          </h2>
          {started.map((t) => (
            <ChapterCard key={t.id} topic={t} d={d} onToggle={onToggle} />
          ))}
        </>
      )}

      <h2 style={{ fontSize: 14, margin: "8px 0 0", color: C.muted, fontWeight: 600 }}>
        This week
      </h2>
      {thisWeek.length === 0 ? (
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>
          Nothing scheduled this week. Search below for any chapter.
        </p>
      ) : (
        thisWeek
          .filter((t) => !started.some((s) => s.id === t.id))
          .map((t) => <ChapterCard key={t.id} topic={t} d={d} onToggle={onToggle} />)
      )}

      <Card icon="search" title="Any other chapter">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="marx, mobility, bureaucracy…"
          aria-label="Search the syllabus"
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
          <p style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 0" }}>
            Nothing in the syllabus matches that.
          </p>
        )}
      </Card>

      {found.map((t) => (
        <ChapterCard key={t.id} topic={t} d={d} onToggle={onToggle} />
      ))}

      <p
        style={{
          fontSize: 12.5,
          color: C.muted,
          lineHeight: 1.7,
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <span style={{ color: C.accent, flexShrink: 0 }}>
          <Icon name="book" size={15} />
        </span>
        <span>
          The ideas come from the WBCS syllabus wording and the section headings of the
          standard texts, never invented. Where one does not match your book, it is wrong
          here rather than in the book — say so and it gets fixed.
        </span>
      </p>
    </div>
  );
}
