import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { openInTab } from "../../lib/printable";
import type {
  CloseType,
  Diagram as DiagramData,
  Dimension,
  MethodStep,
  ModelAnswer,
  ModelAnswerPart,
  OpeningType,
} from "../../lib/ai";
import { C } from "../../lib/theme";

/**
 * A written answer, marked up the way the scripts are.
 *
 * The model returns the phrases to underline verbatim from its own text rather
 * than emitting markup, so the marking is applied here and cannot arrive half
 * broken. A phrase that does not appear in the text is simply not marked — a
 * missing underline is invisible, a mangled sentence is not.
 */

/**
 * Underline the given phrases where they appear, longest first.
 *
 * Two colours, because two different things are being marked. The accent marks
 * what to underline in the booklet: the concept the sentence turns on, the word
 * it lands on. The amber marks the evidence inside it — the Act, the Census
 * round, the figure — and that one is a screen aid rather than an instruction,
 * since a candidate has one pen. Its job is that the supporting fact can be
 * found without reading the paragraph, so a block resting on nothing is
 * visible as a block with no amber in it.
 */
function marked(text: string, phrases: string[], evidence: string[] = []): ReactNode {
  const facts = new Set(evidence.filter(Boolean));
  const wanted = [...new Set([...phrases, ...evidence].filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
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
          style={
            facts.has(phrase)
              ? {
                  /*
                   * A wash of colour behind it, the way a marker pen leaves it.
                   * Amber letters alone were not enough: at fifteen-point on a
                   * warm page the difference between text and evidence was a
                   * shade, and the whole point is that the eye finds the proof
                   * without reading the paragraph.
                   */
                  background: C.warnSoft,
                  color: C.warn,
                  fontWeight: 600,
                  borderRadius: 3,
                  padding: "1px 3px",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                }
              : {
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  textDecorationColor: C.accent,
                  textDecorationThickness: 1.5,
                }
          }
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
 * The six ways into an answer, and the three ways out.
 *
 * Vision IAS's deck sets them out as a menu, which is the thing a candidate
 * never sees: they write the definition opening every time because it is the
 * only one they have ever written, not because the question rewarded it. So the
 * opening is labelled with the choice that was made and the other two are one
 * click away — the paragraph is the same argument each time, and what changes
 * is the way in.
 */
const OPENING_NAMES: Record<OpeningType, string> = {
  definition: "Definition",
  event: "Recent event",
  report: "Report",
  data: "Data or figure",
  background: "Background",
  summarise: "Summarise the question",
};

const CLOSE_NAMES: Record<CloseType, string> = {
  summarised: "Summarised",
  balanced: "Balanced",
  reformist: "Reformist",
};

/** The tab row over a swappable opening or close. One is the model's pick. */
function Versions({
  names,
  at,
  onPick,
}: {
  names: string[];
  at: number;
  onPick: (i: number) => void;
}) {
  if (names.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7 }}>
      {names.map((name, i) => (
        <button
          key={`${name}-${i}`}
          onClick={() => onPick(i)}
          title={i === 0 ? "The one the model chose for this question" : "The same argument, entered a different way"}
          style={{
            minHeight: 26,
            padding: "0 9px",
            borderRadius: 999,
            border: `1px solid ${i === at ? C.accent : C.line}`,
            background: i === at ? C.accentSoft : "transparent",
            color: i === at ? C.accent : C.muted,
            font: "inherit",
            fontSize: 12,
            fontWeight: i === at ? 700 : 500,
            cursor: "pointer",
          }}
        >
          {name}
          {i === 0 && " \u2713"}
        </button>
      ))}
    </div>
  );
}

/**
 * Which of the five faces of the question the answer actually argued from.
 *
 * The deck's instruction is to cover socio, economic, political, cultural and
 * environmental, and the reason it has to be shown rather than said is that a
 * one-sided answer reads perfectly well. Four lit chips and one grey one is the
 * only way to see, in a second, that nothing in nine hundred words touched the
 * economic side of a question that asked for it.
 */
const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: "social", label: "Social" },
  { id: "economic", label: "Economic" },
  { id: "political", label: "Political" },
  { id: "cultural", label: "Cultural" },
  { id: "environmental", label: "Environmental" },
];

