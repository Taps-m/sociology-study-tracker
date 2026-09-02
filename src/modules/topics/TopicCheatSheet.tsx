import { useState } from "react";
import {
  cachedCheatSheet,
  cheatSheet,
  forgetCheatSheet,
  type CheatSheet as Card,
} from "../../lib/ai";
import { TOPICS, type Topic } from "../../data/syllabus";
import { standardReadingsFor, stdLine } from "../../data/standardBooks";
import { Diagram } from "../answers/ModelAnswerView";
import { C } from "../../lib/theme";

/**
 * The topic on one screen, for the evening when the chapter is not happening.
 *
 * Sixty-seven pages of Social Thinkers is the right thing to read and the wrong
 * thing to face at eleven at night. For someone who already knows the basics it
 * is the wrong surface at any hour: what is wanted is the answer kit, not the
 * exposition. So this is the terms that cannot be skipped, the thinkers doing
 * real work and what each is for, the hard specifics worth writing in, the
 * diagram, and the one line about where people lose marks.
 *
 * Not a summary. A summary is a shorter chapter, and a shorter chapter is still
 * reading.
 *
 * One per topic rather than one per question, so eighty-five of these exist in
 * the world. Written once, kept, then free.
 */
export function TopicCheatSheet({ topic }: { topic: Topic }) {
  const [card, setCard] = useState<Card | null>(() => cachedCheatSheet(topic.id));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paperTopics = TOPICS.filter((t) => t.paper === topic.paper);

  async function build(fresh = false) {
    if (fresh) {
      forgetCheatSheet(topic.id);
      setCard(null);
    } else if (card) {
      setOpen((v) => !v);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await cheatSheet(
      topic.id,
      {
        topic: topic.name,
        unit: topic.unit,
        paper: topic.paper === 1 ? "I" : "II",
        books: standardReadingsFor(topic.id).map(stdLine),
        syllabusTopics: paperTopics.map((t) => ({ id: t.id, unit: t.unit, name: t.name })),
      },
      paperTopics.map((t) => t.id),
    );
    setBusy(false);
    if (res.result) {
      setCard(res.result);
      setOpen(true);
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
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => void build()}
          title="The whole topic on one screen: the terms you cannot skip, the thinkers worth naming, the specifics, and where people lose marks. For an evening with no chapter in you."
        disabled={busy}
        style={{
          minHeight: 34,
          padding: "0 13px",
          borderRadius: 8,
          border: "none",
          background: open ? C.accentSoft : "transparent",
          boxShadow: `inset 0 0 0 1px ${open ? C.accent : C.line}`,
          color: open ? C.accent : C.text,
          font: "inherit",
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy
          ? "Writing the card…"
          : card
            ? open
              ? "Hide the card"
              : "One-glance card"
            : "Make a one-glance card"}
      </button>
      {error && <p style={{ fontSize: 12.5, color: C.warn, margin: "8px 0 0" }}>{error}</p>}

      {open && card && (
        <div
          style={{
            marginTop: 10,
            padding: "14px 16px",
            borderRadius: 11,
            background: C.raised,
            border: `1px solid ${C.line}`,
          }}
        >
          <div style={label}>Cannot skip</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {card.must.map((m) => (
              <div
                key={m.term}
                style={{ display: "flex", gap: 9, alignItems: "baseline", flexWrap: "wrap" }}
              >
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    padding: "2px 9px",
                    borderRadius: 6,
                    background: C.accent,
                    color: C.accentInk,
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.term}
                </span>
                <span style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1, minWidth: 150 }}>
                  {m.line}
                </span>
              </div>
            ))}
          </div>

          {card.thinkers.length > 0 && (
            <>
              <div style={{ ...label, marginTop: 17 }}>Thinkers, and what each is for</div>
              <ul
                style={{ margin: "7px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 5 }}
              >
                {card.thinkers.map((t) => (
                  <li key={t.name} style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                    <strong>{t.name}</strong>
                    <span style={{ color: C.muted }}> — {t.for}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {card.specifics.length > 0 && (
            <>
              <div style={{ ...label, marginTop: 17 }}>Write one of these in</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                {card.specifics.map((sp) => (
                  <span
                    key={sp}
                    style={{
                      fontSize: 12.5,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: C.warnSoft,
                      border: `1px solid ${C.warn}`,
                    }}
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </>
          )}

          {card.diagram?.label && <Diagram diagram={card.diagram} />}

          {card.trap && (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                margin: "17px 0 0",
                padding: "11px 13px",
                borderRadius: 9,
                background: C.warnSoft,
                borderLeft: `3px solid ${C.warn}`,
              }}
            >
              <strong>Where people lose it.</strong> {card.trap}
            </p>
          )}

          {card.askedAs.length > 0 && (
            <>
              <div style={{ ...label, marginTop: 17 }}>Usually asked as</div>
              <ul
                style={{
                  margin: "6px 0 0",
                  paddingLeft: 18,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: C.muted,
                }}
              >
                {card.askedAs.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}

          <button
            onClick={() => void build(true)}
            title="Throw this card away and write a new one, using the current method rules."
            style={{
              display: "block",
              margin: "14px auto 0",
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
            Write a different card
          </button>

          {card.offSyllabus && card.offSyllabus.length > 0 && (
            <p style={{ fontSize: 12.5, color: C.warn, margin: "13px 0 0", lineHeight: 1.55 }}>
              This card named {card.offSyllabus.length} topic
              {card.offSyllabus.length === 1 ? "" : "s"} outside your syllabus (
              {card.offSyllabus.join(", ")}). Treat those parts with suspicion.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
