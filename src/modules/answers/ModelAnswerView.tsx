import type { ReactNode } from "react";
import { useState } from "react";
import type {
  Diagram as DiagramData,
  MethodStep,
  ModelAnswer,
  ModelAnswerPart,
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
      style={{
        margin: "20px 0 0",
        paddingLeft: 14,
        borderLeft: `2px solid ${C.line}`,
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
      <p style={{ fontSize: 15, lineHeight: 1.85, margin: 0 }}>
        {marked(part.text, part.underline)}
      </p>
      {(part.thinker || part.specific) && (
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

      {flow ? (
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
function Section({
  demand,
  index,
  total,
  children,
}: {
  demand: { label: string; minutes: number };
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section style={{ marginTop: index === 0 ? 18 : 22 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "9px 12px",
          borderRadius: 9,
          border: "none",
          background: C.accentSoft,
          color: C.text,
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
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
        <span aria-hidden style={{ color: C.muted, flexShrink: 0 }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

const STEP_NAMES: Record<MethodStep, string> = {
  demand: "Demand",
  structure: "Structure",
  flow: "What → why → how",
  example: "Example",
  thinker: "Thinker",
  criticism: "Criticism",
  conclusion: "Conclusion",
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
 * Two of the seven — the thinker and the criticism — are more often rightly
 * absent than present, and a checklist that scolds an answer for leaving out a
 * scholar it did not need is the thing that makes people force one in.
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
                  {STEP_NAMES[m.step] ?? m.step}
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
        A dash is not a miss. A thinker this question did not need, or a criticism it never asked
        for, is correctly absent — forcing either in is what the examiner notices. Hold your own
        answer against this list; that is the whole exercise.
      </p>
    </section>
  );
}

/**
 * Datable Indian material to carry in, and the warning that goes with it.
 *
 * This is the one section on the page whose contents the app does not stand
 * behind. Everything else comes out of the three books or out of the syllabus;
 * these come out of a model whose knowledge stopped at a training cutoff, so
 * "recent" here can mean a year stale, a repealed Act, or a figure from a
 * Census round that has since been superseded. A wrong figure written
 * confidently into a booklet costs more than no figure.
 *
 * So the year is set beside every one and the instruction to check is at the
 * top, not buried underneath. The section is styled as a draft to work on
 * rather than as a finding to trust.
 */
function Examples({ examples }: { examples: NonNullable<ModelAnswer["examples"]> }) {
  if (examples.length === 0) return null;
  return (
    <section style={{ marginTop: 26 }}>
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
        Indian material to carry in
      </div>

      <p
        style={{
          fontSize: 12.5,
          lineHeight: 1.65,
          margin: "0 0 12px",
          padding: "9px 12px",
          borderRadius: 8,
          background: C.warnSoft,
          borderLeft: `2px solid ${C.warn}`,
        }}
      >
        <strong>Check every one of these before it goes in an answer.</strong> They are drafted
        by a model whose knowledge has a cutoff — an Act may have been amended, a scheme renamed,
        a figure superseded by a later round. The year each belongs to is given so you can look
        it up. Wrong-and-confident costs more marks than absent.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
        {examples.map((e, i) => (
          <li key={`${e.text}-${i}`} style={{ paddingLeft: 13, borderLeft: `2px solid ${C.line}` }}>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
              {e.text}
              {e.asOf && (
                <span className="num" style={{ color: C.muted, fontSize: 12.5 }}> ({e.asOf})</span>
              )}
            </p>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "3px 0 0", lineHeight: 1.55 }}>
              {e.where}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Where this answer was built from — the app's own chapter map, never the
 * model's.
 *
 * The model is given these chapters and told to take its sociology from them,
 * but it was never asked to say so, and an answer that names no source is one
 * a candidate cannot go back and read around. These lines come from
 * standardBooks.ts rather than from the reply, so nothing here is a page number
 * a model invented.
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
        Written from
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
        The chapters this answer was built out of, from your own shelf. Read around the parts you
        would not have written yourself — an answer you cannot source is one you cannot defend if
        the question turns.
      </p>
    </section>
  );
}

export function ModelAnswerView({
  answer,
  books = [],
}: {
  answer: ModelAnswer;
  /** Chapter lines from standardBooks.ts — the app's map, not the model's claim. */
  books?: string[];
}) {
  let blockIndex = -1;
  return (
    <div className="answer-split">
      <div className="answer-main">
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

      {(() => {
        const rendered = answer.parts.map((part, i) => {
          if (part.kind === "block") blockIndex += 1;
          return (
            <Part
              key={`${part.kind}-${i}`}
              part={part}
              index={part.kind === "block" ? blockIndex : null}
            />
          );
        });

        // One demand, or none, is the common case — most questions ask one
        // thing, and an answer to one thing is not improved by being put in a
        // box with a heading on it.
        const demands = answer.demands ?? [];
        if (demands.length < 2) return <div style={{ marginTop: 18 }}>{rendered}</div>;

        return demands.map((demand, di) => (
          <Section key={demand.label} demand={demand} index={di} total={demands.length}>
            {rendered.filter((_, i) => (answer.parts[i]?.serves ?? 0) === di)}
          </Section>
        ));
      })()}

      <Diagram diagram={answer.diagram} />

      <Examples examples={answer.examples ?? []} />

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

      {answer.method && answer.method.length > 0 && (
        <aside className="answer-aside">
          <MethodAudit method={answer.method} />
        </aside>
      )}
    </div>
  );
}
