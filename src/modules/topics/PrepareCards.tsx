import { useRef, useState } from "react";
import { cheatSheet, cheatSheetIds } from "../../lib/ai";
import { TOPICS, type Topic } from "../../data/syllabus";
import { standardReadingsFor, stdLine } from "../../data/standardBooks";
import { unitShare } from "../../data/weightage";
import { C } from "../../lib/theme";

/**
 * Write the cards ahead of time, heaviest units first.
 *
 * A card generated the moment it is wanted is a card that is not there on the
 * evening it was built for — you press the button, wait half a minute with
 * nothing to read, and the point of a one-glance card was that there is no
 * waiting. So they can be written in advance.
 *
 * In the browser rather than on a schedule, because that is where they live: a
 * card is kept in this device's storage, and no server-side job can put one
 * there. Which means this runs while the tab is open, one at a time, and can be
 * stopped at any point without losing what it has already written.
 *
 * Heaviest units first — Pathfinders before Politics and Society — because the
 * run may well be stopped halfway, and where it stops should be the least
 * costly place to stop. Twenty cards in weight order cover most of what the
 * exam actually asks.
 */
export function PrepareCards() {
  const [made, setMade] = useState(() => cheatSheetIds().length);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState<string | null>(null);
  const [failed, setFailed] = useState(0);
  const stop = useRef(false);

  const order: Topic[] = [...TOPICS].sort(
    (a, b) =>
      unitShare(b.paper, b.unit) - unitShare(a.paper, a.unit) ||
      b.pyq - a.pyq ||
      a.id.localeCompare(b.id),
  );

  async function run() {
    setRunning(true);
    setFailed(0);
    stop.current = false;
    const have = new Set(cheatSheetIds());

    for (const topic of order) {
      if (stop.current) break;
      if (have.has(topic.id)) continue;
      setNow(topic.name);
      const paperTopics = TOPICS.filter((t) => t.paper === topic.paper);
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
      if (res.result) setMade(cheatSheetIds().length);
      else setFailed((n) => n + 1);
    }

    setNow(null);
    setRunning(false);
  }

  const left = TOPICS.length - made;

  return (
    <div
      style={{
        marginTop: 12,
        padding: "13px 15px",
        borderRadius: 11,
        background: C.panel,
        border: `1px solid ${C.line}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 14.5 }}>One-glance cards</strong>
        <span className="num" style={{ fontSize: 13, color: C.muted }}>
          {made} of {TOPICS.length} written
        </span>
      </div>

      <div style={{ marginTop: 8, height: 4, background: C.hair, borderRadius: 2 }}>
        <div
          style={{
            width: `${(made / TOPICS.length) * 100}%`,
            height: "100%",
            background: C.accent,
            borderRadius: 2,
          }}
        />
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, margin: "9px 0 0", lineHeight: 1.6 }}>
        {running
          ? `Writing ${now ?? "…"} — leave this tab open. Stopping keeps everything written so far.`
          : left === 0
            ? "Every topic has one. They are kept on this device."
            : `${left} still to write, heaviest units first, about half a minute each. It costs one AI call per card and they are yours for good.`}
      </p>

      <button
        onClick={() => (running ? (stop.current = true) : void run())}
        title={
          running
            ? "Stop after the card being written now. Nothing already written is lost."
            : "Write the missing cards one at a time, starting with the units the exam asks about most."
        }
        style={{
          marginTop: 11,
          minHeight: 38,
          padding: "0 15px",
          borderRadius: 9,
          border: "none",
          background: running ? C.warnSoft : left === 0 ? C.raised : C.accent,
          color: running ? C.warn : left === 0 ? C.muted : C.accentInk,
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          cursor: left === 0 && !running ? "default" : "pointer",
        }}
        disabled={left === 0 && !running}
      >
        {running ? "Stop after this one" : left === 0 ? "All written" : `Write the missing ${left}`}
      </button>

      {failed > 0 && (
        <p style={{ fontSize: 12.5, color: C.warn, margin: "9px 0 0" }}>
          {failed} did not come back. Press again — the ones already written are skipped.
        </p>
      )}
    </div>
  );
}
