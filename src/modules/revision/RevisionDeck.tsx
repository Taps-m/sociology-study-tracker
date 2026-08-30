import { useState } from "react";
import { TOPICS } from "../../data/syllabus";
import type { Topic } from "../../data/syllabus";
import { briefFor } from "../../data/briefs";
import type { Derived } from "../../lib/events";
import { intervalFor, isChecked, revisionQueue, revisionState } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

interface DeckItem {
  topic: Topic;
  why: string;
}

/**
 * What to revise, in the order it decays.
 *
 * Overdue first, since those are losing ground. Then anything already read but
 * never revised, because a topic that has never been recalled has never really
 * been learned — that is what starts the cycle.
 */
function buildDeck(d: Derived): DeckItem[] {
  const deck: DeckItem[] = [];
  const seen = new Set<string>();

  for (const r of revisionQueue(d)) {
    deck.push({ topic: r.topic, why: `${r.overdueDays} days overdue` });
    seen.add(r.topic.id);
  }

  for (const t of TOPICS) {
    if (seen.has(t.id)) continue;
    const state = revisionState(d, t.id);
    if (state.inCycle) continue;
    if (isChecked(d, t.id, "read")) {
      deck.push({ topic: t, why: "read, never revised" });
    }
  }

  return deck;
}

export function RevisionDeck({
  d,
  onRevise,
}: {
  d: Derived;
  onRevise: (topicId: string) => void;
}) {
  const deck = buildDeck(d);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (deck.length === 0) {
    return (
      <Card title="Quick revision">
        <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.75 }}>
          Nothing to revise yet. A topic joins the deck once you have read it, and
          comes back round on its own after seven days, then twenty-one, then
          forty-five, then ninety.
        </p>
      </Card>
    );
  }

  const item = deck[Math.min(index, deck.length - 1)]!;
  const { topic } = item;
  const brief = briefFor(topic.paper, topic.unit);
  const state = revisionState(d, topic.id);
  // Your own words beat a generic takeaway at revision time, so they go on the
  // back of the card, where the checking happens.
  const note = d.notes[topic.id];

  const advance = () => {
    setFlipped(false);
    setIndex((i) => (i + 1 >= deck.length ? 0 : i + 1));
  };

  return (
    <div className="grid" style={{ gap: 13, maxWidth: 620 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 14,
          color: C.muted,
        }}
      >
        <span>
          Card <span className="num">{index + 1}</span> of{" "}
          <span className="num">{deck.length}</span>
        </span>
        <span style={{ color: item.why.includes("overdue") ? C.warn : C.muted }}>{item.why}</span>
      </div>

      <div className={`flip${flipped ? " is-back" : ""}`}>
        <div className="flip-inner">
          <div className="flip-face flip-front">
            <span
              style={{
                fontFamily: C.mono,
                fontSize: 11.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              Paper {topic.paper === 1 ? "I" : "II"} · {topic.unit}
            </span>

            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "14px 0 0", lineHeight: 1.35 }}>
              {topic.name}
            </h2>

            <p style={{ fontSize: 14.5, color: C.muted, margin: "auto 0 0", lineHeight: 1.7 }}>
              Say it out loud before you turn the card: what is this topic about,
              who are its thinkers, and what would you put in a 40-mark answer?
            </p>
          </div>

          <div className="flip-face flip-back">
            <span
              style={{
                fontFamily: C.mono,
                fontSize: 11.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              Check yourself
            </span>

            {brief ? (
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 14.5, lineHeight: 1.75 }}>
                {brief.takeaways.map((x) => (
                  <li key={x} style={{ marginBottom: 6 }}>
                    {x}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 14.5, margin: "12px 0 0", lineHeight: 1.75, color: C.muted }}>
                No written notes for this unit yet, so there is nothing to check
                against here. Judge yourself honestly: could you have filled
                thirty-five minutes on it?
              </p>
            )}

            {note && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderLeft: `2px solid ${C.accent}`,
                  background: C.panel,
                  borderRadius: "0 6px 6px 0",
                }}
              >
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: 5,
                  }}
                >
                  Your note
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {note.text}
                </div>
              </div>
            )}

            <p style={{ fontSize: 13.5, color: C.muted, margin: "auto 0 0", lineHeight: 1.7 }}>
              Asked <span className="num">{topic.pyq}</span>× in WBCS Main since 2018
              {state.count > 0 && (
                <>
                  {" "}
                  · revised <span className="num">{state.count}</span>× · next in{" "}
                  <span className="num">{intervalFor(state.count + 1)}</span> days
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <button
          onClick={() => setFlipped(!flipped)}
          style={{
            flex: "1 1 160px",
            minHeight: 46,
            borderRadius: 9,
            border: `1px solid ${C.accent}`,
            background: "transparent",
            color: C.accent,
            font: "inherit",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {flipped ? "Back to the question" : "Turn the card"}
        </button>

        <button
          onClick={() => {
            onRevise(topic.id);
            advance();
          }}
          style={{
            flex: "1 1 160px",
            minHeight: 46,
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
          I knew it
        </button>

        <button
          onClick={advance}
          style={{
            flex: "0 0 auto",
            minHeight: 46,
            padding: "0 18px",
            borderRadius: 9,
            border: `1px solid ${C.line}`,
            background: "transparent",
            color: C.muted,
            font: "inherit",
            fontSize: 14.5,
            cursor: "pointer",
          }}
        >
          Not yet
        </button>
      </div>

      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.65 }}>
        "I knew it" records the revision and pushes the topic further down the
        cycle. "Not yet" leaves it where it is, so it comes back tomorrow.
      </p>
    </div>
  );
}
