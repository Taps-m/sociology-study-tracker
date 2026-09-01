import { useEffect, useState, type ReactNode } from "react";
import { answerStructure, cachedStructure, type AnswerStructure } from "../../lib/ai";
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
  topic,
  unit,
  paper,
  weak,
}: {
  question: string;
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

  async function show() {
    if (structure) {
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
    });
    setBusy(false);
    if (res.result) {
      setStructure(res.result);
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
        <Overlay onClose={() => setOpen(false)}>
          <StructureBody structure={structure} />
        </Overlay>
      )}
    </>
  );
}

/**
 * The window itself. Clicking the backdrop closes; clicking inside does not,
 * which is the whole reason the inner div stops the event.
 */
function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What this answer needed"
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
            What this answer needed
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

        <button
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 22,
            borderRadius: 9,
            border: `1px solid ${C.line}`,
            background: "transparent",
            color: C.text,
            font: "inherit",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close and get back to writing
        </button>
      </div>
    </div>
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
          obvious point is where the time goes.
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

      {structure.diagram && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>Worth drawing</div>
          <p style={{ fontSize: 14, margin: "7px 0 0", lineHeight: 1.7 }}>{structure.diagram}</p>
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
