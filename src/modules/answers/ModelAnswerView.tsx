import type { ReactNode } from "react";
import type { Diagram as DiagramData, ModelAnswer, ModelAnswerPart } from "../../lib/ai";
import { C } from "../../lib/theme";

/**
 * A written answer, marked up the way the scripts are.
 *
 * The model returns the phrases to underline verbatim from its own text rather
 * than emitting markup, so the marking is applied here and cannot arrive half
 * broken. A phrase that does not appear in the text is simply not marked — a
 * missing underline is invisible, a mangled sentence is not.
 */

/** Underline the given phrases where they appear, longest first. */
function marked(text: string, phrases: string[]): ReactNode {
  const wanted = [...new Set(phrases.filter(Boolean))].sort((a, b) => b.length - a.length);
  let pieces: ReactNode[] = [text];

  for (const phrase of wanted) {
    const next: ReactNode[] = [];
    let done = false;
    for (const piece of pieces) {
      if (done || typeof piece !== "string") {
        next.push(piece);
        continue;
      }
      const at = piece.indexOf(phrase);
      if (at === -1) {
        next.push(piece);
        continue;
      }
      next.push(
        piece.slice(0, at),
        <span
          key={`${phrase}-${at}`}
          style={{
            textDecoration: "underline",
            textUnderlineOffset: 3,
            textDecorationColor: C.accent,
            textDecorationThickness: 1.5,
          }}
        >
          {phrase}
        </span>,
        piece.slice(at + phrase.length),
      );
      done = true;
    }
    pieces = next;
  }
  return pieces;
}

/** Says at a glance whether a part must appear as given, or is yours to fill. */
function MustBadge({ must }: { must?: "core" | "yours" }) {
  if (!must) return null;
  const core = must === "core";
  return (
    <span
      style={{
        flex: "0 0 auto",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 999,
        color: core ? C.warn : C.good,
        background: core ? C.warnSoft : C.goodSoft,
      }}
    >
      {core ? "must include" : "your own"}
    </span>
  );
}

/**
 * One part of the answer, dressed so the shape is visible before it is read.
 *
 * It was all one column of grey paragraphs, which is exactly what an answer
 * must not be — the whole point of the form is that an examiner can see the
 * structure at a glance. Each kind of part now has its own surface: blocks sit
 * in cards so they read as blocks and not prose, the signpost is a heading, the
 * pivot is tinted because it is the hinge of the answer, and the close is the
 * one green thing on the page because it is the only part that takes a
 * position. Colour carries the same information the layout does, never
 * information of its own.
 */
