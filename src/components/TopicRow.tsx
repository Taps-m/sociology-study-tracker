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

const chip = {
  font: "inherit",
  fontSize: 11,
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
  optional = false,
}: {
  topic: Topic;
  d: Derived;
  onToggle: (topicId: string, check: CheckId) => void;
  onLogTime?: (topicId: string, check: CheckId, minutes: number) => void;
  onMarkPrior?: (topicId: string, check: CheckId) => void;
  onAttempt?: (topicId: string, marks: number, outOf: number, minutes: number) => void;
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
        <span style={{ fontSize: 12.5, color: atDepth || optional ? C.muted : C.text, lineHeight: 1.45 }}>
          {topic.name}
          {topic.pyq > 0 && (
            <Tag color={C.accent} title="times asked in WBCS Main since 2018">
              {topic.pyq}× asked
            </Tag>
          )}
          {depth > 0 && depth < 1 && <Tag>{depthLabel(depth)} depth</Tag>}
          {optional && <Tag>optional</Tag>}
        </span>
        <span style={{ fontSize: 11, color: atDepth ? C.accent : C.muted, whiteSpace: "nowrap" }}>
          {atDepth ? "at depth" : `${hoursLeftOn(d, topic)} h`}
        </span>
      </div>

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
        <span style={{ fontSize: 11, color: C.muted, alignSelf: "center", marginLeft: "auto" }}>
          {pct}%
        </span>
      </div>

      {asking && onLogTime && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: C.muted }}>roughly how long?</span>
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
            <span style={{ fontSize: 11, color: C.muted, marginRight: 10 }}>
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
              <span style={{ fontSize: 11, color: C.muted }}>/ 40 in</span>
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
        fontSize: 10,
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
        fontSize: 11,
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
