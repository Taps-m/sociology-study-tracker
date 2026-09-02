import { useEffect, useState, type ReactNode } from "react";
import {
  answerStructure,
  cachedStructure,
  cachedModelAnswer,
  forgetModelAnswer,
  modelAnswer,
  typicalAnswerSeconds,
  type AnswerStructure,
  type ModelAnswer,
} from "../../lib/ai";
import { TOPICS } from "../../data/syllabus";
import { standardReadingsFor, stdLine } from "../../data/standardBooks";
import { BOOK_SCAN, scanPagesRead, scanPagesTotal, scanPending } from "../../data/bookScan";
import { Diagram, ModelAnswerView } from "./ModelAnswerView";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

/**
 * The skeleton the question was asking for, in a window over the page.
 *
 * It used to render inline, which pushed the timer and the upload a screen and
 * a half down: you read the structure and then had to scroll back past all of
 * it to get on with writing. A structure is something you read once and put
 * down, so it belongs over the page rather than in it — open it, read it, close
 * it, carry on where you were.
 *
 * The shape it shows is not invented. It is what a 2nd-rank candidate's answer
 * booklets do, page after page: an opening carrying the seed of the structure,
 * a signpost line, keyword-dash-mechanism blocks of deliberately unequal depth,
 * a pivot sentence where the question has two halves, and a close that takes a
 * position. A skeleton to write from, never an answer to copy.
 */