function Part({ part, index }: { part: ModelAnswerPart; index: number | null }) {
  if (part.kind === "signpost") {
    return (
      <p
        style={{
          fontSize: 15.5,
          fontWeight: 700,
          margin: "26px 0 0",
          paddingBottom: 6,
          borderBottom: `2px solid ${C.accent}`,
          color: C.accent,
        }}
      >
        {part.text}
      </p>
    );
  }

  if (part.kind === "pivot" || part.kind === "close") {
    const close = part.kind === "close";
    return (
      <div
        style={{
          margin: "20px 0 0",
          padding: "13px 15px",
          borderRadius: 10,
          background: close ? C.goodSoft : C.accentSoft,
          borderLeft: `3px solid ${close ? C.good : C.accent}`,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}
        >
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: close ? C.good : C.accent,
              fontWeight: 700,
            }}
          >
            {close ? "Take a position" : "Turn the answer"}
          </span>
          <MustBadge must={part.must} />
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.85, margin: 0 }}>
          {marked(part.text, part.underline)}
        </p>
      </div>
    );
  }

  if (part.kind === "opening") {
    return (
      <div style={{ margin: "14px 0 0" }}>
        <MustBadge must={part.must} />
          <p
          style={{
            fontSize: 15.5,
            lineHeight: 1.85,
            margin: "6px 0 0",
            paddingLeft: 13,
            borderLeft: `3px solid ${C.line}`,
            color: C.text,
          }}
        >
          {marked(part.text, part.underline)}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "12px 0 0",
        padding: "12px 14px",
        borderRadius: 10,
        background: C.raised,
        border: `1px solid ${C.hair}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        {index !== null && (
          <span className="num" style={{ fontSize: 13, color: C.muted }}>
            {String.fromCharCode(97 + index)})
          </span>
        )}
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            padding: "2px 9px",
            borderRadius: 6,
            background: C.accent,
            color: C.accentInk,
          }}
        >
          {part.keyword}
        </span>
        <MustBadge must={part.must} />
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.8, margin: "8px 0 0" }}>
        {marked(part.text, part.underline)}
      </p>
      {(part.thinker || part.specific) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {part.thinker && (
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: C.panel,
                border: `1px solid ${C.line}`,
                color: C.muted,
              }}
            >
              {part.thinker}
            </span>
          )}
          {part.specific && (
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: C.warnSoft,
                border: `1px solid ${C.warn}`,
                color: C.text,
              }}
            >
              {part.specific}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The diagram, as a thing to copy rather than a thing to read.
 *
 * It used to render as a box beside a numbered list, under the heading "Draw
 * this" — which is not an instruction anybody can follow with a pen. What the
 * scripts actually put on the page is a boxed label, a spine, and arrows out to
 * short branches, and the shape carries as much of the meaning as the words do.
 * So the shape is drawn here, connectors and arrowheads included, and the
 * caption says what it costs in minutes: a diagram that takes five is not worth
 * drawing in a thirty-five minute answer.
 */
export function Diagram({ diagram }: { diagram: DiagramData | undefined }) {
  if (!diagram?.label || diagram.items.length === 0) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          fontFamily: C.mono,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 10,
        }}
      >
        Copy this onto the page
      </div>

      <div className="tree">
        <div className="tree-root">{diagram.label}</div>
        <div className="tree-link" aria-hidden />
        <ol className="tree-branches">
          {diagram.items.map((it) => (
            <li key={it.name} className="tree-branch">
              <strong>{it.name}</strong>
              {it.note && <span style={{ color: C.muted }}> — {it.note}</span>}
            </li>
          ))}
        </ol>
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
        One box, one spine, <span className="num">{diagram.items.length}</span> arrows. Draw it
        where it falls in the answer, not at the end — a diagram after the conclusion reads as an
        afterthought. Ninety seconds with a pen, and it does the work of a paragraph.
      </p>
    </section>
  );
}

export function ModelAnswerView({ answer }: { answer: ModelAnswer }) {
  let blockIndex = -1;
  return (
    <div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          margin: "12px 0 0",
          padding: "11px 13px",
          borderRadius: 8,
          background: C.warnSoft,
          borderLeft: `2px solid ${C.warn}`,
        }}
      >
        <strong>A model answer — change it.</strong> The question will be worded differently on
        the day, and an answer reproduced from memory reads like one. Take the shape, the
        underlining and the way the examples are placed; put your own phrasing and your own
        examples through it.
      </p>

      <div style={{ marginTop: 18 }}>
        {answer.parts.map((part, i) => {
          if (part.kind === "block") blockIndex += 1;
          return (
            <Part
              key={`${part.kind}-${i}`}
              part={part}
              index={part.kind === "block" ? blockIndex : null}
            />
          );
        })}
      </div>

      <Diagram diagram={answer.diagram} />

      <p style={{ fontSize: 12.5, color: C.muted, margin: "20px 0 0", lineHeight: 1.65 }}>
        {answer.words > 0 && (
          <>
            About <span className="num">{answer.words}</span> words — roughly what thirty-five
            minutes of writing produces.{" "}
          </>
        )}
        Underlined phrases are what to underline in the booklet: technical terms, named Acts,
        figures. Underlining everything is the same as underlining nothing.
      </p>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.65 }}>
        <strong style={{ color: C.warn }}>Must include</strong> marks what the demand cannot be
        met without — leave it out and it costs marks.{" "}
        <strong style={{ color: C.good }}>Your own</strong> marks where the idea has to appear
        but the example and the wording should be yours. Replacing those is the difference
        between using this answer and copying it.
      </p>

      {answer.offSyllabus && answer.offSyllabus.length > 0 && (
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            margin: "12px 0 0",
            padding: "10px 12px",
            borderRadius: 8,
            background: C.warnSoft,
            borderLeft: `2px solid ${C.warn}`,
          }}
        >
          This answer named {answer.offSyllabus.length}{" "}
          {answer.offSyllabus.length === 1 ? "topic" : "topics"} that are not in your syllabus
          ({answer.offSyllabus.join(", ")}). Treat those parts with suspicion — time spent on
          something WBCS cannot ask is time lost.
        </p>
      )}
    </div>
  );
}
