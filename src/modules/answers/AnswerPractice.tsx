import { useEffect, useRef, useState } from "react";
import type { PastQuestion } from "../../data/pyq";
import { TOPICS } from "../../data/syllabus";
import type { Topic } from "../../data/syllabus";
import type { Derived } from "../../lib/events";
import {
  attemptStats,
  queue,
  rubricAverages,
  selfMarkGap,
  questionsForTopic,
  questionsForUnit,
  attemptsOnQuestion,
} from "../../lib/planner";
import { evaluate, prepareUploads, MAX_PAGES, type Evaluation } from "../../lib/ai";
import { AnswerBlueprint } from "./AnswerBlueprint";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

const TARGET_MINUTES = 35;
const OUT_OF = 40;

const CRITERION_LABEL: Record<string, string> = {
  structure: "Structure",
  content: "Sociological content",
  thinkers: "Thinkers",
  examples: "Indian examples",
  demand: "Answered the demand",
};

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Write one answer, by hand, against the clock.
 *
 * Paper is the medium on purpose: a keyboard allows copy and paste, and an
 * answer that can be pasted is not an answer that can be written in a hall. The
 * camera bridges the gap — the page is photographed and read, so the structured
 * record survives without the shortcut.
 */
export function AnswerPractice({
  d,
  onAttempt,
}: {
  d: Derived;
  onAttempt: (
    topicId: string,
    marks: number,
    outOf: number,
    minutes: number,
    detail: {
      selfMark?: number;
      questionText?: string;
      group?: "A" | "B";
      legible?: boolean;
      scores?: Evaluation["scores"];
      readBack?: string;
    },
  ) => void;
}) {
  const suggested = queue(d).slice(0, 12);
  const [topicId, setTopicId] = useState(suggested[0]?.id ?? TOPICS[0]!.id);
  // A picked past question, or your own wording. Never both.
  const [picked, setPicked] = useState<PastQuestion | null>(null);
  const [question, setQuestion] = useState("");
  const [writingOwn, setWritingOwn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [selfMark, setSelfMark] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // The pages of one answer, in the order they were written.
  const [pages, setPages] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A question picked for the previous topic must not follow you to the next.
    setPicked(null);
    setWritingOwn(false);
    setPages([]);
  }, [topicId]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const topic = TOPICS.find((t) => t.id === topicId)!;
  const onTopic = questionsForTopic(topic.id);
  const nearby = onTopic.length === 0 ? questionsForUnit(topic.paper, topic.unit, topic.id) : [];
  const offered = onTopic.length > 0 ? onTopic : nearby;
  const questionText = picked ? picked.text : question.trim();
  const minutes = Math.max(1, Math.round(seconds / 60));
  const over = seconds > TARGET_MINUTES * 60;
  const stats = attemptStats(d);
  const averages = rubricAverages(d);
  const gap = selfMarkGap(d);

  function addPages(chosen: File[]) {
    setError(null);
    setPages((prev) => {
      const next = [...prev, ...chosen];
      if (next.length > MAX_PAGES) {
        setError(`An answer can be at most ${MAX_PAGES} pages. The extra ones were not added.`);
      }
      return next.slice(0, MAX_PAGES);
    });
  }

  async function readPages() {
    if (pages.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareUploads(pages);
      const res = await evaluate(
        {
          // questionText, not the textarea: a picked past question has to reach
          // the marker, or it is grading an answer against a question it cannot
          // see and the whole picker is decoration.
          question: questionText || `A 40-mark question on: ${topic.name}`,
          askedByWbcsIn: picked?.year,
          group: picked?.group,
          topic: topic.name,
          unit: topic.unit,
          paper: topic.paper === 1 ? "I" : "II",
          minutesTaken: minutes,
          targetMinutes: TARGET_MINUTES,
          pages: prepared.length,
        },
        prepared,
      );
      setResult(res.result);
      setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not read that file");
    }
    setBusy(false);
  }

  function save() {
    const scored = result
      ? Object.values(result.scores).reduce((s, n) => s + n, 0)
      : undefined;
    // Five criteria out of ten is a mark out of fifty; the paper is out of forty.
    const marks = scored !== undefined ? Math.round((scored / 50) * OUT_OF) : Number(selfMark);
    if (!Number.isFinite(marks)) return;

    onAttempt(topic.id, marks, OUT_OF, minutes, {
      selfMark: selfMark === "" ? undefined : Number(selfMark),
      questionText: questionText || undefined,
      // Recorded for the first time here. Group B is answered two-from-three
      // and is where candidates quietly lose marks, and the blind-spot report
      // could not see it while every attempt arrived without a group.
      group: picked?.group,
      scores: result?.scores,
      readBack: result?.readBack?.slice(0, 200),
      legible: result?.legible,
    });

    setSaved(true);
    setRunning(false);
    setSeconds(0);
    setSelfMark("");
    setResult(null);
    setQuestion("");
    setPicked(null);
    setWritingOwn(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="grid" style={{ gap: 13, maxWidth: 820 }}>
      <Card title="Write one answer">
        <label style={{ display: "block", fontSize: 14, color: C.muted, marginBottom: 6 }}>
          Topic
        </label>
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          style={{
            width: "100%",
            minHeight: 42,
            padding: "0 10px",
            borderRadius: 8,
            background: C.raised,
            border: `1px solid ${C.line}`,
            color: C.text,
            font: "inherit",
            fontSize: 14.5,
            marginBottom: 14,
          }}
        >
          {suggested.length > 0 && (
            <optgroup label="Next in your queue">
              {suggested.map((t: Topic) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Everything else">
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        </select>

        <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          {onTopic.length > 0
            ? `WBCS has asked this topic ${onTopic.length} ${onTopic.length === 1 ? "time" : "times"} since 2018. Pick one to answer.`
            : nearby.length > 0
              ? `WBCS has not asked this topic directly since 2018. Here is what it asked elsewhere in ${topic.unit} — the examiner's own phrasing, on neighbouring ground.`
              : "No past question on this topic, or anywhere in its unit, between 2018 and 2023."}
        </div>

        {offered.length > 0 && (
          <div style={{ display: "grid", gap: 7, maxHeight: 300, overflowY: "auto" }}>
            {offered.map((q) => {
              const on = picked?.text === q.text;
              const before = attemptsOnQuestion(d, q.text);
              const last = before[before.length - 1];
              return (
                <button
                  key={`${q.year}-${q.paper}-${q.number}`}
                  onClick={() => {
                    setPicked(on ? null : q);
                    setWritingOwn(false);
                  }}
                  aria-pressed={on}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    font: "inherit",
                    background: on ? C.accentSoft : C.raised,
                    border: `1px solid ${on ? C.accent : C.line}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      fontSize: 12,
                      color: on ? C.accent : C.muted,
                      fontFamily: C.mono,
                      letterSpacing: "0.06em",
                    }}
                  >
                    <span>{q.year}</span>
                    <span>·</span>
                    <span>Paper {q.paper === 1 ? "I" : "II"}</span>
                    <span>·</span>
                    <span>Group {q.group}</span>
                    <span>·</span>
                    <span>{q.marks} marks</span>
                    {last && (
                      // Written before, and what it scored. The point of keeping
                      // a record is that it can tell you this.
                      <span style={{ color: C.warn, letterSpacing: 0 }}>
                        · written {last.at.slice(0, 10)} — {last.marks}/{last.outOf}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 5, color: C.text }}>
                    {q.text}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => {
            setWritingOwn(!writingOwn);
            setPicked(null);
          }}
          style={{
            marginTop: offered.length > 0 ? 10 : 0,
            padding: 0,
            background: "none",
            border: "none",
            color: C.muted,
            font: "inherit",
            fontSize: 13,
            textDecoration: "underline",
            textUnderlineOffset: 3,
            cursor: "pointer",
          }}
        >
          {writingOwn ? "Never mind" : "Write my own question, or answer without one"}
        </button>

        {writingOwn && (
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Paste a question, or leave this empty and just write on the topic."
            style={{
              width: "100%",
              marginTop: 8,
              padding: 10,
              borderRadius: 8,
              background: C.raised,
              border: `1px solid ${C.line}`,
              color: C.text,
              font: "inherit",
              fontSize: 14.5,
              resize: "vertical",
            }}
          />
        )}
      </Card>

      {questionText && (
        <AnswerBlueprint
          question={questionText}
          topic={topic.name}
          unit={topic.unit}
          paper={topic.paper}
          weak={Boolean(
            result && Object.values(result.scores).reduce((a, b) => a + b, 0) / 50 < 0.5,
          )}
        />
      )}

      <Card title="The clock">
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <span
            className="num"
            style={{ fontSize: 44, lineHeight: 1, color: over ? C.warn : C.text }}
          >
            {mmss(seconds)}
          </span>
          <span style={{ fontSize: 14, color: C.muted }}>
            of {TARGET_MINUTES}:00
            {over && <strong style={{ color: C.warn }}> · over the budget</strong>}
          </span>

          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              onClick={() => setRunning(!running)}
              style={{
                minHeight: 44,
                padding: "0 18px",
                borderRadius: 9,
                border: "none",
                background: C.accent,
                color: C.accentInk,
                font: "inherit",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {running ? "Pause" : seconds === 0 ? "Start writing" : "Resume"}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setSeconds(0);
              }}
              style={{
                minHeight: 44,
                padding: "0 14px",
                borderRadius: 9,
                border: `1px solid ${C.line}`,
                background: "transparent",
                color: C.muted,
                font: "inherit",
                fontSize: 14.5,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
          Five answers in 180 minutes is 35 minutes each. Write on paper — the
          constraint is the point.
        </p>
      </Card>

      <Card title="What do you think you scored?">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            type="number"
            min={0}
            max={OUT_OF}
            value={selfMark}
            onChange={(e) => setSelfMark(e.target.value)}
            placeholder="out of 40"
            style={{
              width: 130,
              minHeight: 42,
              padding: "0 12px",
              borderRadius: 8,
              background: C.raised,
              border: `1px solid ${C.line}`,
              color: C.text,
              font: "inherit",
              fontSize: 15,
            }}
          />
          <span style={{ fontSize: 13.5, color: C.muted }}>
            Optional, and worth doing before the score appears.
            {gap.averageGap !== null && (
              <>
                {" "}
                So far you have been out by{" "}
                <span className="num" style={{ color: C.text }}>
                  {gap.averageGap > 0 ? "+" : ""}
                  {gap.averageGap}
                </span>{" "}
                marks across {gap.n}.
              </>
            )}
          </span>
        </div>
      </Card>

      <Card title="Have it read">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            addPages(Array.from(e.target.files ?? []));
            // Cleared so the same page can be picked again after a removal.
            e.target.value = "";
          }}
          style={{ fontSize: 14 }}
        />
        <p style={{ fontSize: 12.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.6 }}>
          Photograph every side you wrote — a 40-mark answer usually runs to three or four,
          and they are read as one continuous piece in the order below. Up to {MAX_PAGES}.
          Images are resized in your browser, sent to be read, and never stored; only the
          scores are kept.
        </p>

        {pages.length > 0 && (
          <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {pages.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 11px",
                  borderRadius: 8,
                  background: C.raised,
                  border: `1px solid ${C.line}`,
                  fontSize: 13.5,
                }}
              >
                <span className="num" style={{ color: C.muted, flex: "0 0 auto" }}>
                  Page {i + 1}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: C.muted,
                  }}
                >
                  {f.name}
                </span>
                <button
                  onClick={() => setPages((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove page ${i + 1}`}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: C.muted,
                    font: "inherit",
                    fontSize: 16,
                    lineHeight: 1,
                    cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {pages.length > 0 && (
          <button
            onClick={() => void readPages()}
            disabled={busy}
            style={{
              width: "100%",
              minHeight: 44,
              marginTop: 12,
              borderRadius: 9,
              border: "none",
              background: busy ? C.panel : C.accent,
              color: busy ? C.muted : C.accentInk,
              font: "inherit",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy
              ? "Reading…"
              : `Have ${pages.length} ${pages.length === 1 ? "page" : "pages"} read`}
          </button>
        )}

        {busy && (
          <p style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>
            Reading {pages.length} {pages.length === 1 ? "page" : "pages"} as one answer…
          </p>
        )}
        {error && (
          <p style={{ fontSize: 13.5, color: C.warn, marginTop: 12, lineHeight: 1.6 }}>
            {error}. You can still save the attempt with your own mark.
          </p>
        )}

        {result && (
          <div className="fade-in" style={{ marginTop: 16 }}>
            {!result.legible && (
              <p style={{ fontSize: 13.5, color: C.warn, lineHeight: 1.6 }}>
                The handwriting could not be read with confidence. Treat these
                scores as unreliable and keep your own mark as the record.
              </p>
            )}

            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              Read as: “{result.readBack}…”
            </p>

            <div style={{ marginTop: 12 }}>
              {Object.entries(result.scores).map(([k, v]) => (
                <div key={k} style={{ padding: "6px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      color: C.muted,
                      marginBottom: 4,
                    }}
                  >
                    <span>{CRITERION_LABEL[k] ?? k}</span>
                    <span className="num" style={{ color: C.text }}>
                      {v}/10
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "var(--line)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(v / 10) * 100}%`,
                        height: "100%",
                        background: v >= 7 ? "var(--good)" : v >= 5 ? "var(--warn)" : "#dc2626",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 14.5, lineHeight: 1.75, marginTop: 14 }}>
              <strong>Weakest: {CRITERION_LABEL[result.weakest] ?? result.weakest}.</strong>{" "}
              {result.rewrite}
            </p>
          </div>
        )}

        <button
          onClick={save}
          disabled={!result && selfMark === ""}
          style={{
            width: "100%",
            minHeight: 46,
            marginTop: 16,
            borderRadius: 9,
            border: "none",
            background: !result && selfMark === "" ? C.line : C.accent,
            color: !result && selfMark === "" ? C.muted : C.accentInk,
            font: "inherit",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: !result && selfMark === "" ? "default" : "pointer",
          }}
        >
          Save this attempt
        </button>
        {saved && (
          <p style={{ fontSize: 13.5, color: "var(--good)", margin: "10px 0 0", lineHeight: 1.65 }}>
            Saved. A weak answer does not reopen the topic today — it comes back in a week,
            which is when returning to something makes it stick rather than simply punishing
            you for having written it.
          </p>
        )}
      </Card>

      {stats.total > 0 && (
        <Card title={`${stats.total} answers written`}>
          <p style={{ fontSize: 14.5, margin: "0 0 12px" }}>
            Average <span className="num">{stats.averagePercent}%</span>
          </p>
          {averages.some((a) => a.average !== null) && (
            <div>
              {averages.map((a) => (
                <div
                  key={a.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    padding: "5px 0",
                    color: C.muted,
                  }}
                >
                  <span>{CRITERION_LABEL[a.key]}</span>
                  <span className="num" style={{ color: C.text }}>
                    {a.average === null ? "—" : `${a.average}/10`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
