import { TOPICS } from "../../data/syllabus";
import { CHECKS, type Settings } from "../../lib/planner";
import { on, type StudyEvent } from "../../lib/events";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

const NAMES = new Map(TOPICS.map((t) => [t.id, t.name]));
const LABELS = new Map(CHECKS.map((c) => [c.id, c.label]));

function when(at: string): string {
  const d = new Date(at);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return sameDay
    ? `Today, ${time}`
    : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
}

function describe(e: StudyEvent): string | null {
  const name = "topicId" in e ? (NAMES.get(e.topicId) ?? e.topicId) : "";
  switch (e.type) {
    case "check":
      return `${LABELS.get(e.check) ?? e.check}${e.prior ? " (already knew)" : ""} — ${name}`;
    case "uncheck":
      return `Undone: ${LABELS.get(e.check) ?? e.check} — ${name}`;
    case "attempt":
      return `Answer written — ${name}, ${e.marks}/${e.outOf} in ${e.minutes} min`;
    case "settings":
      return `Settings changed${
        (e.patch as Partial<Settings>).weeklyHours
          ? ` — ${(e.patch as Partial<Settings>).weeklyHours} h a week`
          : ""
      }`;
    default:
      return null;
  }
}

/**
 * What you have recorded, most recent first, with an undo.
 *
 * A mistaken tick is otherwise invisible: the checkbox resets and the only sign
 * is a percentage that moved. Undo appends the opposite event rather than
 * deleting anything, so the log stays append-only and the history of the
 * correction survives — which is what makes the numbers auditable.
 */
export function RecentActivity({
  events,
  add,
}: {
  events: StudyEvent[];
  add: (e: StudyEvent) => void;
}) {
  const recent = [...events].reverse().slice(0, 25);

  if (recent.length === 0) {
    return (
      <Card title="Recent activity">
        <p style={{ fontSize: 14.5, color: C.muted, margin: 0 }}>
          Nothing recorded yet.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Recent activity">
      <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.65 }}>
        The last {recent.length} things you recorded. If something was ticked by
        mistake, undo it here — the figures move back with it.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {recent.map((e, i) => {
          const text = describe(e);
          if (!text) return null;
          const undoable = e.type === "check";

          return (
            <li
              key={`${e.at}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: `1px solid ${C.hair}`,
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>{text}</span>
                <span
                  className="num"
                  style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 2 }}
                >
                  {when(e.at)}
                </span>
              </span>

              {undoable && (
                <button
                  onClick={() => add(on.uncheck(e.topicId, e.check))}
                  style={{
                    flex: "0 0 auto",
                    minHeight: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: `1px solid ${C.line}`,
                    background: "transparent",
                    color: C.accent,
                    font: "inherit",
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Undo
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
