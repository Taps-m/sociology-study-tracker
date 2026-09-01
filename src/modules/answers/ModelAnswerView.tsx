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

function Part({ part, index }: { part: ModelAnswerPart; index: number | null }) {
  if (part.kind === "signpost") {
    return (
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          margin: "22px 0 0",
          textDecoration: "underline",
          textUnderlineOffset: 4,
        }}
      >
        {part.text}
      </p>
    );
  }

  if (part.kind === "pivot" || part.kind === "close") {
    return (
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.85,
          margin: "18px 0 0",
          paddingLeft: 12,
          borderLeft: `2px solid ${part.kind === "close" ? C.good : C.accent}`,
        }}
      >
        {marked(part.text, part.underline)}
      </p>
    );
  }

  if (part.kind === "opening") {
    return (
      <p style={{ fontSize: 15, lineHeight: 1.85, margin: "14px 0 0" }}>
        {marked(part.text, part.underline)}
      </p>
    );
  }

  return (
    <div style={{ margin: "16px 0 0" }}>
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
            padding: "1px 8px",
            borderRadius: 5,
            border: `1.5px solid ${C.accent}`,
            color: C.accent,
          }}
        >
          {part.keyword}
        </span>
        <MustBadge must={part.must} />
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.85, margin: "7px 0 0" }}>
        {marked(part.text, part.underline)}
      </p>
      {(part.thinker || part.specific) && (
        <p style={{ fontSize: 12.5, color: C.muted, margin: "5px 0 0" }}>
          {part.thinker && <>Thinker: {part.thinker}</>}
          {part.thinker && part.specific && " · "}
          {part.specific && <>Specific: {part.specific}</>}
        </p>
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