function DimensionStrip({ parts }: { parts: ModelAnswerPart[] }) {
  const covered = new Set(
    parts.filter((p) => p.kind === "block" && p.dimension).map((p) => p.dimension as Dimension),
  );
  if (covered.size === 0) return null;
  return (
    <section style={{ margin: "16px 0 0" }}>
      <div
        style={{
          fontFamily: C.mono,
          fontSize: 10.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 7,
        }}
      >
        Sides of the question this covers
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {DIMENSIONS.map((d) => {
          const on = covered.has(d.id);
          return (
            <button
              key={d.id}
              disabled={!on}
              onClick={() => {
                /*
                 * The block it points at may be inside a part that is folded
                 * shut, and scrolling to something display:none does nothing
                 * at all — a chip that looks live and is dead. So every fold
                 * above it is opened first, and React is told, because each
                 * <details> reports its own toggle back.
                 */
                const el = document.getElementById(`dim-${d.id}`);
                if (!el) return;
                let fold = el.closest("details");
                while (fold) {
                  fold.open = true;
                  fold = fold.parentElement?.closest("details") ?? null;
                }
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              title={on ? "Jump to the block that argues this side" : "Nothing in this answer argues from this side"}
              style={{
                minHeight: 28,
                padding: "0 11px",
                borderRadius: 999,
                border: `1px ${on ? "solid" : "dashed"} ${on ? C.good : C.line}`,
                background: on ? C.goodSoft : "transparent",
                color: on ? C.good : C.muted,
                font: "inherit",
                fontSize: 12.5,
                fontWeight: on ? 650 : 500,
                cursor: on ? "pointer" : "default",
                opacity: on ? 1 : 0.65,
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      {covered.size < 3 && (
        <p style={{ fontSize: 12.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.6 }}>
          Grey is not always a fault — a purely theoretical question has no economic side. But
          where the question asks about Indian society and only one chip is lit, that is the gap
          the examiner will see too.
        </p>
      )}
    </section>
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
function Part({
  part,
  index,
  alts = [],
  anchorId,
  practice = false,
}: {
  part: ModelAnswerPart;
  index: number | null;
  /** Other ways this opening or close could have been written. */
  alts?: { type: string; text: string }[];
  /** Set on the first block of each dimension, so the strip can jump to it. */
  anchorId?: string;
  /** Hide the prose until it is asked for, so the block can be attempted first. */
  practice?: boolean;
}) {
  const [version, setVersion] = useState(0);
  const [shown, setShown] = useState(false);

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
        {close && alts.length > 0 && (
          <Versions
            names={[
              CLOSE_NAMES[part.closeType ?? "summarised"],
              ...alts.map((a) => CLOSE_NAMES[a.type as CloseType] ?? a.type),
            ]}
            at={version}
            onPick={setVersion}
          />
        )}
        <p style={{ fontSize: 15, lineHeight: 1.85, margin: 0 }}>
          {version === 0
            ? marked(part.text, part.underline, part.evidence)
            : (alts[version - 1]?.text ?? part.text)}
        </p>
      </div>
    );
  }

  if (part.kind === "opening") {
    return (
      <div style={{ margin: "14px 0 0" }}>
        <MustBadge must={part.must} />
        {alts.length > 0 && (
          <div style={{ marginTop: 7 }}>
            <Versions
              names={[
                OPENING_NAMES[part.openingType ?? "definition"],
                ...alts.map((a) => OPENING_NAMES[a.type as OpeningType] ?? a.type),
              ]}
              at={version}
              onPick={setVersion}
            />
          </div>
        )}
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
          {version === 0
            ? marked(part.text, part.underline, part.evidence)
            : (alts[version - 1]?.text ?? part.text)}
        </p>
      </div>
    );
  }

  /*
   * A block is a labelled passage, not a card.
   *
   * Every block used to sit in its own bordered, tinted box with the keyword
   * reversed out of a filled chip, so eight blocks made a column of small boxes
   * and the answer read as a set of widgets rather than as something a person
   * wrote. What an examiner sees on paper is a heading and a paragraph under
   * it, and that is what this is now: a rule down the side to hold the column
   * together, the keyword as a heading in the text's own colour, and the prose
   * given the width to be read.
   */
  return (
    <div
      id={anchorId}
      style={{
        margin: "20px 0 0",
        paddingLeft: 14,
        borderLeft: `2px solid ${C.line}`,
        scrollMarginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 9,
          flexWrap: "wrap",
          marginBottom: 5,
        }}
      >
        {index !== null && (
          <span className="num" style={{ fontSize: 12.5, color: C.muted, flex: "0 0 auto" }}>
            {String.fromCharCode(97 + index)})
          </span>
        )}
        <span style={{ fontSize: 15.5, fontWeight: 700, color: C.text }}>{part.keyword}</span>
        <MustBadge must={part.must} />
      </div>
      {practice && !shown ? (
        /*
         * The keyword, and nothing else, until it has been attempted.
         *
         * Reading a model answer teaches almost nothing — the sentences make
         * sense as they are read and the mind mistakes that for being able to
         * produce them. Covering the prose and leaving the label turns the same
         * page into the exam: you write the block from the keyword, then reveal
         * and see what you left out. The word count is shown because knowing
         * you are eighty words short is half the correction.
         */
        <button
          onClick={() => setShown(true)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            minHeight: 46,
            padding: "11px 13px",
            borderRadius: 9,
            border: `1px dashed ${C.line}`,
            background: "transparent",
            color: C.muted,
            font: "inherit",
            fontSize: 13,
            lineHeight: 1.6,
            cursor: "pointer",
          }}
        >
          Write this block from the keyword, then tap to reveal —{" "}
          <span className="num">{part.text.trim().split(/\s+/).length}</span> words,{" "}
          {part.evidence && part.evidence.length > 0
            ? `${part.evidence.length} fact${part.evidence.length === 1 ? "" : "s"} in it`
            : "no fact in it"}
          .
        </button>
      ) : (
        <p style={{ fontSize: 15, lineHeight: 1.85, margin: 0 }}>
          {marked(part.text, part.underline, part.evidence)}
        </p>
      )}
      {(!practice || shown) && (part.thinker || part.specific) && (
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.6,
            margin: "7px 0 0",
            color: C.muted,
          }}
        >
          {part.thinker && <span>{part.thinker}</span>}
          {part.thinker && part.specific && <span> · </span>}
          {part.specific && <span style={{ color: C.warn }}>{part.specific}</span>}
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
/** A group of points inside a diagram: a heading, then what sits under it. */
function Group({ item, tone }: { item: DiagramData["items"][number]; tone: string }) {
  return (
    <div style={{ border: `1.5px solid ${tone}`, borderRadius: 9, padding: "9px 11px" }}>
      <div
        style={{
          fontFamily: C.mono,
          fontSize: 10.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: tone,
          fontWeight: 700,
        }}
      >
        {item.name}
      </div>
      <ul style={{ margin: "6px 0 0", paddingLeft: 15, fontSize: 12.5, lineHeight: 1.6 }}>
        {(item.points ?? (item.note ? [item.note] : [])).map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The centre term, quartered.
 *
 * This is Medha Anand's (Rank 13) page: "factors affecting mental well-being"
 * written across the middle, and the space around it divided into Social,
 * Economic, Political and Others, each with its own short list. It does in one
 * glance what a paragraph beginning "there are four dimensions" does in five
 * lines, and it is the shape that suits a sociology question best, because most
 * of them ask for the dimensions of something.
 *
 * Four groups get the label in the middle of the cross. Three or five have no
 * middle to sit in, so the label goes above and the groups run beneath.
 */
function Quadrant({ diagram }: { diagram: DiagramData }) {
  const centred = diagram.items.length === 4;
  return (
    <div style={{ position: "relative" }}>
      {!centred && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.accent,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {diagram.label}
        </div>
      )}
      <div
        className="quad"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: centred ? 54 : 12,
        }}
      >
        {diagram.items.map((it) => (
          <Group key={it.name} item={it} tone={C.accent} />
        ))}
      </div>
      {centred && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "6px 12px",
            maxWidth: 190,
            textAlign: "center",
            background: C.panel,
            color: C.accent,
            fontSize: 13.5,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {diagram.label}
        </div>
      )}
    </div>
  );
}

/** Levels, widest at the base. For anything that stacks or ranks. */
function Pyramid({ diagram }: { diagram: DiagramData }) {
  const n = diagram.items.length;
  return (
    <div>
      <div
        style={{ fontSize: 14, fontWeight: 700, color: C.accent, textAlign: "center", marginBottom: 10 }}
      >
        {diagram.label}
      </div>
      <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
        {diagram.items.map((it, i) => (
          <div
            key={it.name}
            style={{
              width: `${Math.round(46 + ((i + 1) / n) * 54)}%`,
              minWidth: 150,
              padding: "8px 12px",
              borderRadius: 8,
              textAlign: "center",
              background: C.raised,
              border: `1.5px solid ${C.accent}`,
            }}
          >
            <strong style={{ fontSize: 13.5 }}>{it.name}</strong>
            {it.note && (
              <span style={{ fontSize: 12.5, color: C.muted }}> — {it.note}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Two things held against each other, on a stated basis.
 *
 * The left-hand column is what makes this worth drawing rather than writing.
 * Two lists side by side are two lists: the reader has to work out for
 * themselves what is being compared with what, and an examiner will not. Name
 * the basis of each row — ownership, mobility, sanction, unit of stratification
 * — and the table argues instead of listing.
 *
 * Where a reply gives no rows, the older column form still draws, because an
 * answer cached before this existed should not lose its diagram.
 */
function Compare({ diagram }: { diagram: DiagramData }) {
  const rows = diagram.rows ?? [];
  const [a, b] = diagram.items;

  const cell: React.CSSProperties = {
    padding: "8px 10px",
    borderTop: `1px solid ${C.line}`,
    fontSize: 13,
    lineHeight: 1.55,
    verticalAlign: "top",
  };
  const head: React.CSSProperties = {
    ...cell,
    borderTop: "none",
    fontFamily: C.mono,
    fontSize: 10.5,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 700,
    color: C.accent,
  };

  return (
    <div>
      <div
        style={{ fontSize: 14, fontWeight: 700, color: C.accent, textAlign: "center", marginBottom: 10 }}
      >
        {diagram.label}
      </div>

      {rows.length > 0 && a && b ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
            <thead>
              <tr>
                <th style={{ ...head, color: C.muted, width: "26%", textAlign: "left" }}>Basis</th>
                <th style={{ ...head, textAlign: "left" }}>{a.name}</th>
                <th style={{ ...head, textAlign: "left", color: C.warn }}>{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.basis}>
                  <td style={{ ...cell, color: C.muted, fontWeight: 600 }}>{r.basis}</td>
                  <td style={cell}>{r.a}</td>
                  <td style={cell}>{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}
        >
          {diagram.items.slice(0, 3).map((it, i) => (
            <Group key={it.name} item={it} tone={i === 0 ? C.accent : C.warn} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A loop that feeds itself, drawn as one.
 *
 * Medha Anand (Rank 13) drew this twice, and sociology is full of the shape:
 * poverty to poor schooling to low skill to low wage to poverty again. Written
 * out as a list it reads as four separate causes; drawn as a circle it reads as
 * the one thing it is, which is that the last stage is the first stage's cause.
 * The arrows carry the whole argument, so they are drawn rather than implied.
 */
function Circular({ diagram }: { diagram: DiagramData }) {
  const items = diagram.items.slice(0, 5);
  const n = items.length;
  if (n < 3) return null;

  const step = 360 / n;
  const pad = Math.min(step * 0.34, 30);
  const at = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
  };

  return (
    <div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.accent,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {diagram.label}
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          aspectRatio: "1 / 1",
          margin: "0 auto",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <defs>
            <marker
              id="loop-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={C.accent} />
            </marker>
          </defs>
          {items.map((_, i) => {
            const from = at(i * step + pad, 33);
            const to = at((i + 1) * step - pad, 33);
            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} A 33 33 0 0 1 ${to.x} ${to.y}`}
                fill="none"
                stroke={C.accent}
                strokeWidth="1.1"
                markerEnd="url(#loop-arrow)"
              />
            );
          })}
        </svg>

        {items.map((it, i) => {
          const pos = at(i * step, 36);
          return (
            <div
              key={it.name}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                width: "38%",
                textAlign: "center",
                padding: "7px 8px",
                borderRadius: 9,
                border: `1.5px solid ${C.line}`,
                background: C.raised,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{it.name}</div>
              {it.note && (
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginTop: 2 }}>
                  {it.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Diagram({ diagram }: { diagram: DiagramData | undefined }) {
  if (!diagram?.label || diagram.items.length === 0) return null;
  const flow = diagram.shape === "flow";

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

      {diagram.shape === "circular" ? (
        <Circular diagram={diagram} />
      ) : diagram.shape === "quadrant" ? (
        <Quadrant diagram={diagram} />
      ) : diagram.shape === "pyramid" ? (
        <Pyramid diagram={diagram} />
      ) : diagram.shape === "compare" ? (
        <Compare diagram={diagram} />
      ) : flow ? (
        /*
         * A chain, because the order is the argument.
         *
         * Drawn left to right on a wide screen and top to bottom on a narrow
         * one, with the label above it rather than inside it: in a flow the
         * label is the name of the process, not the first stage of it, and
         * putting it in a box on the front makes it read as one.
         */
        <>
          <div style={{ fontSize: 14, fontWeight: 650, color: C.accent, marginBottom: 9 }}>
            {diagram.label}
          </div>
          <ol className="flow">
            {diagram.items.map((it) => (
              <li key={it.name} className="flow-step">
                <strong>{it.name}</strong>
                {it.note && <span style={{ color: C.muted }}>{it.note}</span>}
              </li>
            ))}
          </ol>
        </>
      ) : (
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
      )}

      <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
        {flow ? (
          <>
            <span className="num">{diagram.items.length}</span> stages, each arrow read as
            "leads to". The order carries the argument, so draw them in it.
          </>
        ) : diagram.shape === "quadrant" ? (
          <>
            The term in the middle,{" "}
            <span className="num">{diagram.items.length}</span> labelled groups around it — the
            shape Medha Anand (Rank 13) used for factors affecting mental well-being.
          </>
        ) : diagram.shape === "pyramid" ? (
          <>
            <span className="num">{diagram.items.length}</span> levels, widest at the base. Draw
            the base first and work up.
          </>
        ) : diagram.shape === "circular" ? (
          <>
            <span className="num">{diagram.items.length}</span> stages and the last arrow closes
            back onto the first — the point is that it feeds itself. Draw the circle first, then
            the boxes on it.
          </>
        ) : diagram.shape === "compare" ? (
          <>
            Rule the basis column first, then the two sides. The left column is what makes it a
            comparison rather than two lists.
          </>
        ) : (
          <>
            One box, one spine, <span className="num">{diagram.items.length}</span> arrows.
          </>
        )}{" "}
        Draw it where it falls in the answer, not at the end — a diagram after the conclusion
        reads as an afterthought. Ninety seconds with a pen, and it does the work of a paragraph.
      </p>
    </section>
  );
}

/**
 * One thing the question asks, with everything answering it.
 *
 * Open by default, deliberately. Collapsing the later parts would hide the one
 * thing a model answer exists to teach — the proportions of a whole answer, and
 * the fact that part one is a third of the page and not two thirds. Over-writing
 * the first part and rushing the last is the commonest way to lose marks on a
 * question like this, so the minutes are in the header where they can be seen
 * rather than worked out.
 *
 * The fold is for the second reading, when the wall of text is the problem
 * rather than the lesson.
 */
/**
 * One of the things the question asks, with the rest folded behind it.
 *
 * A question that asks two things gets a thousand words in one scroll, and the
 * second half is read with the attention left over from the first. Only the
 * first part opens; the others sit as one line each. What that line has to
 * carry is the part's size, because the cost of hiding a part is losing the
 * sense of proportion between them — and proportion is half of what the demand
 * split teaches. So the minutes and the word count are on the shut line: you
 * can see that part two is fifteen minutes and four hundred words without
 * opening it, which is the thing you would otherwise have had to open it for.
 *
 * It is a <details> rather than a button and a flag, and that is not cosmetic.
 * The copy that goes to a new tab or a printer opens every fold it finds; a
 * part hidden behind React state would have been dropped from the PDF without
 * a word, which is the worst way for an answer to lose half of itself.
 */
function Section({
  demand,
  index,
  total,
  words,
  children,
}: {
  demand: { label: string; minutes: number };
  index: number;
  total: number;
  /** Words in this part, so its size is legible while it is shut. */
  words: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <details
      className="fold-part"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{ marginTop: index === 0 ? 18 : 22 }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "9px 12px",
          borderRadius: 9,
          background: C.accentSoft,
          color: C.text,
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          listStyle: "none",
        }}
      >
        <span
          className="num"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.accent,
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          {index + 1}/{total}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600 }}>
          {demand.label}
        </span>
        {demand.minutes > 0 && (
          <span className="num" style={{ fontSize: 12.5, color: C.muted, flexShrink: 0 }}>
            {demand.minutes} min
          </span>
        )}
        {words > 0 && (
          <span className="num" style={{ fontSize: 12.5, color: C.muted, flexShrink: 0 }}>
            {words} words
          </span>
        )}
        <span aria-hidden style={{ color: C.muted, flexShrink: 0, fontSize: 13 }}>
          {open ? "−" : "+"}
        </span>
      </summary>
      <div>{children}</div>
    </details>
  );
}

const STEP_NAMES: Record<MethodStep, string> = {
  demand: "Demand",
  define: "Define and introduce",
  flow: "Flow — what → why → how",
  coreBody: "Core body",
  example: "Examples",
  thinker: "Thinkers",
  conclusion: "Conclusion",
};

/**
 * What the steps used to be called, so answers written before the audit was
 * reconciled still read as English rather than as raw ids.
 */
const OLD_STEP_NAMES: Record<string, string> = {
  structure: "Structure (old step)",
  criticism: "Criticism (old step)",
};

/**
 * The method, shown landing in this particular answer.
 *
 * A legend rather than a scorecard. Reading the seven steps once teaches
 * nobody; seeing where each of them went, on every answer, is how it becomes
 * the thing you do without thinking. So each line says where that step
 * happened, and holding your own answer against it is the exercise.
 *
 * "Not needed here" is set in the same grey as the rest and is never a cross.
 * One of the seven — the thinker — is value addition rather than foundation and
 * is often rightly absent, and a checklist that scolds an answer for leaving out
 * a scholar it did not need is the thing that makes people force one in. The
 * other six are expected every time.
 */
function MethodAudit({ method }: { method: NonNullable<ModelAnswer["method"]> }) {
  if (method.length === 0) return null;
  return (
    <section
      style={{
        marginTop: 0,
        padding: "13px 14px",
        borderRadius: 11,
        background: C.panel,
        border: `1px solid ${C.line}`,
      }}
    >
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
        The method, in this answer
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {method.map((m) => {
          const used = m.state === "used";
          return (
            <li key={m.step} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span
                aria-hidden
                style={{
                  flex: "0 0 auto",
                  width: 17,
                  fontSize: 13,
                  fontWeight: 700,
                  color: used ? C.good : C.muted,
                }}
              >
                {used ? "✓" : "–"}
              </span>
              {/*
                Stacked rather than in columns: this sits in a 244px rail, and a
                fixed label column would leave three words a line for the part
                that actually says where the step went.
              */}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: used ? C.text : C.muted,
                  }}
                >
                  {STEP_NAMES[m.step] ?? OLD_STEP_NAMES[m.step] ?? m.step}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: C.muted,
                    marginTop: 1,
                  }}
                >
                  {m.where}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
        A dash is not a miss. Thinkers are value addition rather than foundation, and the flow and
        the example are judged on the question — forcing any of the three in is what the examiner
        notices. But the demand, the core body and the conclusion are never rightly absent: a dash
        against one of those is a gap, not a judgement. Hold your own answer against this list;
        that is the whole exercise.
      </p>
    </section>
  );
}

/**
 * What this was built from, in one line, at the top where it is read.
 *
 * Two things that look identical on screen are not: a skeleton written out of
 * the candidate's own pages, and one written out of whatever the model knew
 * because the notes were not loaded that day. Until this line existed there was
 * no way to tell them apart, which made the whole point of loading the notes
 * unverifiable — and an unverifiable improvement is one nobody trusts.
 */
export function BuiltFrom({ from }: { from?: string }) {
  const grounded = Boolean(from);
  return (
    <p
      style={{
        fontSize: 12.5,
        lineHeight: 1.6,
        margin: "0 0 14px",
        padding: "8px 11px",
        borderRadius: 8,
        background: grounded ? C.goodSoft : C.raised,
        borderLeft: `2px solid ${grounded ? C.good : C.line}`,
        color: grounded ? C.text : C.muted,
      }}
    >
      {grounded ? (
        <>
          <strong>Built from your notes</strong> — {from}
        </>
      ) : (
        <>
          <strong>Built without your notes.</strong> Either they were not loaded when this was
          written, or this topic has no section in them. Rebuild to use them.
        </>
      )}
    </p>
  );
}

/**
 * Where to check this answer — which is not the same as where it came from,
 * and the wording here has to keep those apart.
 *
 * The model is handed these citation lines and told to stay inside them. It has
 * never been handed a page: the OCR of the books is seven pages in, and the
 * delivery that would put chapter text into the request has never been built.
 * So calling this "written from" would be a claim the app cannot support, and
 * an app that overstates its own sourcing teaches a candidate to trust an
 * answer exactly where it should check one.
 *
 * The lines themselves come from standardBooks.ts rather than from the reply,
 * so no page number here was invented by a model.
 */
function Sources({ books }: { books: string[] }) {
  if (books.length === 0) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          fontFamily: C.mono,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 8,
        }}
      >
        Where to check this
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 4,
          fontSize: 13,
          lineHeight: 1.6,
          color: C.muted,
        }}
      >
        {books.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "9px 0 0", lineHeight: 1.6 }}>
        The chapters on your shelf that cover this topic. The model was given these citations and
        told to stay inside them, but it has <strong>not read a page of them</strong> — so this is
        where to go and check the answer, not evidence of where the answer came from. Read around
        anything here you would not have written yourself.
      </p>
    </section>
  );
}

/**
 * The apparatus, folded away until it is wanted.
 *
 * Where the chapters are, what the badges mean, how long the answer runs — all
 * of it is worth having and none of it is the answer. Left open it ran on
 * below the conclusion for half a screen, so the page ended in housekeeping
 * and the answer looked longer than it was. Shut, it is one line; and the copy
 * that goes to a new tab or a printer opens it again, because nothing there
 * can be clicked.
 */
function Fold({
  title,
  tone = "quiet",
  children,
}: {
  title: string;
  /** A caution still has to be seen while shut, so it keeps its colour. */
  tone?: "quiet" | "warn";
  children: ReactNode;
}) {
  const warn = tone === "warn";
  const [open, setOpen] = useState(false);
  return (
    <details
      className="fold-aside"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{ marginTop: warn ? 12 : 22 }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: warn ? "inherit" : C.mono,
          fontSize: warn ? 13 : 11,
          fontWeight: warn ? 650 : 400,
          letterSpacing: warn ? "normal" : "0.1em",
          textTransform: warn ? "none" : "uppercase",
          color: warn ? C.warn : C.muted,
          padding: warn ? "8px 11px" : "7px 0",
          borderTop: warn ? "none" : `1px solid ${C.line}`,
          borderLeft: warn ? `2px solid ${C.warn}` : "none",
          borderRadius: warn ? 8 : 0,
          background: warn ? C.warnSoft : "transparent",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 17,
            height: 17,
            borderRadius: 5,
            border: `1px solid ${warn ? C.warn : C.line}`,
            fontSize: 12,
            lineHeight: 1,
            flex: "0 0 auto",
          }}
        >
          {open ? "\u2212" : "+"}
        </span>
        {title}
      </summary>
      <div style={warn ? { padding: "2px 13px 0", fontSize: 13, lineHeight: 1.7 } : undefined}>
        {children}
      </div>
    </details>
  );
}

export function ModelAnswerView({
  answer,
  books = [],
  question = "A model answer",
}: {
  answer: ModelAnswer;
  /** Chapter lines from standardBooks.ts — the app's map, not the model's claim. */
  books?: string[];
  /** Used as the heading of the printable copy. */
  question?: string;
}) {
  let blockIndex = -1;
  const sheet = useRef<HTMLDivElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [practice, setPractice] = useState(false);

  /*
   * One anchor per dimension, on the first block that argues from it, so the
   * strip above can jump to the thing it is claiming exists.
   */
  const anchored = new Map<string, number>();
  answer.parts.forEach((p, i) => {
    if (p.kind === "block" && p.dimension && !anchored.has(p.dimension)) {
      anchored.set(p.dimension, i);
    }
  });
  return (
    <div className="answer-split" ref={sheet}>
      <div className="answer-main">
      {/*
        A thousand words should not be read through a scrollport inside a modal.
        The new tab is the same rendering at full page width, and the browser's
        print dialog turns it into a PDF from there.
      */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginBottom: 4 }}>
        <button
          onClick={() => setPractice((v) => !v)}
          title="Hide every block's prose and leave only its keyword. Write the block yourself, then reveal it and see what you left out."
          style={{
            minHeight: 34,
            padding: "0 13px",
            borderRadius: 8,
            border: `1px solid ${practice ? C.accent : C.line}`,
            background: practice ? C.accentSoft : C.raised,
            color: practice ? C.accent : C.text,
            font: "inherit",
            fontSize: 13,
            fontWeight: practice ? 650 : 400,
            cursor: "pointer",
          }}
        >
          {practice ? "Showing keywords only" : "Practice mode"}
        </button>
        <button
          onClick={() => {
            if (sheet.current) setBlocked(!openInTab(sheet.current, question));
          }}
          title="Open this answer in its own tab, where it can be read at full width or saved as a PDF with your browser's print dialog."
          style={{
            minHeight: 34,
            padding: "0 13px",
            borderRadius: 8,
            border: `1px solid ${C.line}`,
            background: C.raised,
            color: C.text,
            font: "inherit",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Open in a new tab
        </button>
      </div>
      {blocked && (
        <p style={{ fontSize: 12.5, color: C.warn, margin: "0 0 10px", textAlign: "right" }}>
          Your browser blocked the new tab — allow pop-ups for this site.
        </p>
      )}

      <BuiltFrom from={answer.notesFrom} />
      {/*
        The caution folds, because it does not change.
        It was five lines of the same warning above every answer ever opened,
        which is how a warning stops being read: the eye learns its shape and
        skips it, and it pushes the first paragraph of the answer below the
        fold on a laptop. Shut it is one amber line — still the first thing on
        the page, still amber, and still there on the twentieth answer.
      */}
      <Fold tone="warn" title="A model answer — change it, and check every figure">
        The question will be worded differently on the day, and an answer reproduced from memory
        reads like one. Take the shape, the underlining and the way the facts are placed; put your
        own phrasing through it. And check every figure, Act and report before you write it in the
        hall — they are drafted by a model whose knowledge has a cutoff, and wrong-and-confident
        costs more marks than absent.
      </Fold>

      <DimensionStrip parts={answer.parts} />

      {(() => {
        const rendered = answer.parts.map((part, i) => {
          if (part.kind === "block") blockIndex += 1;
          return (
            <Part
              key={`${part.kind}-${i}-${practice}`}
              part={part}
              index={part.kind === "block" ? blockIndex : null}
              alts={
                part.kind === "opening"
                  ? (answer.altOpenings ?? [])
                  : part.kind === "close"
                    ? (answer.altCloses ?? [])
                    : []
              }
              anchorId={
                part.dimension && anchored.get(part.dimension) === i
                  ? `dim-${part.dimension}`
                  : undefined
              }
              practice={practice}
            />
          );
        });

        // One demand, or none, is the common case — most questions ask one
        // thing, and an answer to one thing is not improved by being put in a
        // box with a heading on it.
        const demands = answer.demands ?? [];
        if (demands.length < 2) return <div style={{ marginTop: 18 }}>{rendered}</div>;

        return demands.map((demand, di) => (
          <Section
            key={demand.label}
            demand={demand}
            index={di}
            total={demands.length}
            words={answer.parts
              .filter((pt) => (pt.serves ?? 0) === di)
              .reduce((n, pt) => n + pt.text.trim().split(/\s+/).length, 0)}
          >
            {rendered.filter((_, i) => (answer.parts[i]?.serves ?? 0) === di)}
          </Section>
        ));
      })()}

      <Diagram diagram={answer.diagram} />

      <Fold title="Where to check this, and what the marks mean">
      <Sources books={books} />

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
        between using this answer and copying it.{" "}
        <strong style={{ color: C.warn }}>Amber</strong> marks the evidence inside a sentence —
        the Act, the figure, the round. A block with no amber in it is resting on nothing.
      </p>
      </Fold>

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

      {answer.method && answer.method.length > 0 && (
        <aside className="answer-aside">
          <MethodAudit method={answer.method} />
        </aside>
      )}
    </div>
  );
}
