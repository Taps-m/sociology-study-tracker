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
  attemptTrend,
  lastAnswer,
  RUBRIC_OUT_OF,
} from "../../lib/planner";
import { evaluate, prepareUploads, MAX_PAGES, type Evaluation } from "../../lib/ai";
import { AnswerBlueprint } from "./AnswerBlueprint";
import { confirmedWeakness } from "../../lib/drill";
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
const arrow = (off: boolean): React.CSSProperties => ({
  border: "none",
  background: "transparent",
  color: off ? C.line : C.muted,
  font: "inherit",
  fontSize: 13,
  lineHeight: 1,
  padding: "2px 4px",
  cursor: off ? "default" : "pointer",
});

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
      rubricOutOf?: number;
      weakest?: string;
      rewrite?: string;
      working?: string;
      aided?: boolean;
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
  /*
   * Whether this answer had help.
   *
   * Observed rather than asked for — the app knows when the skeleton was
   * opened — but confirmable, because observation gets it wrong in both
   * directions: someone opens the skeleton after writing, to compare, and
   * someone writes with last week's skeleton still in their notebook. The
   * toggle below the pages is pre-set from what was observed and takes one tap
   * to correct, which is the most honest version that costs nobody anything.
   */
  const [aided, setAided] = useState(false);
  // The pages of one answer, in the order they were written.
  const [pages, setPages] = useState<File[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
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

  /**
   * A picture of each page, so you can see what you actually picked.
   *
   * It used to list file names. "IMG_2043.jpg" tells you nothing about which
   * side of the answer it is, whether it is the right photograph, or whether it
   * is even the right answer — and the pages are read in order as one
   * continuous piece, so picking them up in the wrong order quietly changes
   * what the marker sees.
   *
   * Revoked when the list changes: an object URL is held by the browser until
   * it is let go, and this screen can churn through a lot of them.
   */
  useEffect(() => {
    const urls = pages.map((f) => (f.type === "application/pdf" ? "" : URL.createObjectURL(f)));
    setThumbs(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [pages]);

  function movePage(from: number, to: number) {
    setPages((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

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
          // How many answers this candidate has written before this one. A
          // first attempt is marked with the same honesty and a shorter list
          // of faults — see the evaluate prompt.
          answersWrittenSoFar: stats.total,
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
    // Five criteria out of eight is the forty the paper is marked out of. The
    // scores are the mark; there is nothing to convert.
    const marks = scored !== undefined ? Math.round(scored) : Number(selfMark);
    if (!Number.isFinite(marks)) return;

    onAttempt(topic.id, marks, OUT_OF, minutes, {
      selfMark: selfMark === "" ? undefined : Number(selfMark),
      rubricOutOf: RUBRIC_OUT_OF,
      // Kept, not just displayed. The advice is worth something at the moment
      // the topic is written again, and that is days after this screen closes.
      weakest: result?.weakest,
      rewrite: result?.rewrite,
      working: result?.working,
      aided,
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

  // What this topic has scored before, oldest first. Read before writing, not
  // after: a mark you are trying to beat is a target, the same mark discovered
  // afterwards is only a verdict.
  const trend = attemptTrend(d, topicId);
  const last = lastAnswer(d, topicId);
  const pattern = confirmedWeakness(d);

  return (
    <div className="grid" style={{ gap: 13, maxWidth: 820 }}>
      {trend && (
        <Card title={`You have written this topic ${trend.count}×`}>
          <p style={{ fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            <span className="num">
              {trend.entries.map((e, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: C.muted }}> → </span>}
                  <span
                    title={e.aided ? "written with the skeleton open" : "written on your own"}
                    style={{
                      fontSize: i === trend.entries.length - 1 ? 24 : 16,
                      fontWeight: i === trend.entries.length - 1 ? 700 : 400,
                      color: i === trend.entries.length - 1 ? C.text : C.muted,
                    }}
                  >
                    {e.marks}
                    {e.aided && (
                      <span style={{ fontSize: 12, color: C.muted, verticalAlign: "super" }}>
                        {" "}
                        aided
                      </span>
                    )}
                  </span>
                </span>
              ))}
              <span style={{ color: C.muted, fontSize: 15 }}> / {OUT_OF}</span>
            </span>
          </p>
          {/*
            Where the marks actually went last time.

            "22/40" says the answer was weak; "you dropped 6 on thinkers and 5
            on examples" says what to do on Tuesday — and it is the same data,
            stored per criterion all along and shown only as a total. Ordered by
            marks lost rather than by score, so the top row is always the one
            worth an hour, and the criteria that cost nothing are not listed at
            all: a clean sheet is not feedback.
          */}
          {last && last.totalLost > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 7px" }}>
                Where the {last.totalLost} marks went, {last.at.slice(0, 10)}
              </p>
              <div style={{ display: "grid", gap: 5 }}>
                {last.lost
                  .filter((l) => l.lost > 0)
                  .map((l) => (
                    <div
                      key={l.key}
                      style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5 }}
                    >
                      <span style={{ flex: "0 0 128px", color: C.text }}>
                        {CRITERION_LABEL[l.key] ?? l.key}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          background: "var(--line)",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            width: `${(l.lost / last.outOfEach) * 100}%`,
                            height: "100%",
                            background: C.warn,
                          }}
                        />
                      </span>
                      <span
                        className="num"
                        style={{ flex: "0 0 62px", textAlign: "right", color: C.warn }}
                      >
                        −{l.lost} mark{l.lost === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
              </div>
              {last.rewrite && (
                <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: "11px 0 0" }}>
                  <strong>
                    Told last time
                    {last.weakest ? ` about ${(CRITERION_LABEL[last.weakest] ?? last.weakest).toLowerCase()}` : ""}:
                  </strong>{" "}
                  {last.rewrite}
                </p>
              )}
            </div>
          )}

          {/*
            The verdict is read off the unaided answers where there are two of
            them, and off everything only as a fallback. An aided answer is a
            measure of the scaffolding, not of the candidate, and saying "up 9
            marks" on the strength of one is how an app tells someone they are
            ready when they are not.
          */}
          <p style={{ fontSize: 13.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
            {trend.unaidedChange !== null
              ? trend.unaidedChange > 0
                ? `On your own: ${trend.unaided.join(" → ")}. Up ${trend.unaidedChange} without help, which is the number that counts.`
                : trend.unaidedChange < 0
                  ? `On your own: ${trend.unaided.join(" → ")}. That has gone backwards, and the aided marks do not offset it.`
                  : `On your own: ${trend.unaided.join(" → ")}. Flat without help — the same gap twice.`
              : trend.count === 1
                ? `Beat ${trend.first} today and the practice is working.`
                : trend.unaided.length < 2 && trend.entries.some((e) => e.aided)
                  ? `Only ${trend.unaided.length} of these ${trend.count} was written unaided, so there is nothing yet to compare. One more closed-book answer and this becomes a trend.`
                  : trend.change > 0
                    ? `Up ${trend.change} marks since the first. Your best is ${trend.best} — that is the one to beat.`
                    : trend.change < 0
                      ? `Your best on this topic is ${trend.best}. The last one came in under it, which is worth a look before you write again.`
                      : `Flat across ${trend.count} answers. Same mark twice usually means the same gap twice.`}
          </p>
        </Card>
      )}

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
          topicId={topic.id}
          topic={topic.name}
          unit={topic.unit}
          paper={topic.paper}
          weak={Boolean(
            result && Object.values(result.scores).reduce((a, b) => a + b, 0) / OUT_OF < 0.5,
          )}
          missed={last ? { lost: last.lost, advice: last.rewrite } : undefined}
          pattern={
            pattern ? { key: pattern.dimension, times: pattern.times, of: pattern.of } : undefined
          }
          onOpened={() => setAided(true)}
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
          style={{ display: "none" }}
        />
        {/*
          The browser's own file input said "No file chosen" and gave no hint
          that more than one could be picked at a time — which is the whole
          shape of this task, since an answer is three or four sides.
        */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={pages.length >= MAX_PAGES}
          title="Pick the photographs of your answer. Select several at once — hold Ctrl or Cmd, or drag a box around them."
          style={{
            minHeight: 42,
            padding: "0 17px",
            borderRadius: 9,
            border: "none",
            background: pages.length >= MAX_PAGES ? C.raised : C.accent,
            color: pages.length >= MAX_PAGES ? C.muted : C.accentInk,
            font: "inherit",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: pages.length >= MAX_PAGES ? "default" : "pointer",
          }}
        >
          {pages.length === 0
            ? "Choose the pages"
            : pages.length >= MAX_PAGES
              ? `${MAX_PAGES} pages — that is the limit`
              : "Add more pages"}
        </button>
        <span style={{ fontSize: 12.5, color: C.muted, marginLeft: 10 }}>
          you can pick several at once
        </span>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.6 }}>
          Photograph every side you wrote — a 40-mark answer usually runs to three or four,
          and they are read as one continuous piece in the order below. Up to {MAX_PAGES}.
          Images are resized in your browser, sent to be read, and never stored; only the
          scores are kept.
        </p>

        {pages.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
              gap: 10,
              marginTop: 14,
            }}
          >
            {pages.map((f, i) => (
              <figure
                key={`${f.name}-${i}`}
                style={{
                  margin: 0,
                  borderRadius: 9,
                  overflow: "hidden",
                  border: `1px solid ${C.line}`,
                  background: C.raised,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: 132,
                    display: "grid",
                    placeItems: "center",
                    background: C.panel,
                  }}
                >
                  {thumbs[i] ? (
                    <img
                      src={thumbs[i]}
                      alt={`Page ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 12.5, color: C.muted }}>PDF</span>
                  )}
                  <span
                    className="num"
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 999,
                      background: C.accent,
                      color: C.accentInk,
                    }}
                  >
                    {i + 1}
                  </span>
                  <button
                    onClick={() => setPages((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove page ${i + 1}`}
                    title="Take this page out"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      border: "none",
                      background: C.page,
                      color: C.text,
                      font: "inherit",
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
                <figcaption
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    padding: "5px 6px",
                    fontSize: 11.5,
                    color: C.muted,
                  }}
                >
                  {/* Order matters: the pages are read as one continuous piece. */}
                  <button
                    onClick={() => movePage(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move page ${i + 1} earlier`}
                    title="Move this page earlier"
                    style={arrow(i === 0)}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => movePage(i, i + 1)}
                    disabled={i === pages.length - 1}
                    aria-label={`Move page ${i + 1} later`}
                    title="Move this page later"
                    style={arrow(i === pages.length - 1)}
                  >
                    →
                  </button>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "right",
                    }}
                    title={f.name}
                  >
                    {f.name}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
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

            {/*
              The mark, on the one scale this app uses.

              The rubric used to be five criteria out of ten, which adds to
              fifty, next to a paper marked out of forty — so the screen said
              33, the history said 26, and nothing on the page connected them.
              Relabelling did not fix it, because the numbers still did not add
              up to the number that mattered. Eight marks a criterion does:
              five eights are forty, the five scores ARE the mark, and there is
              no conversion left anywhere to be out of step with.
            */}
            <p style={{ fontSize: 15, margin: "12px 0 0", lineHeight: 1.5 }}>
              <span className="num" style={{ fontSize: 30, fontWeight: 700, color: C.accent }}>
                {Math.round(Object.values(result.scores).reduce((x, y) => x + y, 0))}
              </span>
              <span style={{ fontSize: 17, color: C.muted }}> / {OUT_OF}</span>
            </p>

            {result.working && (
              <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: "10px 0 0" }}>
                <strong style={{ color: "var(--good)" }}>Working already:</strong>{" "}
                {result.working}
              </p>
            )}

            <p style={{ fontSize: 12.5, color: C.muted, margin: "16px 0 0" }}>
              How that mark was reached — five criteria, {RUBRIC_OUT_OF} marks each
            </p>

            <div style={{ marginTop: 6 }}>
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
                      {v}/{RUBRIC_OUT_OF}
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
                        width: `${(v / RUBRIC_OUT_OF) * 100}%`,
                        height: "100%",
                        background:
                          v / RUBRIC_OUT_OF >= 0.7
                            ? "var(--good)"
                            : v / RUBRIC_OUT_OF >= 0.5
                              ? "var(--warn)"
                              : "#dc2626",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/*
              "Weakest" is a verdict; "fix this first" is an instruction.

              They point at the same criterion and the second is the one a
              candidate three answers into the subject can act on. The verdict
              comes back once there is a body of work to be a verdict about.
            */}
            <p style={{ fontSize: 14.5, lineHeight: 1.75, marginTop: 14 }}>
              <strong>
                {stats.total < 3 ? "Fix this first" : "Weakest"}:{" "}
                {CRITERION_LABEL[result.weakest] ?? result.weakest}.
              </strong>{" "}
              {result.rewrite}
            </p>
          </div>
        )}

        {/*
          One tap, asked once, that keeps every trend in the app honest.

          The skeleton is briefed with the criteria this candidate keeps
          dropping, so an aided answer scores better whether or not they got
          better. Unasked, the app would report that as improvement and the
          first person to find out otherwise would be him, in the hall.
        */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13.5, color: C.text, margin: "0 0 7px" }}>
            How did you write it?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([
              [false, "On my own", "closed book, no skeleton"],
              [true, "With help open", "skeleton or model answer in front of you"],
            ] as const).map(([val, label, why]) => (
              <button
                key={label}
                onClick={() => setAided(val)}
                title={why}
                style={{
                  flex: "1 1 170px",
                  minHeight: 44,
                  padding: "8px 13px",
                  borderRadius: 9,
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                  background: aided === val ? C.accentSoft : "transparent",
                  color: C.text,
                  border: `1px solid ${aided === val ? C.accent : C.line}`,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: aided === val ? 650 : 500 }}>
                  {aided === val ? "✓ " : ""}
                  {label}
                </span>
                <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {why}
                </span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.6 }}>
            Only answers written on your own are counted towards whether you are
            improving. The exam hall has no skeleton in it.
          </p>
        </div>

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
                    {a.average === null ? "—" : `${a.average}/${RUBRIC_OUT_OF}`}
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
