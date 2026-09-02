import { useState } from "react";
import { markDrill, type DrillMark } from "../../lib/ai";
import { DRILL, drillDoneToday, markDrillDone, tonightsDrill } from "../../lib/drill";
import type { Derived } from "../../lib/events";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

/**
 * Tonight, in fifteen minutes.
 *
 * Everything else here is an hour's work or more, so on a short evening there
 * is nothing that can be started and the app gets closed. This is one block,
 * typed, marked on one thing, done.
 *
 * Typed rather than photographed, and only here. A full answer stays on paper
 * because paper does not let you paste — but three lines of your own reasoning
 * is not something anyone copies from anywhere, and wrapping a five-minute task
 * in ten minutes of photographing defeats the entire point.
 */
export function TonightsDrill({ d }: { d: Derived }) {
  const drill = tonightsDrill(d);
  const [text, setText] = useState("");
  const [mark, setMark] = useState<DrillMark | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(drillDoneToday);

  if (!drill) return null;
  const spec = DRILL[drill.dimension];

  async function send() {
    if (!drill || text.trim().length < 20) return;
    setBusy(true);
    setError(null);
    const res = await markDrill({
      question: drill.question.text,
      topic: drill.topic.name,
      unit: drill.topic.unit,
      drilling: spec.name,
      exercise: spec.ask,
      written: text.trim(),
    });
    setBusy(false);
    if (res.result) {
      setMark(res.result);
      markDrillDone();
      setDone(true);
    } else {
      setError(res.error);
    }
  }

  const label = {
    fontFamily: C.mono,
    fontSize: 10.5,
    letterSpacing: "0.11em",
    textTransform: "uppercase" as const,
    color: C.muted,
  };

  return (
    <Card title={done && !mark ? "Tonight's fifteen minutes · done" : "Tonight's fifteen minutes"}>
      {/*
        Why this exercise and not another. A drill that cannot say why it was
        chosen is a random exercise, and a random exercise is homework.
      */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 999,
            background: C.accent,
            color: C.accentInk,
          }}
        >
          {spec.name}
        </span>
        <span style={{ fontSize: 13, color: C.muted }}>
          {drill.weakness
            ? `your weakest on ${drill.weakness.times} of the last ${drill.weakness.of} answers`
            : "start here — there are no marked answers yet to aim this at"}
        </span>
      </div>

      <div style={{ ...label, marginTop: 16 }}>
        {drill.question.year} · Paper {drill.question.paper} · {drill.topic.unit}
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: "6px 0 0" }}>{drill.question.text}</p>

      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.7,
          margin: "14px 0 0",
          padding: "11px 13px",
          borderRadius: 9,
          background: C.accentSoft,
          borderLeft: `3px solid ${C.accent}`,
        }}
      >
        <strong>{spec.ask}</strong>
        <br />
        <span style={{ color: C.muted, fontSize: 13.5 }}>{spec.hint}</span>
      </p>

      {!mark && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Type it here. Three or four lines is the whole job."
            style={{
              width: "100%",
              marginTop: 12,
              padding: "11px 13px",
              borderRadius: 9,
              border: `1px solid ${C.line}`,
              background: C.panel,
              color: C.text,
              font: "inherit",
              fontSize: 14.5,
              lineHeight: 1.65,
              resize: "vertical",
            }}
          />
          <button
            onClick={() => void send()}
          title="Marked on one thing only — whatever your last few answers kept dropping. Five minutes, then you are done for the day."
            disabled={busy || text.trim().length < 20}
            style={{
              marginTop: 10,
              minHeight: 42,
              padding: "0 18px",
              borderRadius: 9,
              border: "none",
              background: text.trim().length < 20 ? C.raised : C.accent,
              color: text.trim().length < 20 ? C.muted : C.accentInk,
              font: "inherit",
              fontSize: 14.5,
              fontWeight: 700,
              cursor: busy || text.trim().length < 20 ? "default" : "pointer",
            }}
          >
            {busy ? "Marking…" : "Mark this"}
          </button>
          {error && <p style={{ fontSize: 13, color: C.warn, margin: "9px 0 0" }}>{error}</p>}
        </>
      )}

      {mark && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="num"
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: mark.pass ? C.good : C.warn,
              }}
            >
              {mark.score}
              <span style={{ fontSize: 15, color: C.muted }}>/5</span>
            </span>
            <span style={{ fontSize: 14.5, lineHeight: 1.6, flex: 1 }}>{mark.verdict}</span>
          </div>

          {mark.better && (
            <>
              <div style={{ ...label, marginTop: 16 }}>The same idea, done</div>
              <p
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.75,
                  margin: "7px 0 0",
                  padding: "12px 14px",
                  borderRadius: 9,
                  background: C.goodSoft,
                  borderLeft: `3px solid ${C.good}`,
                }}
              >
                {mark.better}
              </p>
            </>
          )}

          <p style={{ fontSize: 12.5, color: C.muted, margin: "14px 0 0", lineHeight: 1.6 }}>
            That is tonight done. Nothing else is expected of you today, and nothing is lost if
            tomorrow is busy — this comes back with a different question, not a broken streak.
          </p>
        </div>
      )}
    </Card>
  );
}
