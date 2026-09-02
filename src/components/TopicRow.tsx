import { useState } from "react";
import type { Topic } from "../data/syllabus";
import type { CheckId, Derived } from "../lib/events";
import {
  CHECKS,
  attemptsFor,
  checksFor,
  completionOf,
  depthFor,
  depthLabel,
  hoursLeftOn,
  isAtDepth,
} from "../lib/planner";
import { C } from "../lib/theme";
import { chapterUrl, readingLine, readingsFor } from "../data/sources";
import {
  notOnDesk,
  standardReadingsFor,
  stdJump,
  stdLine,
} from "../data/standardBooks";
import { chapterBadge, TOTAL_QUESTIONS } from "../data/weightage";
import { TopicCheatSheet } from "../modules/topics/TopicCheatSheet";
import { NoteEditor } from "./NoteEditor";

const chip = {
  font: "inherit",
  fontSize: 12.5,
  padding: "6px 10px",
  minHeight: 32,
  borderRadius: 4,
  cursor: "pointer",
  background: "transparent",
  color: C.text,
  border: `1px solid ${C.line}`,
} as const;

export function TopicRow({
  topic,
  d,
  onToggle,
  onLogTime,
  onMarkPrior,
  onAttempt,
  onNote,
  optional = false,
}: {
  topic: Topic;
  d: Derived;
  onToggle: (topicId: string, check: CheckId) => void;
  onLogTime?: (topicId: string, check: CheckId, minutes: number) => void;
  onMarkPrior?: (topicId: string, check: CheckId) => void;
  onAttempt?: (topicId: string, marks: number, outOf: number, minutes: number) => void;
  onNote?: (topicId: string, text: string) => void;
  optional?: boolean;
}) {
  const [asking, setAsking] = useState<CheckId | null>(null);
  const [logging, setLogging] = useState(false);
  const [marks, setMarks] = useState("");
  const [minutes, setMinutes] = useState("");

  const done = checksFor(d, topic.id);
  const pct = Math.round(completionOf(d, topic.id) * 100);
  const depth = depthFor(d, topic);
  const atDepth = isAtDepth(d, topic);
  const attempts = attemptsFor(d, topic.id);

  let acc = 0;

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.hair}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 14, color: atDepth || optional ? C.muted : C.text, lineHeight: 1.45 }}>
          {topic.name}
          {topic.pyq > 0 && (
            <Tag color={C.accent} title="times asked in WBCS Main since 2018">
              {topic.pyq}× asked
            </Tag>
          )}
          {depth > 0 && depth < 1 && <Tag>{depthLabel(depth)} depth</Tag>}
          {optional && <Tag>optional</Tag>}
        </span>
        <span style={{ fontSize: 12.5, color: atDepth ? C.accent : C.muted, whiteSpace: "nowrap" }}>
          {atDepth ? "at depth" : `${hoursLeftOn(d, topic)} h`}
        </span>
      </div>

      <WhereToRead topicId={topic.id} />

      <TopicCheatSheet topic={topic} />

      {onNote && <NoteEditor topicId={topic.id} d={d} onSave={onNote} />}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
        {CHECKS.map((c) => {
          const rec = done[c.id];
          const on_ = Boolean(rec);
          acc += c.weight;
          const beyond = acc > depth + 0.001;
          return (
            <button
              key={c.id}
              onClick={() => {
                onToggle(topic.id, c.id);
                setAsking(on_ ? null : c.id);
              }}
              title={
                on_
                  ? rec?.prior
                    ? "you already knew this"
                    : `ticked ${rec?.at.slice(0, 10)}`
                  : beyond
                    ? "beyond the depth this topic needs"
                    : "not done"
              }
              style={{
                ...chip,
                opacity: beyond && !on_ ? 0.4 : 1,
                color: on_ ? C.accent : C.muted,
                border: `1px ${beyond ? "dashed" : "solid"} ${on_ ? C.accent : C.line}`,
              }}
            >
              {on_ ? "✓ " : ""}
              {c.label}
            </button>
          );
        })}
        <span style={{ fontSize: 12.5, color: C.muted, alignSelf: "center", marginLeft: "auto" }}>
          {pct}%
        </span>
      </div>

      {asking && onLogTime && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: C.muted }}>roughly how long?</span>
          {([["30m", 30], ["1h", 60], ["2h", 120], ["3h+", 180]] as const).map(([label, mins]) => (
            <button
              key={label}
              onClick={() => {
                onLogTime(topic.id, asking, mins);
                setAsking(null);
              }}
              style={chip}
            >
              {label}
            </button>
          ))}
          {onMarkPrior && (
            <button
              onClick={() => {
                onMarkPrior(topic.id, asking);
                setAsking(null);
              }}
              title="counts as done, but not as work done now"
              style={{ ...chip, color: C.muted, border: `1px dashed ${C.line}` }}
            >
              already knew it
            </button>
          )}
          <button
            onClick={() => setAsking(null)}
            style={{ ...chip, border: "none", color: C.muted }}
          >
            skip
          </button>
        </div>
      )}

      {onAttempt && (
        <div style={{ marginTop: 9 }}>
          {attempts.length > 0 && (
            <span style={{ fontSize: 12.5, color: C.muted, marginRight: 10 }}>
              {attempts.length} answer{attempts.length > 1 ? "s" : ""} written ·{" "}
              {Math.round(
                (attempts.reduce((s, a) => s + a.marks, 0) /
                  attempts.reduce((s, a) => s + a.outOf, 0)) *
                  100,
              )}
              %
            </span>
          )}
          {!logging ? (
            <button
              onClick={() => setLogging(true)}
              style={{ ...chip, border: "none", color: C.muted, padding: "6px 0" }}
            >
              + log an answer
            </button>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Num value={marks} onChange={setMarks} placeholder="marks" />
              <span style={{ fontSize: 12.5, color: C.muted }}>/ 40 in</span>
              <Num value={minutes} onChange={setMinutes} placeholder="mins" />
              <button
                onClick={() => {
                  const m = Number(marks);
                  const t = Number(minutes);
                  if (Number.isFinite(m) && m >= 0 && Number.isFinite(t) && t > 0) {
                    onAttempt(topic.id, m, 40, t);
                  }
                  setMarks("");
                  setMinutes("");
                  setLogging(false);
                }}
                style={{ ...chip, color: C.accent, border: `1px solid ${C.accent}` }}
              >
                Save
              </button>
              <button
                onClick={() => setLogging(false)}
                style={{ ...chip, border: "none", color: C.muted }}
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The one line that answers "yes, but where do I read this?".
 *
 * Starting an optional from nothing, the hard part is not reading, it is not
 * knowing which twenty pages to read. So this names a chapter and links the
 * PDF rather than naming a book and wishing you luck.
 *
 * Two shelves, kept visibly apart. NCERT is free and downloadable and is where
 * a topic is understood the first time; the three standard books are what a
 * 40-mark answer is written out of. A chapter that only touches the topic says
 * so, because sending someone to read a background chapter under the
 * impression it will finish the topic is how a plan quietly falls behind.
 */
function WhereToRead({ topicId }: { topicId: string }) {
  const readings = readingsFor(topicId);
  const standard = standardReadingsFor(topicId);

  if (readings.length === 0 && standard.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
        No chapter for this in NCERT or in the three standard books — it needs
        current affairs and your own notes.
      </div>
    );
  }

  const shelf = {
    fontFamily: C.mono,
    fontSize: 10.5,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: C.muted,
    marginTop: 9,
  };

  return (
    <div style={{ marginTop: 7 }}>
      {readings.length > 0 && (
        <>
          <div style={shelf}>Free · NCERT</div>
          <div style={{ marginTop: 4, display: "grid", gap: 3 }}>
            {readings.map((r) => (
              <a
                key={`${r.book}-${r.chapter}`}
                href={chapterUrl(r.book, r.chapter)}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: r.kind === "covers" ? C.accent : C.muted,
                  textDecoration: "none",
                }}
              >
                {r.kind === "background" ? "background · " : "read · "}
                <span style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {readingLine(r)}
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      {standard.length > 0 && (
        <>
          <div style={shelf}>Standard books</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
            Percentages are counted from the {TOTAL_QUESTIONS} real questions of the last ten
            years, not from anybody's guess at what matters.
          </div>
          <div style={{ marginTop: 4, display: "grid", gap: 3 }}>
            {standard.map((r) => {
              const stranded = notOnDesk(r);
              const jump = stdJump(r);
              const badge = chapterBadge(r);
              return (
                <div
                  key={`${r.book}-${r.chapter}-${r.from ?? 0}`}
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: stranded ? C.muted : r.kind === "covers" ? C.text : C.muted,
                    opacity: stranded ? 0.7 : 1,
                  }}
                >
                  {r.kind === "background" ? "background · " : "read · "}
                  {stdLine(r)}
                  {jump !== null && !stranded && (
                    <span className="num" style={{ color: C.muted }}> · PDF p. {jump}</span>
                  )}
                  {stranded && (
                    <span style={{ color: C.warn }}> · not in the copy you have</span>
                  )}
                  {/*
                    What the whole chapter is worth and how long it runs. Two
                    facts, no verdict: the queue already decides the order, and
                    a percentage that told you to skip something would be
                    guessing on your behalf about a paper that offers choice.
                  */}
                  {badge && r.kind === "covers" && !stranded && (
                    <div
                      title={badge.full}
                      style={{
                        fontSize: 11.5,
                        color: C.muted,
                        marginTop: 2,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {badge.short}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Tag({
  children,
  color = C.muted,
  title,
}: {
  children: React.ReactNode;
  color?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        fontSize: 12,
        color,
        border: `1px solid ${C.line}`,
        borderRadius: 3,
        padding: "1px 5px",
        marginLeft: 8,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Num({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        font: "inherit",
        fontSize: 12.5,
        width: 64,
        minHeight: 32,
        padding: "6px 8px",
        borderRadius: 4,
        background: C.panel,
        color: C.text,
        border: `1px solid ${C.line}`,
      }}
    />
  );
}