export function AnswerBlueprint({
  question,
  topicId,
  topic,
  unit,
  paper,
  weak,
}: {
  question: string;
  /** Which chapters the candidate can actually open. */
  topicId: string;
  topic: string;
  unit: string;
  paper: 1 | 2;
  /** Offers itself louder when the last answer was poor. */
  weak: boolean;
}) {
  const [structure, setStructure] = useState<AnswerStructure | null>(() =>
    cachedStructure(question),
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The written answer, behind the skeleton rather than beside it: it is the
  // thing to reach for once the structure has not been enough.
  const [answer, setAnswer] = useState<ModelAnswer | null>(() => cachedModelAnswer(question));
  const [view, setView] = useState<"structure" | "model">("structure");
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  /**
   * Seconds on the clock while the answer is written.
   *
   * A button that says "Writing…" for a minute with nothing moving is
   * indistinguishable from a button that has hung, and the honest fix is not a
   * spinner but a number: at twenty seconds you can see it is still working,
   * and you can decide for yourself whether to wait. The expected figure beside
   * it is the median of what this device has actually measured, not a guess.
   */
  const [waited, setWaited] = useState(0);
  const expected = typicalAnswerSeconds();

  useEffect(() => {
    if (!answerBusy) {
      setWaited(0);
      return;
    }
    const started = Date.now();
    const t = setInterval(() => setWaited(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [answerBusy]);

  // Escape closes it, and the page behind stops scrolling while it is up —
  // without that the background slides around under the window on a phone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Every topic this paper can examine — the model's allowed vocabulary. */
  const paperTopics = TOPICS.filter((t) => t.paper === paper);

  /**
   * The chapters this topic actually has on the shelf.
   *
   * Sent with the question so the answer is built out of what these three
   * books contain rather than out of whatever the model has read. A model that
   * reaches for a fashionable framework the candidate cannot look up gives
   * them something they can neither check nor revise from.
   */
  const books = standardReadingsFor(topicId).map(stdLine);

  async function buildAnswer(fresh = false) {
    if (fresh) {
      forgetModelAnswer(question);
      setAnswer(null);
    } else if (answer) {
      setView("model");
      return;
    }
    setAnswerBusy(true);
    setAnswerError(null);
    const res = await modelAnswer(
      question,
      {
        question,
        topic,
        unit,
        paper: paper === 1 ? "I" : "II",
        marks: 40,
        minutes: 35,
        syllabusTopics: paperTopics.map((t) => ({ id: t.id, unit: t.unit, name: t.name })),
        books,
        // The skeleton has already told the candidate what to draw. Send it, so
        // the written answer draws that and not a second, different picture.
        diagram: structure?.diagram?.label ? structure.diagram : undefined,
      },
      paperTopics.map((t) => t.id),
    );
    setAnswerBusy(false);
    if (res.result) {
      setAnswer(res.result);
      setView("model");
    } else {
      setAnswerError(res.error);
    }
  }

  async function show() {
    if (structure) {
      setView("structure");
      setOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await answerStructure(question, {
      question,
      topic,
      unit,
      paper: paper === 1 ? "I" : "II",
      marks: 40,
      minutes: 35,
      books,
    });
    setBusy(false);
    if (res.result) {
      setStructure(res.result);
      setView("structure");
      setOpen(true);
    } else {
      setError(res.error);
    }
  }

  return (
    <>
      <Card title="What this answer needed">
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 12px", lineHeight: 1.7 }}>
          {weak
            ? "A mark on its own teaches nothing. Open the skeleton this question was asking for — the demand broken up, the opening written out, and where each point goes."
            : structure
              ? "Built already. Open it and hold your answer against it."
              : "See the skeleton this question was asking for, and hold your answer against it."}
        </p>
        <button
          onClick={() => void show()}
          title="The skeleton this question was asking for: what it demands, how to open, and where each point goes. Not an answer to copy."
          disabled={busy}
          style={{
            minHeight: 44,
            padding: "0 18px",
            borderRadius: 9,
            border: "none",
            background: weak ? C.accent : "transparent",
            color: weak ? C.accentInk : C.accent,
            boxShadow: weak ? "none" : `inset 0 0 0 1px ${C.line}`,
            font: "inherit",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Building…" : structure ? "Open the structure" : "Show me the structure"}
        </button>
        {error && (
          <p style={{ fontSize: 13.5, color: C.warn, margin: "10px 0 0", lineHeight: 1.6 }}>
            {error}
          </p>
        )}
      </Card>

      {open && structure && (
        <Overlay
          onClose={() => setOpen(false)}
          title={view === "model" ? "A model answer" : "What this answer needed"}
        >
          {view === "structure" ? (
            <>
              <StructureBody structure={structure} />
              {/* The next step, and it should look like one. This was a grey
                  line of text above a ghost button, sitting under a full-width
                  dismiss — so the way out of the window was the loudest thing
                  on it and the useful action was the quietest. */}
              <div
                style={{
                  marginTop: 26,
                  padding: "16px 18px",
                  borderRadius: 11,
                  background: C.accentSoft,
                  border: `1px solid ${C.accent}`,
                }}
              >
                <div style={{ fontSize: 15.5, fontWeight: 700, color: C.text }}>
                  Still looking at a blank page?
                </div>
                <p style={{ fontSize: 13.5, color: C.muted, margin: "6px 0 14px", lineHeight: 1.7 }}>
                  A full answer written to this shape and kept inside your syllabus, with every
                  part marked compulsory or yours to change. To adapt, not to reproduce.
                </p>
                <button
                  onClick={() => void buildAnswer()}
                  disabled={answerBusy}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    minHeight: 48,
                    borderRadius: 9,
                    border: "none",
                    background: answerBusy ? C.panel : C.accent,
                    color: answerBusy ? C.muted : C.accentInk,
                    font: "inherit",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: answerBusy ? "default" : "pointer",
                  }}
                >
                  {answerBusy ? (
                    <>
                      Writing the answer…
                      <span className="num" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {waited}s
                      </span>
                    </>
                  ) : answer ? (
                    "Open the model answer"
                  ) : (
                    "Write me a model answer"
                  )}
                  {!answerBusy && <span aria-hidden>→</span>}
                </button>
                {answerBusy && (
                  <p style={{ fontSize: 12.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.6 }}>
                    {expected === null
                      ? "A thousand words, written from scratch — expect the better part of a minute. It is timed from here on, so next time this line will say what it actually takes."
                      : `About ${expected}s is normal on this device. It is written once and then kept, so opening it again is instant.`}
                  </p>
                )}
                {answerError && (
                  <p style={{ fontSize: 13.5, color: C.warn, margin: "10px 0 0", lineHeight: 1.6 }}>
                    {answerError}
                  </p>
                )}

                {answer && !answerBusy && (
                  <button
                    onClick={() => void buildAnswer(true)}
          title="Throw this answer away and write a new one. Use it if the answer is poor, or to see a change in the method."
                    style={{
                      display: "block",
                      margin: "10px auto 0",
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      color: C.muted,
                      font: "inherit",
                      fontSize: 12.5,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                      cursor: "pointer",
                    }}
                  >
                    Write a different one
                  </button>
                )}

                {/*
                  Where the words in this answer actually come from.
                  The books are cited beside the answer, but until they have
                  been read into text the model has not seen a page of them —
                  it writes from what it knows and the citation sits next to it.
                  That is a real difference and it is not the reader's job to
                  guess at it, so the state is on the screen until it changes.
                */}
                {!answerBusy && scanPending() && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: `1px solid ${C.line}`,
                      fontSize: 12,
                      color: C.muted,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: C.warn, fontWeight: 600 }}>Books not read yet</span> —{" "}
                    <span className="num">{scanPagesRead()}</span> of{" "}
                    <span className="num">{scanPagesTotal()}</span> pages scanned. Until this
                    finishes, the answer is written from the model's own knowledge with your
                    chapters cited beside it, not out of the chapters themselves.
                    <div style={{ marginTop: 6, height: 3, background: C.hair, borderRadius: 2 }}>
                      <div
                        style={{
                          width: `${Math.max(1, (scanPagesRead() / scanPagesTotal()) * 100)}%`,
                          height: "100%",
                          background: C.accent,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 5, fontSize: 11.5 }}>
                      Sangwan <span className="num">{BOOK_SCAN.sangwan.read}</span>/
                      <span className="num">{BOOK_SCAN.sangwan.total}</span> · Haralambos{" "}
                      <span className="num">{BOOK_SCAN.haralambos.read}</span>/
                      <span className="num">{BOOK_SCAN.haralambos.total}</span> · Shankar Rao
                      already readable
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            answer && (
              <>
                <button
                  onClick={() => setView("structure")}
                  style={{
                    padding: 0,
                    marginTop: 10,
                    background: "none",
                    border: "none",
                    color: C.accent,
                    font: "inherit",
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  ← Back to the structure
                </button>
                <ModelAnswerView answer={answer} />
              </>
            )
          )}
        </Overlay>
      )}
    </>
  );
}

/**
 * The window itself. Clicking the backdrop closes; clicking inside does not,
 * which is the whole reason the inner div stops the event.
 */
function Overlay({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(8, 11, 15, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "3vh 14px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          padding: "20px 22px 26px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            autoFocus
            style={{
              flex: "0 0 auto",
              minWidth: 34,
              minHeight: 34,
              borderRadius: 8,
              border: `1px solid ${C.line}`,
              background: C.panel,
              color: C.muted,
              font: "inherit",
              fontSize: 17,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {children}

        {/* A quiet way out. The × above closes too, so a full-width bordered
            button here was a second copy of the least important action, drawn
            larger than the most important one. */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 4px",
              background: "none",
              border: "none",
              color: C.muted,
              font: "inherit",
              fontSize: 13.5,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Close and get back to writing
          </button>
        </div>
      </div>
    </div>
  );
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

const label = {
  fontFamily: C.mono,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: C.muted,
};

/** A line the candidate could put on the page as it stands. */
function Sentence({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 14,
        lineHeight: 1.75,
        margin: "7px 0 0",
        padding: "10px 12px",
        borderRadius: 8,
        background: C.accentSoft,
        borderLeft: `2px solid ${C.accent}`,
      }}
    >
      {children}
    </p>
  );
}

function StructureBody({ structure }: { structure: AnswerStructure }) {
  return (
    <div>
      <section style={{ marginTop: 14 }}>
        <div style={label}>The demand</div>
        {structure.demand.commandWords.length > 0 && (
          <p style={{ fontSize: 14, margin: "6px 0 0", lineHeight: 1.7 }}>
            Command:{" "}
            <strong style={{ color: C.accent }}>
              {structure.demand.commandWords.join(", ")}
            </strong>
            {structure.skeleton ? ` · shape: ${structure.skeleton}` : ""}.
          </p>
        )}
        <ol style={{ margin: "9px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.75 }}>
          {structure.demand.parts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        {structure.demand.trap && (
          <p
            style={{
              fontSize: 13.5,
              margin: "10px 0 0",
              padding: "9px 12px",
              borderLeft: `2px solid ${C.warn}`,
              background: C.warnSoft,
              borderRadius: "0 6px 6px 0",
              lineHeight: 1.65,
            }}
          >
            {structure.demand.trap}
          </p>
        )}
      </section>

      {structure.markUp && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>First, mark the question paper</div>
          <p style={{ fontSize: 14, margin: "7px 0 0", lineHeight: 1.8 }}>
            Box{" "}
            {structure.markUp.box.map((w) => (
              <span
                key={w}
                style={{
                  display: "inline-block",
                  padding: "1px 6px",
                  margin: "0 3px",
                  border: `1px solid ${C.accent}`,
                  borderRadius: 4,
                  color: C.accent,
                  fontWeight: 600,
                }}
              >
                {w}
              </span>
            ))}
            {structure.markUp.underline.length > 0 && (
              <>
                , underline{" "}
                {structure.markUp.underline.map((w, i) => (
                  <span key={w}>
                    {i > 0 && ", "}
                    <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{w}</span>
                  </span>
                ))}
              </>
            )}
            .
          </p>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.6 }}>
            Five seconds, and it is why these candidates stay on the demand while everyone else
            drifts onto the topic.
          </p>
        </section>
      )}

      <section style={{ marginTop: 20 }}>
        <div style={label}>The opening — {structure.opening.type}</div>
        <Sentence>{structure.opening.text}</Sentence>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.6 }}>
          Two to four lines, no heading, already carrying the shape of what follows. A textbook
          definition here spends the most valuable lines on the page saying nothing.
        </p>
      </section>

      {structure.signpost && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>The signpost</div>
          <p
            style={{
              fontSize: 14.5,
              margin: "7px 0 0",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            {structure.signpost}
          </p>
        </section>
      )}

      <section style={{ marginTop: 20 }}>
        <div style={label}>The blocks — keyword, dash, mechanism</div>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {structure.blocks.map((b, i) => (
            <div
              key={b.keyword}
              style={{
                padding: "11px 13px",
                borderRadius: 8,
                background: C.panel,
                border: `1px solid ${b.depth === "full" ? C.line : C.hair}`,
                opacity: b.depth === "full" ? 1 : 0.86,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span className="num" style={{ fontSize: 12.5, color: C.muted }}>
                  {String.fromCharCode(97 + i)})
                </span>
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 5,
                    border: `1px solid ${C.accent}`,
                    color: C.accent,
                  }}
                >
                  {b.keyword}
                </span>
                <MustBadge must={b.must} />
                {b.depth === "brief" && (
                  <span style={{ fontSize: 11.5, color: C.muted, letterSpacing: "0.06em" }}>
                    one line — do not dig
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.65 }}>{b.mechanism}</div>
              {(b.thinker || b.specific) && (
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>
                  {b.thinker && <>Thinker: {b.thinker}</>}
                  {b.thinker && b.specific && " · "}
                  {b.specific && <>Specific: {b.specific}</>}
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "9px 0 0", lineHeight: 1.6 }}>
          Blocks, not paragraphs. Those marked “do not dig” get one line — spending three on an
          obvious point is where the time goes. “Must include” means the demand is not met
          without it; “your own” means the idea belongs there but the example should be yours.
        </p>
      </section>

      {structure.pivot && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>The pivot</div>
          <Sentence>{structure.pivot}</Sentence>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.6 }}>
            One sentence turns the answer to the second half. Starting again instead is how a
            two-part answer reads as two half answers.
          </p>
        </section>
      )}

      {/*
        Always shown, either way. A diagram that is worth three minutes of a
        thirty-five minute answer is worth being told about explicitly, and so
        is the decision not to draw one — an absent section and a budget line
        that mentions a diagram cannot both be right, and the candidate is the
        one who pays for working out which.
      */}
      {structure.diagram?.label ? (
        <Diagram diagram={structure.diagram} />
      ) : (
        <section style={{ marginTop: 20 }}>
          <div style={label}>Worth drawing</div>
          <p style={{ fontSize: 14, margin: "7px 0 0", lineHeight: 1.7, color: C.muted }}>
            {structure.insteadOfDiagram ||
              "Nothing here. Prose is faster than a diagram for this question — don't spend the minutes."}
          </p>
        </section>
      )}

      <section style={{ marginTop: 20 }}>
        <div style={label}>The close — {structure.close.type}</div>
        <Sentence>{structure.close.text}</Sentence>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.6 }}>
          Never a summary of what you just wrote. Take a position, or hold the two sides against
          each other.
        </p>
      </section>

      {structure.minutes.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>Thirty-five minutes, spent</div>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {structure.minutes.map((m) => (
              <li
                key={m.section}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}
              >
                <span>{m.section}</span>
                <span className="num" style={{ color: C.muted }}>
                  {m.minutes} min
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ fontSize: 12.5, color: C.muted, margin: "18px 0 0", lineHeight: 1.65 }}>
        A skeleton to write from, not an answer to copy — the question will be phrased differently
        on the day. The shape is taken from a 2nd-rank candidate's own answer booklets.
      </p>
    </div>
  );
}
