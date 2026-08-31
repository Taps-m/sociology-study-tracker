import { useState } from "react";
import { answerStructure, cachedStructure, type AnswerStructure } from "../../lib/ai";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

/**
 * What the answer needed, when the score says it did not have it.
 *
 * A mark on its own teaches nothing. "Two out of forty" tells a candidate they
 * failed and leaves them to guess at which of five things went wrong, which is
 * the point at which people stop writing answers altogether — and writing
 * answers is the single most useful thing this app asks anyone to do.
 *
 * So the low score comes with the skeleton of the answer it should have been.
 * Not a model answer to copy: a structure to write from, in the shape a
 * candidate who scored 176 in Paper I described using — demand first, a
 * What/Why/How arc, examples spread across four domains, thinkers subordinate.
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
  /** Opens itself when the last answer was poor, rather than waiting to be found. */
  weak: boolean;
}) {
  const cached = cachedStructure(question);
  const [structure, setStructure] = useState<AnswerStructure | null>(cached);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
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
    if (res.result) setStructure(res.result);
    else setError(res.error);
    setBusy(false);
  }

  if (!structure) {
    return (
      <Card title="What this answer needed">
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 12px", lineHeight: 1.7 }}>
          {weak
            ? "A mark on its own does not teach anything. Build the skeleton this question was asking for — the demand broken into parts, the argument arc, and where the examples go."
            : "See the skeleton this question was asking for, and compare it against what you wrote."}
        </p>
        <button
          onClick={() => void build()}
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
          {busy ? "Building…" : "Show me the structure"}
        </button>
        {error && (
          <p style={{ fontSize: 13.5, color: C.warn, margin: "10px 0 0" }}>{error}</p>
        )}
      </Card>
    );
  }

  const label = {
    fontFamily: C.mono,
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: C.muted,
  };

  return (
    <Card title="What this answer needed">
      <section>
        <div style={label}>The demand</div>
        <p style={{ fontSize: 14, margin: "6px 0 0", lineHeight: 1.7 }}>
          {structure.demand.commandWords.length > 0 && (
            <>
              Command:{" "}
              <strong style={{ color: C.accent }}>
                {structure.demand.commandWords.join(", ")}
              </strong>
              .{" "}
            </>
          )}
          Most marks are lost here, before a word of sociology is written.
        </p>
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

      <section style={{ marginTop: 20 }}>
        <div style={label}>The arc — what, why, how</div>
        <div style={{ display: "grid", gap: 9, marginTop: 8 }}>
          {structure.arc.map((a) => (
            <div
              key={a.stage}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: C.panel,
                border: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.accent }}>{a.stage}</div>
              <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.65 }}>{a.move}</div>
              {a.contextualStatement && (
                <div
                  style={{
                    fontSize: 13.5,
                    marginTop: 6,
                    fontStyle: "italic",
                    color: C.muted,
                    lineHeight: 1.6,
                  }}
                >
                  “{a.contextualStatement}”
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
          The lines in quotes are the joins. They are what stops an answer reading as a list of
          remembered points.
        </p>
      </section>

      <section style={{ marginTop: 20 }}>
        <div style={label}>Examples — one from each, explained</div>
        <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
          {(
            [
              ["Economic", structure.examples.economic],
              ["Social", structure.examples.social],
              ["Political", structure.examples.political],
              ["Technological", structure.examples.technological],
            ] as const
          ).map(([k, v]) => (
            <li key={k} style={{ fontSize: 14, lineHeight: 1.65 }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>{k}. </span>
              {v}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
          An example named and not explained earns nothing. Spreading them across the four keeps
          the answer from reading monotonous.
        </p>
      </section>

      {structure.counter.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>The other side, argued</div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.75 }}>
            {structure.counter.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
            From what has changed in society, not from a list of critics.
          </p>
        </section>
      )}

      {structure.thinkers.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>Thinkers, in their place</div>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
            {structure.thinkers.map((t) => (
              <li key={t.name} style={{ fontSize: 14, lineHeight: 1.6 }}>
                <strong>{t.name}</strong> — {t.use}{" "}
                <span style={{ color: C.muted }}>({t.where})</span>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
            More thinkers is not a better answer. Chasing them is how candidates stop answering
            the question.
          </p>
        </section>
      )}

      {structure.budget.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <div style={label}>Thirty-five minutes, spent</div>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {structure.budget.map((b) => (
              <li
                key={b.section}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 14,
                }}
              >
                <span>{b.section}</span>
                <span className="num" style={{ color: C.muted }}>
                  {b.minutes} min
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ fontSize: 12.5, color: C.muted, margin: "18px 0 0", lineHeight: 1.65 }}>
        A skeleton to write from, not an answer to copy. The method — demand first, what/why/how,
        examples across four domains, thinkers subordinate — is how a candidate who scored 176 in
        Paper I described writing his.
      </p>
    </Card>
  );
}
